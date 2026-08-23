import mongoose from 'mongoose';

/**
 * Tin đăng trên Canlib.
 *
 * NGOẠI LỆ DUY NHẤT CỦA QUY TẮC ẨN DANH: tin đăng không bao giờ ẩn danh.
 * Người mua cần đủ tín hiệu để dám hẹn gặp và trao đồ, nên biệt danh,
 * khoa và khoá của người bán luôn hiện. Điều này phải được nói rõ trước
 * khi người dùng gõ chữ đầu tiên — họ vừa từ tab Cộng đồng sang, nơi ẩn
 * danh bật sẵn, nên mặc định trong đầu họ là "mình vẫn ẩn".
 */
const listingSchema = new mongoose.Schema(
  {
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    /**
     * Tin thuộc về một trường cụ thể. Sách giáo trình chỉ có giá trị với
     * người học cùng môn, và quan trọng hơn — hẹn gặp trong khuôn viên
     * trường an toàn hơn hẹn với người lạ ở thành phố khác.
     */
    university: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'University',
      required: true,
    },

    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 2000, default: '' },

    /** Ảnh đầu tiên là ảnh bìa — nó quyết định tin có được bấm vào không */
    images: {
      type: [String],
      validate: {
        validator: (v) => v.length <= 5,
        message: 'Tối đa 5 ảnh',
      },
      default: [],
    },

    /**
     * Giáo trình và đề cương gộp thành "material".
     *
     * Ranh giới giữa hai thứ đó mờ — một tập photo có cả đề cương lẫn
     * bài giảng thì xếp vào đâu? Người đăng phải đoán, người tìm cũng
     * phải đoán, và cuối cùng phải mở cả hai mục. Gộp lại thì không ai
     * phải đoán nữa.
     *
     * "book" tách riêng cho sách không phải tài liệu học — sách kỹ năng,
     * tiểu thuyết, sách tham khảo. Đây là nhu cầu khác hẳn: mua giáo
     * trình là bắt buộc, mua sách đọc là tuỳ hứng.
     */
    category: {
      type: String,
      enum: ['material', 'book', 'supplies', 'other'],
      default: 'material',
    },
    /** Mã môn mà tài liệu này dùng cho — giúp tìm đúng sách cần */
    courseCode: { type: String, trim: true, uppercase: true, maxlength: 20, default: '' },

    dealType: {
      type: String,
      enum: ['sell', 'give', 'exchange'],
      default: 'sell',
    },
    price: { type: Number, min: 0, default: 0 },
    /** Giá bìa — để tính phần trăm giảm, con số có nghĩa thật với sách cũ */
    originalPrice: { type: Number, min: 0, default: null },

    condition: {
      type: String,
      enum: ['new', 'like_new', 'good', 'fair'],
      default: 'good',
    },

    /**
     * Trạng thái tin.
     *
     * Không có trạng thái đóng thì tin chết nằm lại trong lưới, người mua
     * vẫn nhắn, người bán vẫn phải trả lời "hết rồi". Sau vài tuần lưới
     * đầy tin không còn hiệu lực và người dùng bỏ đi.
     */
    status: {
      type: String,
      enum: ['active', 'reserved', 'sold', 'hidden'],
      default: 'active',
    },
    soldAt: { type: Date, default: null },

    /**
     * Tin tự hết hạn sau 30 ngày. Người bán có thể đẩy lại để gia hạn.
     * Nếu không, lưới sẽ đầy tin bỏ quên từ học kỳ trước.
     */
    bumpedAt: { type: Date, default: Date.now },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 3600 * 1000),
    },

    viewCount: { type: Number, default: 0 },
    saveCount: { type: Number, default: 0 },
    messageCount: { type: Number, default: 0 },

    isFlagged: { type: Boolean, default: false },
    flagCount: { type: Number, default: 0 },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Lưới chính: tin đang bán của một trường, mới đẩy lên trước
listingSchema.index({ university: 1, status: 1, isDeleted: 1, bumpedAt: -1 });
listingSchema.index({ university: 1, category: 1, status: 1, bumpedAt: -1 });
listingSchema.index({ university: 1, courseCode: 1, status: 1 });
listingSchema.index({ seller: 1, createdAt: -1 });
listingSchema.index({ expiresAt: 1 });

/**
 * Tìm kiếm toàn văn. Trọng số cao nhất cho mã môn vì sinh viên tìm sách
 * thường gõ đúng mã môn họ đang học ("CTDL", "MAT1093"), chứ ít khi nhớ
 * chính xác tên sách.
 */
listingSchema.index(
  { courseCode: 'text', title: 'text', description: 'text' },
  { weights: { courseCode: 10, title: 5, description: 1 }, name: 'listing_search' }
);

/**
 * Tin đã bán vẫn nằm trong lưới thêm 7 ngày rồi mới ẩn.
 * Người mua hụt thấy được mặt bằng giá, người bán mới biết nên ra giá bao nhiêu.
 */
listingSchema.virtual('shouldShow').get(function () {
  if (this.isDeleted || this.status === 'hidden') return false;
  if (this.status !== 'sold') return new Date() < this.expiresAt;
  return this.soldAt && Date.now() - this.soldAt.getTime() < 7 * 24 * 3600 * 1000;
});

/** Phần trăm giảm so với giá bìa — chỉ tính khi có đủ hai giá */
listingSchema.virtual('discountPercent').get(function () {
  if (!this.originalPrice || !this.price || this.price >= this.originalPrice) return null;
  return Math.round((1 - this.price / this.originalPrice) * 100);
});

const Listing = mongoose.model('Listing', listingSchema);

export default Listing;
