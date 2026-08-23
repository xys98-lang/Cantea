import mongoose from 'mongoose';

/**
 * DANH MỤC LỚP HỌC PHẦN
 *
 * Nguồn dữ liệu: chính thời khoá biểu sinh viên nhập vào.
 *
 * Cổng đào tạo của trường chỉ cho tra từng lớp một, không có kho dữ liệu
 * để tải về — và quét hàng nghìn mã lớp từ máy chủ của họ thì không nên
 * làm. Nhưng mỗi sinh viên nhập lịch là hệ thống biết thêm vài lớp thật:
 * mã lớp, tên môn, thứ, giờ, phòng, cơ sở.
 *
 * Sinh viên đầu tiên phải dán cả bảng từ cổng trường. Sinh viên thứ năm
 * mươi chỉ cần gõ "CTDL" rồi chọn. Càng dùng càng đầy.
 *
 * KHÔNG lưu ai đã đóng góp lớp nào. Với một app xây quanh ẩn danh, một
 * bảng ghi "sinh viên X học môn Y" là thứ không nên tồn tại — kể cả khi
 * không hiển thị ở đâu.
 */
const meetingSnapshot = new mongoose.Schema(
  {
    dayOfWeek: { type: Number, min: 2, max: 8, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    campus: { type: String, uppercase: true, trim: true, default: '' },
    building: { type: String, trim: true, default: '' },
    room: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const courseOfferingSchema = new mongoose.Schema(
  {
    university: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'University',
      required: true,
    },

    /** Mã lớp học phần đầy đủ, ví dụ 26D1TEC55006501 */
    classCode: { type: String, required: true, uppercase: true, trim: true, maxlength: 40 },
    courseName: { type: String, required: true, trim: true, maxlength: 160 },
    instructor: { type: String, trim: true, maxlength: 120, default: '' },

    term: { type: String, default: '' },
    academicYear: { type: String, default: '' },

    meetings: { type: [meetingSnapshot], default: [] },

    /**
     * Bao nhiêu lần lớp này xuất hiện trong lịch sinh viên nhập.
     *
     * Dùng để xếp thứ tự gợi ý — lớp nhiều người học lên trước. Cũng là
     * tín hiệu tin cậy: lớp mới thấy một lần có thể do gõ sai, lớp thấy
     * hai mươi lần thì gần như chắc chắn đúng.
     */
    seenCount: { type: Number, default: 1 },
    lastSeenAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Mỗi trường một mã lớp duy nhất
courseOfferingSchema.index({ university: 1, classCode: 1 }, { unique: true });
courseOfferingSchema.index({ university: 1, seenCount: -1 });

/**
 * Tìm theo tên môn. Trọng số cao hơn cho mã lớp vì sinh viên tra bằng mã
 * thì thường gõ chính xác, còn tra bằng tên thì hay gõ thiếu dấu.
 */
courseOfferingSchema.index(
  { classCode: 'text', courseName: 'text', instructor: 'text' },
  { weights: { classCode: 10, courseName: 5, instructor: 1 }, name: 'offering_search' }
);

const CourseOffering = mongoose.model('CourseOffering', courseOfferingSchema);

export default CourseOffering;
