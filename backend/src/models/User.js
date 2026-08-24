import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

/** Khung tiết dùng chung cho User (cá nhân) và University (toàn trường) */
export const periodEntrySchema = new mongoose.Schema(
  {
    period: { type: Number, required: true, min: 1, max: 30 },
    start: { type: String, required: true },
    end: { type: String, required: true },
    session: {
      type: String,
      enum: ['morning', 'afternoon', 'evening'],
      default: 'morning',
    },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    // ===== DANH TÍNH (dùng để đăng nhập) =====
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/.+@.+\..+/, 'Email không hợp lệ'],
    },
    password: {
      type: String,
      select: false,
      minlength: 8,
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
      // KHÔNG đặt default: null — sparse index sẽ mất tác dụng
    },
    authProvider: {
      type: String,
      enum: ['local', 'google'],
      default: 'local',
    },

    // ===== XÁC THỰC TRƯỜNG =====
    university: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'University',
      default: null,
    },
    universityEmail: {
      type: String,
      lowercase: true,
      trim: true,
      unique: true,
      sparse: true,
    },
    verificationStatus: {
      type: String,
      enum: ['guest', 'pending', 'verified'],
      default: 'guest',
    },
    verifiedAt: { type: Date, default: null },

    verification: {
      codeHash: { type: String, select: false, default: null },
      pendingEmail: { type: String, default: null },
      expiresAt: { type: Date, default: null },
      attempts: { type: Number, default: 0 },
      lastSentAt: { type: Date, default: null },
      sendCount: { type: Number, default: 0 },
      windowStartedAt: { type: Date, default: null },
    },

    // ===== ĐẶT LẠI MẬT KHẨU =====
    /** Cùng cấu trúc với verification — dùng lại hạ tầng mã 6 số */
    passwordReset: {
      codeHash: { type: String, select: false, default: null },
      expiresAt: { type: Date, default: null },
      attempts: { type: Number, default: 0 },
      lastSentAt: { type: Date, default: null },
      sendCount: { type: Number, default: 0 },
      windowStartedAt: { type: Date, default: null },
    },

    /**
     * Mốc đổi mật khẩu gần nhất.
     *
     * JWT không thu hồi được ở server, nên nếu ai đó đã trộm mật khẩu và
     * đang đăng nhập, việc đổi mật khẩu sẽ không đuổi họ ra. Middleware
     * protect so ngày phát hành token với mốc này — token cũ hơn thì
     * bị từ chối. Đây chính là điều người dùng mong đợi khi họ đặt lại
     * mật khẩu vì nghi bị xâm nhập.
     */
    passwordChangedAt: { type: Date, default: null },

    // ===== HỒ SƠ =====
    firstName: { type: String, required: true, trim: true, maxlength: 50 },
    lastName: { type: String, required: true, trim: true, maxlength: 50 },
    nickname: { type: String, trim: true, maxlength: 30 },
    profilePhoto: { type: String, default: null },
    bio: { type: String, maxlength: 500, default: '' },
    major: { type: String, default: '' },
    year: { type: Number, min: 1, max: 6 },
    /**
     * Cựu sinh viên tự khai, không kiểm chứng.
     *
     * Tách khỏi `year` thay vì thêm một giá trị đặc biệt: year đang ràng buộc
     * 1–6 và đổi kiểu sẽ phải chuyển toàn bộ dữ liệu cũ. Hai trường loại trừ
     * nhau về nghĩa, controller lo việc đó.
     *
     * Không ảnh hưởng tới quyền: người đã tốt nghiệp vẫn đọc và đăng được
     * trong bảng tin trường. Đây là nhãn để người đọc biết ai đang trả lời,
     * không phải hàng rào.
     */
    isAlumni: { type: Boolean, default: false },
    studentId: { type: String, unique: true, sparse: true },

    // ===== THỜI KHOÁ BIỂU =====
    /**
     * Khung tiết riêng của người dùng. Trống thì dùng khung của trường,
     * trường cũng trống thì dùng khung mặc định trong utils/periods.js.
     * Đổi khung KHÔNG ảnh hưởng môn đã nhập, vì database lưu giờ chứ không lưu tiết.
     */
    periodSchedule: { type: [periodEntrySchema], default: [] },

    preferences: {
      // 'period' = hiện "Tiết 1–3", 'clock' = hiện "07:00–09:30"
      timeDisplay: { type: String, enum: ['period', 'clock'], default: 'period' },
    },

    // ===== QUYỀN RIÊNG TƯ =====
    privacy: {
      profileVisibility: {
        type: String,
        enum: ['public', 'university-only', 'friends-only', 'private'],
        default: 'university-only',
      },
      showGrades: { type: Boolean, default: false },
      showSchedule: { type: Boolean, default: false },
      allowMessages: { type: Boolean, default: true },
    },

    // ===== XÃ HỘI =====
    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    // ===== TRẠNG THÁI TÀI KHOẢN =====
    isActive: { type: Boolean, default: true },
    roles: {
      type: [String],
      enum: ['student', 'moderator', 'admin'],
      default: ['student'],
    },

    // ===== UY TÍN =====
    trustScore: { type: Number, default: 0, min: 0, max: 100 },
    exchangesCompleted: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0, min: 0, max: 5 },

    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      classReminders: { type: Boolean, default: true },
    },

    lastLogin: Date,
    lastActive: Date,
  },
  {
    timestamps: true,
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
  }
);

// email / universityEmail / googleId / studentId đã có index nhờ unique:true
userSchema.index({ university: 1, verificationStatus: 1 });
userSchema.index({ createdAt: -1 });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);

    // Trừ 1 giây: token phát hành ngay sau khi đổi có thể mang timestamp
    // sớm hơn mốc này vài mili giây, khiến người dùng bị đá ra ngay lập tức
    if (!this.isNew) this.passwordChangedAt = new Date(Date.now() - 1000);

    next();
  } catch (error) {
    next(error);
  }
});

userSchema.pre('save', function (next) {
  if (!this.nickname) this.nickname = this.firstName;
  next();
});

userSchema.methods.comparePassword = async function (enteredPassword) {
  if (!this.password) return false;
  return bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.isVerified = function () {
  return this.verificationStatus === 'verified';
};

userSchema.methods.getPublicProfile = function () {
  const p = this.toObject();
  delete p.password;
  delete p.googleId;
  delete p.universityEmail;
  delete p.verification;
  delete p.passwordReset;
  delete p.passwordChangedAt;
  delete p.blockedUsers;
  delete p.__v;
  return p;
};

userSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

const User = mongoose.model('User', userSchema);

export default User;
