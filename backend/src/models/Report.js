import mongoose from 'mongoose';

/**
 * LÝ DO BÁO CÁO
 *
 * Giữ mã bằng tiếng Anh cho khớp với các enum sẵn có trong Post (category,
 * communityType); chữ tiếng Việt hiện ra cho người dùng nằm ở tầng API để
 * mobile không tự chế bản dịch riêng rồi lệch với server.
 *
 * `personal_info` tách riêng chứ không gộp vào quấy rối: trong một bảng tin
 * ẩn danh của sinh viên cùng trường, bêu tên hoặc lộ thông tin ai đó là dạng
 * lạm dụng dễ xảy ra nhất và cần xử lý gấp hơn một lời lẽ khó nghe.
 */
export const REPORT_REASONS = {
  spam: 'Spam hoặc quảng cáo',
  harassment: 'Quấy rối, xúc phạm',
  adult: 'Nội dung 18+',
  misinformation: 'Thông tin sai lệch',
  personal_info: 'Lộ thông tin cá nhân',
  other: 'Lý do khác',
};

const reportSchema = new mongoose.Schema(
  {
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
    },

    /**
     * select:false giống Post.author, và lý do còn nặng hơn.
     *
     * Trong cộng đồng ẩn danh, biết ai đã báo cáo mình là thứ dẫn thẳng tới
     * trả đũa. Danh tính này không ra khỏi server kể cả với người kiểm duyệt —
     * họ cần biết bài nào có vấn đề, không cần biết ai đã bấm nút.
     */
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      select: false,
    },

    reason: {
      type: String,
      enum: Object.keys(REPORT_REASONS),
      required: true,
    },

    /** Người báo cáo mô tả thêm. Không bắt buộc, vì bắt viết sẽ làm ít ai báo. */
    detail: { type: String, trim: true, maxlength: 500, default: '' },

    status: {
      type: String,
      enum: ['pending', 'dismissed', 'actioned'],
      default: 'pending',
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      select: false,
      default: null,
    },
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

/**
 * Mỗi người báo cáo một bài đúng một lần.
 *
 * Chặn ở tầng index chứ không kiểm tra trước khi ghi: nếu không, một tài khoản
 * bấm mười lần là đủ đẩy bài qua ngưỡng tự ẩn, và con số báo cáo mất hết ý nghĩa.
 * Đọc-rồi-ghi vẫn hở một khoảng đua khi người dùng bấm kép.
 */
reportSchema.index({ post: 1, reporter: 1 }, { unique: true });

/** Hàng chờ của người kiểm duyệt: lọc theo trạng thái, cũ nhất lên trước */
reportSchema.index({ status: 1, createdAt: 1 });

/** Đếm số báo cáo của một bài, và gom nhóm theo lý do */
reportSchema.index({ post: 1, reason: 1 });

const Report = mongoose.model('Report', reportSchema);

export default Report;
