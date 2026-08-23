import mongoose from 'mongoose';

const bookmarkSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
    },
    collection: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Collection',
      required: true,
    },
    /** Ghi chú riêng, chỉ mình đọc được. Ví dụ "hỏi lại thầy về mục 3" */
    note: { type: String, trim: true, maxlength: 300, default: '' },
  },
  { timestamps: true }
);

/**
 * Một bài chỉ lưu được một lần cho mỗi người.
 * Muốn đổi bộ sưu tập thì cập nhật bản ghi, không tạo bản mới —
 * nếu không, gỡ lưu sẽ chỉ gỡ được một chỗ và bài vẫn còn ở chỗ khác.
 */
bookmarkSchema.index({ user: 1, post: 1 }, { unique: true });
bookmarkSchema.index({ user: 1, collection: 1, createdAt: -1 });

const Bookmark = mongoose.model('Bookmark', bookmarkSchema);

export default Bookmark;
