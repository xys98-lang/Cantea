import mongoose from 'mongoose';

/**
 * Chủ đề theo mùa.
 *
 * Khác với chuyên mục (category) vốn cố định quanh năm, chủ đề là thứ
 * chỉ đúng trong một khoảng thời gian: "Tân sinh viên 2026" nổi bật
 * tháng 8–10, "Mùa thi cuối kỳ" nổi bật tháng 12.
 *
 * Có startsAt/endsAt nên chủ đề tự ẩn khi hết mùa — không ai phải nhớ
 * vào tắt bằng tay, và bảng tin không bị chất đống chủ đề cũ.
 */
const topicSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    title: { type: String, required: true, trim: true, maxlength: 60 },
    subtitle: { type: String, trim: true, maxlength: 120, default: '' },

    // Biểu tượng và màu để chủ đề nổi lên khỏi bảng tin
    emoji: { type: String, default: '' },
    color: { type: String, default: '#6366F1' },

    scope: { type: String, enum: ['global', 'university'], default: 'global' },
    university: { type: mongoose.Schema.Types.ObjectId, ref: 'University', default: null },

    // Khoảng thời gian hiển thị. Bỏ trống = luôn hiện.
    startsAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },

    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    postCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

topicSchema.index({ scope: 1, isActive: 1, order: 1 });
topicSchema.index({ university: 1, isActive: 1 });

/** Chủ đề đang trong mùa: đang bật và nằm trong khoảng thời gian */
topicSchema.statics.findActive = function (scope, universityId = null) {
  const now = new Date();
  const filter = {
    isActive: true,
    scope,
    $and: [
      { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
      { $or: [{ endsAt: null }, { endsAt: { $gte: now } }] },
    ],
  };

  if (scope === 'university') filter.university = universityId;

  return this.find(filter).sort({ order: 1, createdAt: -1 });
};

const Topic = mongoose.model('Topic', topicSchema);

export default Topic;
