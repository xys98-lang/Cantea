import mongoose from 'mongoose';

const postSchema = new mongoose.Schema(
  {
    // ===== TÁC GIẢ =====
    // KHÔNG BAO GIỜ trả thẳng ra API — mọi phản hồi đi qua serializePost()
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      select: false,
    },
    isAnonymous: { type: Boolean, default: false },

    /**
     * Bài từ tài khoản chính thức của Cantea.
     *
     * Dùng cho hướng dẫn, thông báo, nội dung khởi tạo khi cộng đồng
     * còn mới. Hiển thị kèm huy hiệu để người đọc biết ngay đây không
     * phải bài của sinh viên — thà bảng tin có ít bài thật còn hơn
     * nhiều bài giả làm sinh viên.
     */
    isOfficial: { type: Boolean, default: false },

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
    university: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'University',
      default: null,
    },
    faculty: { type: String, default: null },

    /**
     * CHUYÊN MỤC
     *
     * Rút từ 7 xuống 5 theo bản thiết kế v4.0. Hai mục được thêm vì sinh
     * viên bàn nhiều nhất: Ký túc xá và Việc làm. Bốn mục bị bỏ:
     *
     *   Hỏi đáp    — mọi bài đều là hỏi đáp, tách riêng không giúp lọc
     *   Sự kiện    — gộp vào Chuyện trường
     *   Sách vở    — Canlib đã lo mảng này
     *   Nhóm học   — gộp vào Học tập
     *
     * Ít mục thì người đăng đỡ phải cân nhắc, và mỗi mục đủ đông bài để
     * đáng mở ra xem. Bảy mục với vài chục bài thì mục nào cũng vắng.
     *
     * "Chính thức" KHÔNG nằm ở đây — nó là cờ isOfficial bên dưới, vì
     * một bài chính thức vẫn thuộc một chuyên mục nào đó.
     */
    category: {
      type: String,
      enum: ['General', 'Academics', 'Housing', 'CampusLife', 'Jobs'],
      default: 'General',
      index: true,
    },

    /** Chủ đề theo mùa, ví dụ "Tân sinh viên 2026". Không bắt buộc. */
    topic: { type: mongoose.Schema.Types.ObjectId, ref: 'Topic', default: null },

    // ===== TƯƠNG TÁC =====
    likes: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], select: false },
    likeCount: { type: Number, default: 0 },
    commentCount: { type: Number, default: 0 },
    views: { type: Number, default: 0 },

    // ===== KIỂM DUYỆT =====
    isApproved: { type: Boolean, default: true },
    isFlagged: { type: Boolean, default: false },
    flagCount: { type: Number, default: 0 },
    flagReason: { type: String, default: null },
    /**
     * Tác giả tự gỡ bài khỏi bảng Đang nổi.
     *
     * Bài VẪN nằm trong bảng tin và vẫn đọc được — chỉ không được đẩy
     * lên bảng xếp hạng nữa. Đây là van an toàn cho người đăng ẩn danh:
     * khi bài lan quá nhanh, chi tiết trong bài có thể đủ để người quen
     * nhận ra, và họ cần cách hãm lại mà không phải xoá bài.
     */
    excludedFromTrending: { type: Boolean, default: false },

    isDeleted: { type: Boolean, default: false },
    deletedAt: Date,
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', select: false },

    isPinned: { type: Boolean, default: false },
    lastActivityAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// ===== INDEXES =====
postSchema.index({ university: 1, isDeleted: 1, isPinned: -1, createdAt: -1 });
postSchema.index({ communityType: 1, isDeleted: 1, createdAt: -1 });
postSchema.index({ university: 1, category: 1, isDeleted: 1, createdAt: -1 });

/** Lọc bài ứng viên cho bảng Đang nổi */
postSchema.index({ communityType: 1, excludedFromTrending: 1, isDeleted: 1, createdAt: -1 });
postSchema.index({ topic: 1, isDeleted: 1, createdAt: -1 });
postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ isFlagged: 1, isDeleted: 1 });

/** Cấp số thứ tự ẩn danh ổn định cho một người trong phạm vi bài này */
postSchema.statics.resolveAnonymousOrdinal = async function (postId, userId) {
  const post = await this.findById(postId).select('+anonymousParticipants');
  if (!post) return null;

  const existing = (post.anonymousParticipants || []).find(
    (p) => String(p.user) === String(userId)
  );
  if (existing) return existing.ordinal;

  const nextOrdinal = (post.anonymousParticipants || []).length + 1;

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
