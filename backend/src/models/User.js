import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    // ===== DANH TÍNH (dùng để đăng nhập) =====
    // Đây là email cá nhân. KHÔNG phải email trường.
    email: {
      type: String,
      required: true,
      unique: true, // đã tự tạo index, không khai báo index() lần nữa
      lowercase: true,
      trim: true,
      match: [/.+@.+\..+/, 'Email không hợp lệ'],
    },
    password: {
      type: String,
      select: false, // luôn phải .select('+password') khi cần so sánh
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

    // ===== XÁC THỰC TRƯỜNG (tách riêng khỏi danh tính) =====
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
      // KHÔNG đặt default: null — xem ghi chú ở googleId
    },
    verificationStatus: {
      type: String,
      enum: ['guest', 'pending', 'verified'],
      default: 'guest',
    },
    verifiedAt: { type: Date, default: null },

    // Trạng thái mã xác thực đang chờ. select: false để không lộ ra API.
    verification: {
      codeHash: { type: String, select: false, default: null },
      pendingEmail: { type: String, default: null },
      expiresAt: { type: Date, default: null },
      attempts: { type: Number, default: 0 },
      lastSentAt: { type: Date, default: null },
      sendCount: { type: Number, default: 0 },
      windowStartedAt: { type: Date, default: null },
    },

    // ===== HỒ SƠ =====
    firstName: { type: String, required: true, trim: true, maxlength: 50 },
    lastName: { type: String, required: true, trim: true, maxlength: 50 },
    // Tên hiển thị trong cộng đồng. Mặc định lấy firstName.
    nickname: { type: String, trim: true, maxlength: 30 },
    profilePhoto: { type: String, default: null },
    bio: { type: String, maxlength: 500, default: '' },
    major: { type: String, default: '' },
    year: { type: Number, min: 1, max: 6 },
    studentId: { type: String, unique: true, sparse: true },

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

// ===== INDEXES =====
// email / universityEmail / googleId / studentId đã có index nhờ unique:true.
// Chỉ khai báo thêm những index chưa có, tránh cảnh báo "Duplicate schema index".
userSchema.index({ university: 1, verificationStatus: 1 });
userSchema.index({ createdAt: -1 });

// ===== HOOKS =====
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Nếu không nhập nickname, lấy firstName làm mặc định
userSchema.pre('save', function (next) {
  if (!this.nickname) this.nickname = this.firstName;
  next();
});

// ===== METHODS =====
userSchema.methods.comparePassword = async function (enteredPassword) {
  // this.password chỉ tồn tại khi query có .select('+password')
  if (!this.password) return false;
  return bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.isVerified = function () {
  return this.verificationStatus === 'verified';
};

/**
 * Dữ liệu an toàn để trả về client.
 * Loại bỏ mọi thứ nhạy cảm, kể cả email trường.
 */
userSchema.methods.getPublicProfile = function () {
  const p = this.toObject();
  delete p.password;
  delete p.googleId;
  delete p.universityEmail;
  delete p.verification;
  delete p.blockedUsers;
  delete p.__v;
  return p;
};

userSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

const User = mongoose.model('User', userSchema);

export default User;
