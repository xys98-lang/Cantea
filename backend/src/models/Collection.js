import mongoose from 'mongoose';

/**
 * Bộ sưu tập bài đã lưu.
 *
 * Hoàn toàn riêng tư: không ai thấy bạn lưu gì, không có số đếm công khai.
 * Đây là điểm khác biệt căn bản so với lượt thích — thích là tín hiệu gửi
 * cho người khác, lưu là công cụ cho chính mình.
 */
const collectionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 40 },
    emoji: { type: String, default: '' },

    /** Bộ mặc định, tạo tự động lần đầu người dùng lưu bài. Không xoá được. */
    isDefault: { type: Boolean, default: false },

    itemCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Mỗi người không được có hai bộ trùng tên
collectionSchema.index({ user: 1, name: 1 }, { unique: true });
collectionSchema.index({ user: 1, isDefault: -1, createdAt: 1 });

/** Lấy bộ mặc định, tạo mới nếu chưa có */
collectionSchema.statics.ensureDefault = async function (userId) {
  const existing = await this.findOne({ user: userId, isDefault: true });
  if (existing) return existing;

  try {
    return await this.create({
      user: userId,
      name: 'Đã lưu',
      emoji: '🔖',
      isDefault: true,
    });
  } catch (e) {
    // Hai request cùng lúc có thể cùng tạo — lấy lại cái đã tồn tại
    return this.findOne({ user: userId, isDefault: true });
  }
};

const Collection = mongoose.model('Collection', collectionSchema);

export default Collection;
