import Joi from 'joi';
import mongoose from 'mongoose';
import Report, { REPORT_REASONS } from '../models/Report.js';
import Post from '../models/Post.js';
import { serializePost } from '../utils/serializers.js';
import { postAccessError, isModerator } from '../utils/postAccess.js';

/**
 * Số người báo cáo khác nhau đủ để bài tự ẩn khỏi bảng tin.
 *
 * Đặt ở 5 vì với quy mô một trường, 5 người không quen nhau cùng bấm là tín hiệu
 * thật; 2–3 người thì một nhóm bạn rủ nhau là đủ hạ bất kỳ bài nào. Con số này
 * nên chỉnh lại khi cộng đồng đông lên — ngưỡng cố định sẽ quá dễ đạt ở bảng tin
 * toàn quốc và quá khó đạt ở một trường nhỏ.
 */
const AUTO_HIDE_THRESHOLD = 5;

const createSchema = Joi.object({
  reason: Joi.string()
    .valid(...Object.keys(REPORT_REASONS))
    .required()
    .messages({ 'any.required': 'Chọn lý do báo cáo' }),
  detail: Joi.string().trim().max(500).allow('').default(''),
});

const badId = (res) =>
  res.status(400).json({ status: 'error', code: 'INVALID_ID', message: 'ID không hợp lệ' });

const forbidden = (res) =>
  res.status(403).json({
    status: 'error',
    code: 'FORBIDDEN',
    message: 'Bạn không có quyền thực hiện việc này',
  });

/**
 * Cập nhật lại các con số kiểm duyệt trên bài, và tự ẩn nếu quá ngưỡng.
 *
 * Đếm lại từ đầu bằng countDocuments thay vì $inc: đếm lại luôn ra đúng con số
 * thật kể cả khi một báo cáo bị xoá hoặc script chạy lại, còn $inc thì sai một
 * lần là lệch vĩnh viễn và không có cách nào biết.
 */
const refreshPostFlags = async (postId) => {
  const post = await Post.findById(postId);
  if (!post) return null;

  const count = await Report.countDocuments({ post: postId });

  const byReason = await Report.aggregate([
    { $match: { post: new mongoose.Types.ObjectId(String(postId)) } },
    { $group: { _id: '$reason', n: { $sum: 1 } } },
    { $sort: { n: -1 } },
  ]);
  const topReason = byReason.length ? byReason[0]._id : null;

  post.flagCount = count;
  post.isFlagged = count > 0;
  post.flagReason = topReason;

  /**
   * Ẩn, không xoá. Xoá tự động là không lùi được, mà ngưỡng tự động thì luôn có
   * thể bị lạm dụng — người kiểm duyệt sẽ quyết định số phận bài, máy chỉ đưa nó
   * ra khỏi tầm mắt trong lúc chờ.
   *
   * Bài chính thức của Cantea không bao giờ tự ẩn: nếu không, một nhóm phối hợp
   * là đủ gỡ thông báo của ban quản trị đúng lúc cần nó nhất.
   */
  if (count >= AUTO_HIDE_THRESHOLD && !post.isOfficial && post.isApproved) {
    post.isApproved = false;
    post.excludedFromTrending = true;
  }

  await post.save();
  return post;
};

/**
 * GET /api/reports/reasons
 * Để mobile dựng danh sách lý do từ server, khỏi tự chép rồi lệch enum.
 */
export const getReasons = async (req, res) => {
  res.status(200).json({
    status: 'success',
    data: {
      reasons: Object.entries(REPORT_REASONS).map(([code, label]) => ({ code, label })),
    },
  });
};

/**
 * POST /api/reports/posts/:postId
 */
export const createReport = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.postId)) return badId(res);

  const { error, value } = createSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      status: 'error',
      code: 'VALIDATION_ERROR',
      message: error.details[0].message,
    });
  }

  const post = await Post.findOne({ _id: req.params.postId, isDeleted: false }).select('+author');
  if (!post) {
    return res.status(404).json({
      status: 'error',
      code: 'POST_NOT_FOUND',
      message: 'Bài viết không tồn tại',
    });
  }

  /**
   * Ai không được đọc bài thì cũng không được báo cáo. Bỏ qua bước này thì
   * endpoint báo cáo trở thành đường dò xem một mã bài có tồn tại hay không,
   * kể cả với bảng tin của trường khác.
   */
  const accessErr = postAccessError(post, req.user);
  if (accessErr) {
    const { status, ...body } = accessErr;
    return res.status(status).json({ status: 'error', ...body });
  }

  if (String(post.author) === String(req.user._id)) {
    return res.status(400).json({
      status: 'error',
      code: 'CANNOT_REPORT_OWN_POST',
      message: 'Bạn không thể báo cáo bài của chính mình',
    });
  }

  try {
    await Report.create({
      post: post._id,
      reporter: req.user._id,
      reason: value.reason,
      detail: value.detail,
    });
  } catch (e) {
    if (e.code === 11000) {
      /**
       * Đã báo cáo rồi thì coi như thành công, không báo lỗi.
       *
       * Báo "bạn đã báo cáo bài này" nghe thì hợp lý, nhưng nó xác nhận cho
       * người dùng biết trạng thái báo cáo của chính họ trên từng bài — và với
       * người bấm nhầm hai lần thì một thông báo lỗi đỏ là trải nghiệm tệ.
       */
      return res.status(200).json({
        status: 'success',
        message: 'Đã ghi nhận báo cáo của bạn',
        data: { reported: true },
      });
    }
    throw e;
  }

  await refreshPostFlags(post._id);

  /**
   * Phản hồi KHÔNG chứa flagCount hay trạng thái ẩn của bài.
   *
   * Nếu trả về, người báo cáo sẽ biết bài còn thiếu mấy lượt nữa là bị ẩn —
   * đúng thứ một nhóm phối hợp cần để canh cho đủ ngưỡng.
   */
  res.status(201).json({
    status: 'success',
    message: 'Đã ghi nhận báo cáo của bạn',
    data: { reported: true },
  });
};

