import Joi from 'joi';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { generateToken } from '../middleware/authMiddleware.js';
import { logger } from '../utils/logger.js';

/**
 * HỒ SƠ NGƯỜI DÙNG
 *
 * Trường (university) KHÔNG nằm trong danh sách sửa được. Nó chỉ đổi qua luồng
 * xác thực email trường; cho sửa tay ở đây là mở cửa sau cho ba tầng guest →
 * pending → verified, và bảng tin riêng của trường mất hết ý nghĩa.
 *
 * Email cũng vậy: nó là danh tính đăng nhập, đổi email phải đi qua một luồng
 * xác nhận riêng chứ không phải một ô nhập trong màn hồ sơ.
 */
const profileSchema = Joi.object({
  nickname: Joi.string().trim().min(1).max(30).messages({
    'string.empty': 'Biệt danh không được để trống',
    'string.max': 'Biệt danh tối đa 30 ký tự',
  }),
  major: Joi.string().trim().max(80).allow('').messages({
    'string.max': 'Tên ngành tối đa 80 ký tự',
  }),
  year: Joi.number().integer().min(1).max(6).allow(null).messages({
    'number.min': 'Năm học từ 1 đến 6',
    'number.max': 'Năm học từ 1 đến 6',
  }),
  isAlumni: Joi.boolean(),
  profilePhoto: Joi.string().trim().allow('', null),
})
  .min(1)
  .messages({ 'object.min': 'Không có gì để cập nhật' });

const passwordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    'any.required': 'Nhập mật khẩu hiện tại',
  }),
  newPassword: Joi.string().min(8).max(128).required().messages({
    'string.min': 'Mật khẩu mới phải có ít nhất 8 ký tự',
    'any.required': 'Nhập mật khẩu mới',
  }),
});

const notificationsSchema = Joi.object({
  email: Joi.boolean(),
  push: Joi.boolean(),
  classReminders: Joi.boolean(),
}).min(1);

const privacySchema = Joi.object({
  profileVisibility: Joi.string().valid('public', 'university-only', 'friends-only', 'private'),
  showGrades: Joi.boolean(),
  showSchedule: Joi.boolean(),
  allowMessages: Joi.boolean(),
}).min(1);

const invalid = (res, message) =>
  res.status(400).json({ status: 'error', code: 'VALIDATION_ERROR', message });

/**
 * PATCH /api/users/me
 *
 * Chỉ ghi đúng những khoá người dùng gửi lên. Gán cả object sẽ xoá mất trường
 * họ không đụng tới — màn hình chỉ sửa biệt danh mà lại làm trắng ngành học.
 */
export const updateProfile = async (req, res) => {
  const { error, value } = profileSchema.validate(req.body, { abortEarly: true });
  if (error) return invalid(res, error.details[0].message);

  const user = req.user;

  if (value.nickname !== undefined) user.nickname = value.nickname;
  if (value.major !== undefined) user.major = value.major;
  if (value.year !== undefined) user.year = value.year === null ? undefined : value.year;
  /**
   * Hai trường loại trừ nhau: đã tốt nghiệp thì không còn năm học, và chọn năm
   * học thì không còn là cựu sinh viên. Ép ở đây chứ không để màn hình tự lo —
   * màn hình thứ hai gọi API sau này sẽ không nhớ quy tắc đó.
   */
  if (value.isAlumni !== undefined) {
    user.isAlumni = value.isAlumni;
    if (value.isAlumni) user.year = undefined;
  }
  if (value.year !== undefined && value.year !== null) user.isAlumni = false;

  if (value.profilePhoto !== undefined) user.profilePhoto = value.profilePhoto || null;

  await user.save();

  res.status(200).json({
    status: 'success',
    message: 'Đã lưu hồ sơ',
    data: { user: user.getPublicProfile() },
  });
};

/**
 * PATCH /api/users/me/password
 *
 * Bắt nhập mật khẩu hiện tại chứ không chỉ dựa vào token đang đăng nhập: nếu
 * ai đó mượn được điện thoại đang mở app, chỉ riêng token không nên đủ để họ
 * chiếm luôn tài khoản.
 */
export const changePassword = async (req, res) => {
  const { error, value } = passwordSchema.validate(req.body);
  if (error) return invalid(res, error.details[0].message);

  const user = await User.findById(req.user._id).select('+password');
  if (!user) {
    return res.status(404).json({
      status: 'error',
      code: 'USER_NOT_FOUND',
      message: 'Tài khoản không tồn tại',
    });
  }

  if (user.authProvider === 'google' && !user.password) {
    return res.status(400).json({
      status: 'error',
      code: 'NO_LOCAL_PASSWORD',
      message: 'Tài khoản này đăng nhập bằng Google, không có mật khẩu để đổi',
    });
  }

  const match = await user.comparePassword(value.currentPassword);
  if (!match) {
    return res.status(401).json({
      status: 'error',
      code: 'WRONG_PASSWORD',
      message: 'Mật khẩu hiện tại không đúng',
    });
  }

  if (await bcrypt.compare(value.newPassword, user.password || '')) {
    return res.status(400).json({
      status: 'error',
      code: 'SAME_PASSWORD',
      message: 'Mật khẩu mới phải khác mật khẩu cũ',
    });
  }

  user.password = value.newPassword; // hook pre-save tự băm và ghi passwordChangedAt
  await user.save();

  logger.info(`Đổi mật khẩu khi đang đăng nhập: ${user._id}`);

  /**
   * Phải cấp token mới, nếu không người dùng bị đá ra ngay sau khi đổi.
   *
   * Middleware protect từ chối mọi token phát hành trước passwordChangedAt —
   * đó là điều đúng đắn, vì nó đuổi được kẻ đang chiếm tài khoản. Nhưng nó
   * cũng đuổi luôn chính người vừa bấm nút, nên phải trả họ một vé mới.
   * Các thiết bị khác vẫn bị đăng xuất, đúng như mong đợi.
   */
  res.status(200).json({
    status: 'success',
    message: 'Đã đổi mật khẩu. Các thiết bị khác đã bị đăng xuất.',
    data: { token: generateToken(user._id) },
  });
};

/**
 * PATCH /api/users/me/notifications
 */
export const updateNotifications = async (req, res) => {
  const { error, value } = notificationsSchema.validate(req.body);
  if (error) return invalid(res, error.details[0].message || 'Không có gì để cập nhật');

  const user = req.user;
  user.notifications = { ...(user.notifications?.toObject?.() || user.notifications), ...value };
  await user.save();

  res.status(200).json({
    status: 'success',
    message: 'Đã lưu cài đặt thông báo',
    data: { notifications: user.getPublicProfile().notifications },
  });
};

/**
 * PATCH /api/users/me/privacy
 */
export const updatePrivacy = async (req, res) => {
  const { error, value } = privacySchema.validate(req.body);
  if (error) return invalid(res, error.details[0].message || 'Không có gì để cập nhật');

  const user = req.user;
  user.privacy = { ...(user.privacy?.toObject?.() || user.privacy), ...value };
  await user.save();

  res.status(200).json({
    status: 'success',
    message: 'Đã lưu quyền riêng tư',
    data: { privacy: user.getPublicProfile().privacy },
  });
};
