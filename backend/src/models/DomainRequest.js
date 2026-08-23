import mongoose from 'mongoose';

/**
 * YÊU CẦU BỔ SUNG TRƯỜNG HOẶC ĐUÔI EMAIL
 *
 * Danh sách 29 trường hiện tại chỉ có 4 trường được đối chiếu với thông
 * báo chính thức. Số còn lại điền theo quy ước chung, và chắc chắn có
 * cái sai — nhất là các trường dùng tên miền con kiểu sv. hay st. mà
 * không công bố rộng rãi.
 *
 * Không có luồng này thì sinh viên gặp đuôi sai chỉ nhận một câu từ chối
 * rồi thôi. Họ không biết báo cho ai, và bạn không biết mình sai ở đâu.
 * Mỗi lần từ chối lẽ ra phải là một lần sửa được dữ liệu.
 */
const domainRequestSchema = new mongoose.Schema(
  {
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    /** Đuôi email bị từ chối, ví dụ "sv.abc.edu.vn" */
    domain: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      maxlength: 100,
    },

    /** Trường mà người gửi khai */
    universityName: { type: String, required: true, trim: true, maxlength: 160 },
    note: { type: String, trim: true, maxlength: 500, default: '' },

    /**
     * Ảnh chứng minh: thẻ sinh viên, ảnh chụp hộp thư trường, giấy báo
     * trúng tuyển.
     *
     * ĐÂY LÀ DỮ LIỆU NHẠY CẢM NHẤT TRONG CẢ HỆ THỐNG — nó gắn một con
     * người thật với một tài khoản. Bị xoá ngay khi yêu cầu được xử lý,
     * xem cleanupEvidence trong controller. Giữ lại lâu hơn mức cần
     * thiết không mang lại lợi ích gì mà tạo ra rủi ro thật.
     */
    evidence: {
      type: [
        {
          url: String,
          publicId: String, // cần cho việc xoá trên Cloudinary
          _id: false,
        },
      ],
      default: [],
      select: false,
    },

    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },

    /** Trường mà quản trị viên gán đuôi này vào khi duyệt */
    resolvedUniversity: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'University',
      default: null,
    },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    resolvedAt: { type: Date, default: null },
    /** Lý do từ chối, hiện lại cho người gửi */
    resolution: { type: String, maxlength: 300, default: '' },

    evidenceDeletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

/** Mỗi người chỉ một yêu cầu đang chờ cho mỗi đuôi */
domainRequestSchema.index(
  { requester: 1, domain: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'pending' } }
);
domainRequestSchema.index({ status: 1, createdAt: -1 });
domainRequestSchema.index({ domain: 1, status: 1 });

const DomainRequest = mongoose.model('DomainRequest', domainRequestSchema);

export default DomainRequest;