/**
 * GET /api/reports?status=pending
 * Hàng chờ kiểm duyệt. Gom theo bài, vì người kiểm duyệt xử lý bài chứ không
 * xử lý từng lượt báo cáo rời rạc.
 */
export const listReports = async (req, res) => {
  if (!isModerator(req.user)) return forbidden(res);

  const status = ['pending', 'dismissed', 'actioned'].includes(req.query.status)
    ? req.query.status
    : 'pending';
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(30, parseInt(req.query.limit, 10) || 20);

  const grouped = await Report.aggregate([
    { $match: { status } },
    {
      $group: {
        _id: '$post',
        total: { $sum: 1 },
        reasons: { $push: '$reason' },
        firstAt: { $min: '$createdAt' },
        lastAt: { $max: '$createdAt' },
      },
    },
    { $sort: { total: -1, lastAt: -1 } },
    { $skip: (page - 1) * limit },
    { $limit: limit },
  ]);

  const posts = await Post.find({ _id: { $in: grouped.map((g) => g._id) } })
    .select('+author')
    .populate('university', 'shortName name')
    .populate('topic', 'title emoji color')
    .lean();
  const postById = new Map(posts.map((p) => [String(p._id), p]));

  const items = grouped
    .map((g) => {
      const post = postById.get(String(g._id));
      if (!post) return null;

      const tally = {};
      for (const r of g.reasons) tally[r] = (tally[r] || 0) + 1;

      return {
        postId: String(g._id),
        total: g.total,
        reasons: Object.entries(tally)
          .map(([code, n]) => ({ code, label: REPORT_REASONS[code], count: n }))
          .sort((a, b) => b.count - a.count),
        firstAt: g.firstAt,
        lastAt: g.lastAt,
        isHidden: !post.isApproved,
        isDeleted: Boolean(post.isDeleted),
        /**
         * Đi qua serializePost như mọi đầu ra khác. Người kiểm duyệt cần đọc nội
         * dung để quyết định, nhưng không vì thế mà được biết ai viết bài ẩn danh —
         * quyền kiểm duyệt không đi kèm quyền bóc danh tính.
         */
        post: serializePost(post, req.user._id, { isModerator: true }),
      };
    })
    .filter(Boolean);

  res.status(200).json({
    status: 'success',
    data: { items, pagination: { page, limit, hasMore: grouped.length === limit } },
  });
};

/**
 * PATCH /api/reports/posts/:postId
 * body: { action: 'dismiss' | 'hide' | 'delete' }
 */
export const resolveReports = async (req, res) => {
  if (!isModerator(req.user)) return forbidden(res);
  if (!mongoose.isValidObjectId(req.params.postId)) return badId(res);

  const action = req.body?.action;
  if (!['dismiss', 'hide', 'delete'].includes(action)) {
    return res.status(400).json({
      status: 'error',
      code: 'VALIDATION_ERROR',
      message: 'action phải là dismiss, hide hoặc delete',
    });
  }

  const post = await Post.findById(req.params.postId);
  if (!post) {
    return res.status(404).json({
      status: 'error',
      code: 'POST_NOT_FOUND',
      message: 'Bài viết không tồn tại',
    });
  }

  if (action === 'dismiss') {
    /**
     * Bỏ qua báo cáo thì đưa bài trở lại bảng tin, kể cả khi nó đã tự ẩn vì đủ
     * ngưỡng. Không xoá các báo cáo cũ — chúng là bằng chứng nếu cùng nhóm tài
     * khoản đó tiếp tục báo cáo sai, và đó chính là dấu vết của việc lạm dụng.
     */
    post.isApproved = true;
    post.isFlagged = false;
    post.excludedFromTrending = false;
  } else if (action === 'hide') {
    post.isApproved = false;
    post.excludedFromTrending = true;
  } else {
    post.isDeleted = true;
    post.deletedAt = new Date();
    post.deletedBy = req.user._id;
  }
  await post.save();

  const result = await Report.updateMany(
    { post: post._id, status: 'pending' },
    {
      $set: {
        status: action === 'dismiss' ? 'dismissed' : 'actioned',
        reviewedBy: req.user._id,
        reviewedAt: new Date(),
      },
    }
  );

  res.status(200).json({
    status: 'success',
    message:
      action === 'dismiss'
        ? 'Đã bỏ qua báo cáo, bài trở lại bảng tin'
        : action === 'hide'
          ? 'Đã ẩn bài khỏi bảng tin'
          : 'Đã xoá bài viết',
    data: { resolved: result.modifiedCount || 0 },
  });
};
