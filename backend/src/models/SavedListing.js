import mongoose from 'mongoose';

/**
 * Tin đăng đã lưu.
 *
 * Tách riêng khỏi Bookmark của bài viết thay vì gộp làm một collection
 * đa hình. Hai thứ này khác nhau về bản chất: bài viết lưu để đọc lại,
 * tin đăng lưu để theo dõi món đồ — và tin đăng thì hết hạn, còn bài
 * viết thì không. Gộp lại sẽ phải thêm cờ phân loại vào mọi truy vấn.
 */
const savedListingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    listing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Listing',
      required: true,
    },
  },
  { timestamps: true }
);

savedListingSchema.index({ user: 1, listing: 1 }, { unique: true });
savedListingSchema.index({ user: 1, createdAt: -1 });

const SavedListing = mongoose.model('SavedListing', savedListingSchema);

export default SavedListing;
