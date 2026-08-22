import mongoose from 'mongoose';

const postSchema = new mongoose.Schema(
  {
    // ===== TÁC GIẢ =====
    // LƯU Ý: trường này KHÔNG BAO GIỜ được trả thẳng ra API.
    // Mọi phản hồi phải đi qua serializePost() trong utils/serializers.js
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      select: false, // lớp phòng thủ 1: không tự động nạp
    },
    isAnonymous: {
      type: Boolean,
      default: false,
    },

    /**
     * Bảng ánh xạ người dùng → số thứ tự ẩn danh trong bài này.
     * Giữ cho cùng một người luôn là "Ẩn danh 3" xuyên suốt bài,
     * giống cơ chế của Everytime.
     * select: false — đây là dữ liệu nhạy cảm nhất trong schema.
     */
    anonymousParticipants: {
      type: [
        {
          user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
          ordinal: Number,
          _id: false,
        },
      ],
      default: [],
      select: false,
    },

    // ===== NỘI DUNG =====
    title: { type: String, required: true, maxlength: 200, trim: true },
    content: { type: String, required: true, maxlength: 3000 },
    images: [{ type: String }],

    // ===== PHẠM VI =====
    communityType: {
      type: String,
      enum: ['global', 'university', 'faculty'],
      default: 'university',
    },
    // Chuyển từ String sang ObjectId để mở rộng ra Hà Nội / Đà Nẵng
    university: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'University',
      default: null,
    },
    faculty: { type: String, default: null },

    category: {
      type: String,
      enum: [
        'Academics',
        'Student Life',
        'Events',
        'Q&A',
        'General',
        'Book Exchange',
        'Study Group',
      ],
      default: 'General',
    },

    // ===== TƯƠNG TÁC =====
    // Mảng likes không bao giờ trả nguyên ra API — chỉ trả likeCount
    // và likedByMe, vì danh sách người thích có thể làm lộ tác giả ẩn danh.
    likes: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], select: false },
    likeCount: { type: Number, default: 0 },
    commentCount: { type: Number, default: 0 },
    views: { type: Number, default: 0 },

    // ===== KIỂM DUYỆT =====
    isApproved: { type: Boolean, default: true },
    isFlagged: { type: Boolean, default: false },
    flagCount: { type: Number, default: 0 },
    flagReason: { type: String, default: null },
    isDeleted: { type: Boolean, default: false },
    deletedAt: Date,
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', select: false },

    isPinned: { type: Boolean, default: false },
    lastActivityAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// ===== INDEXES =====
// Truy vấn chính: bảng tin của một trường, mới nhất trước
postSchema.index({ university: 1, isDeleted: 1, isPinned: -1, createdAt: -1 });
// Bảng tin toàn quốc cho người dùng chưa xác thực
postSchema.index({ communityType: 1, isDeleted: 1, createdAt: -1 });
// Lọc theo chuyên mục trong một trường
postSchema.index({ university: 1, category: 1, isDeleted: 1, createdAt: -1 });
// Bài của chính mình
postSchema.index({ author: 1, createdAt: -1 });
// Hàng đợi kiểm duyệt
postSchema.index({ isFlagged: 1, isDeleted: 1 });

/**
 * Cấp số thứ tự ẩn danh cho một người trong bài này.
 * Nếu người đó đã có số rồi thì trả lại số cũ.
 */
postSchema.statics.resolveAnonymousOrdinal = async function (postId, userId) {
  const post = await this.findById(postId).select('+anonymousParticipants');
  if (!post) return null;

  const existing = (post.anonymousParticipants || []).find(
    (p) => String(p.user) === String(userId)
  );
  if (existing) return existing.ordinal;

  const nextOrdinal = (post.anonymousParticipants || []).length + 1;

  // Điều kiện $ne đảm bảo không cấp trùng khi có hai request cùng lúc
  await this.updateOne(
    { _id: postId, 'anonymousParticipants.user': { $ne: userId } },
    { $push: { anonymousParticipants: { user: userId, ordinal: nextOrdinal } } }
  );

  const fresh = await this.findById(postId).select('+anonymousParticipants');
  const found = (fresh.anonymousParticipants || []).find(
    (p) => String(p.user) === String(userId)
  );
  return found ? found.ordinal : nextOrdinal;
};

const Post = mongoose.model('Post', postSchema);

export default Post;
