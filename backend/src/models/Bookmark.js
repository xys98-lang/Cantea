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
    /**
     * Trường tên `folder` nhưng trỏ tới model `Collection` — lệch tên là có chủ ý.
     *
     * Mongoose xếp `collection` vào danh sách tên đường dẫn dành riêng và ghi rõ là
     * dùng thì tự chịu rủi ro. Thực tế hiện tại nó vẫn chạy đúng, nhưng đó là chi
     * tiết nội bộ của Mongoose chứ không phải cam kết — bản sau có thể đổi.
     *
     * Ràng buộc đó chỉ áp cho tên path trong schema, nên chỉ đúng chỗ này phải lệch.
     * Khái niệm "bộ sưu tập" ở model Collection, đường API /bookmarks/collections và
     * chữ hiện ra cho người dùng đều giữ nguyên tên, vì đổi thêm không được lợi gì.
     */
    folder: {
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
bookmarkSchema.index({ user: 1, folder: 1, createdAt: -1 });

const Bookmark = mongoose.model('Bookmark', bookmarkSchema);

export default Bookmark;
