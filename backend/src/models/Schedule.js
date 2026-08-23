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
    /** Mã cơ sở, khớp với University.campuses[].code */
    campus: { type: String, trim: true, uppercase: true, maxlength: 20, default: '' },
    room: { type: String, trim: true, maxlength: 50, default: '' },
    building: { type: String, trim: true, maxlength: 50, default: '' },
    note: { type: String, trim: true, maxlength: 200, default: '' },
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
