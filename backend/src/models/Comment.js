import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema(
  {
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
    },

    // Không bao giờ trả thẳng ra API — xem utils/serializers.js
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      select: false,
    },
    isAnonymous: { type: Boolean, default: true },

    /**
     * Số thứ tự ẩn danh trong bài, cấp bởi Post.resolveAnonymousOrdinal().
     * Lưu sẵn ở đây để lúc hiển thị không cần đọc bảng ánh xạ nhạy cảm.
     */
    anonymousOrdinal: { type: Number, default: null },

    /** Đánh dấu bình luận của chính chủ bài viết → hiện nhãn "Tác giả" */
    isPostAuthor: { type: Boolean, default: false },

    text: { type: String, required: true, maxlength: 1000, trim: true },

    // Trả lời một bình luận khác. null = bình luận gốc.
    parentComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment',
      default: null,
    },
    replyCount: { type: Number, default: 0 },

    likes: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], select: false },
    likeCount: { type: Number, default: 0 },

    isDeleted: { type: Boolean, default: false },
    deletedAt: Date,
    isFlagged: { type: Boolean, default: false },
    flagCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Truy vấn chính: bình luận gốc của một bài, cũ nhất trước (đúng mạch hội thoại)
commentSchema.index({ post: 1, parentComment: 1, createdAt: 1 });
// Trả lời của một bình luận
commentSchema.index({ parentComment: 1, createdAt: 1 });
// Bình luận của chính mình
commentSchema.index({ author: 1, createdAt: -1 });

const Comment = mongoose.model('Comment', commentSchema);

export default Comment;
