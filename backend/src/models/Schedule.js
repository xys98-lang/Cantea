import mongoose from 'mongoose';
import { isValidTime, toMinutes } from '../utils/periods.js';

/**
 * Một buổi học trong tuần.
 * Lưu GIỜ chứ không lưu tiết — xem ghi chú trong utils/periods.js
 */
const meetingSchema = new mongoose.Schema(
  {
    // Quy ước Việt Nam: 2 = Thứ Hai ... 7 = Thứ Bảy, 8 = Chủ nhật
    dayOfWeek: {
      type: Number,
      required: true,
      min: 2,
      max: 8,
    },
    startTime: {
      type: String,
      required: true,
      validate: { validator: isValidTime, message: 'Giờ bắt đầu không hợp lệ' },
    },
    endTime: {
      type: String,
      required: true,
      validate: { validator: isValidTime, message: 'Giờ kết thúc không hợp lệ' },
    },
    /**
     * Mã cơ sở của trường, hoặc tên do sinh viên tự đặt.
     *
     * Không ép viết hoa: trường tự điền nhận cả tên có dấu như "Bình Dương".
     * Chỗ hiển thị tra mã trong danh sách cơ sở của trường, không thấy thì trả
     * về chính chuỗi đó — nên tên tự đặt tự động hiện đúng, không cần trường riêng.
     */
    campus: { type: String, trim: true, maxlength: 60, default: '' },
    room: { type: String, trim: true, maxlength: 50, default: '' },
    building: { type: String, trim: true, maxlength: 50, default: '' },
    note: { type: String, trim: true, maxlength: 200, default: '' },

    /**
     * Buổi lặp hàng tuần, hay chỉ diễn ra một lần.
     *
     * Kỳ thi và buổi học bù gắn với MỘT ngày cụ thể, không phải một thứ trong
     * tuần. Đặt cờ ở cấp buổi chứ không phải cấp môn: buổi thi thường là buổi
     * thứ tư của môn đã có ba buổi lặp — chung tên môn, chung giảng viên.
     */
    repeats: { type: Boolean, default: true },

    /**
     * Chỉ dùng khi repeats = false. dayOfWeek vẫn được suy ra từ ngày này để
     * lưới lịch xếp đúng cột mà không phải biết về hai loại buổi.
     */
    date: { type: Date, default: null },

    /**
     * Tên riêng của buổi này, để trống thì dùng tên môn.
     *
     * Buổi thi hay buổi ngoại khoá không phải một môn riêng — nó là một buổi
     * khác thường của môn đang có. Tách thành Schedule mới sẽ làm danh sách môn
     * học mọc thêm dòng lạ, trong khi sinh viên vẫn chỉ học đúng một môn đó.
     */
    label: { type: String, trim: true, maxlength: 120, default: '' },

    /**
     * Các ngày buổi lặp này KHÔNG diễn ra.
     *
     * Nghỉ một tuần vì trùng lịch thi là chuyện thường. Xoá hẳn buổi lặp thì mất
     * cả chuỗi; giữ nguyên thì lịch báo có học trong khi thực tế nghỉ.
     */
    skipDates: { type: [Date], default: [] },
  },
  { _id: true }
);

meetingSchema.pre('validate', function (next) {
  if (toMinutes(this.endTime) <= toMinutes(this.startTime)) {
    return next(new Error('Giờ kết thúc phải sau giờ bắt đầu'));
  }
  next();
});

/**
 * Thời khoá biểu của sinh viên.
 *
 * KHÔNG phụ thuộc vào model Course và KHÔNG cần university —
 * sinh viên tự gõ, dùng được ngay cả khi chưa xác thực trường.
 * Một môn có nhiều buổi thì gộp trong cùng một document,
 * thay vì nhân bản tên môn và giảng viên ra nhiều dòng.
 */
const scheduleSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    courseName: { type: String, required: true, trim: true, maxlength: 120 },
    courseCode: { type: String, trim: true, maxlength: 30, default: '' },
    classCode: { type: String, trim: true, maxlength: 30, default: '' },
    instructor: { type: String, trim: true, maxlength: 100, default: '' },
    credits: { type: Number, min: 0, max: 20, default: null },

    meetings: {
      type: [meetingSchema],
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: 'Cần ít nhất một buổi học',
      },
    },

    // HK3 là học kỳ hè
    term: { type: String, enum: ['HK1', 'HK2', 'HK3'], default: 'HK1' },
    academicYear: { type: String, trim: true, default: '' }, // "2026-2027"

    // Màu hiển thị trên lưới thời khoá biểu
    color: { type: String, default: null },

    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },

    reminderEnabled: { type: Boolean, default: true },
    reminderMinutes: { type: Number, enum: [0, 15, 30, 60], default: 15 },

    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Truy vấn chính: thời khoá biểu học kỳ hiện tại của một sinh viên
scheduleSchema.index({ student: 1, isArchived: 1, term: 1, academicYear: 1 });
scheduleSchema.index({ student: 1, 'meetings.dayOfWeek': 1 });

const Schedule = mongoose.model('Schedule', scheduleSchema);

export default Schedule;
