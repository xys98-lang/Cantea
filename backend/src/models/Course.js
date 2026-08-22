import mongoose from 'mongoose';

/**
 * Danh mục môn học do nhà trường quản lý.
 *
 * KHÔNG dùng cho thời khoá biểu sinh viên tự nhập — cái đó nằm ở
 * models/Schedule.js và hoàn toàn độc lập với file này.
 *
 * Course dành cho giai đoạn sau, khi Cantea có dữ liệu môn học
 * chính thức từ trường và sinh viên chọn từ danh mục thay vì gõ tay.
 */
const courseSchema = new mongoose.Schema(
  {
    courseCode: { type: String, required: true, trim: true },
    courseName: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    credits: { type: Number, min: 0, default: 3 },

    instructor: {
      name: { type: String, default: '' },
      email: { type: String, default: '' },
    },
    location: {
      building: { type: String, default: '' },
      room: { type: String, default: '' },
      campus: { type: String, default: '' },
    },

    faculty: { type: String, trim: true, default: '' },

    // HK3 là học kỳ hè
    term: { type: String, enum: ['HK1', 'HK2', 'HK3'], required: true },
    academicYear: { type: String, required: true }, // "2026-2027"

    university: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'University',
      required: true,
    },

    // Người tạo bản ghi — giảng viên hoặc quản trị viên
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

courseSchema.index({ university: 1, term: 1, academicYear: 1 });
courseSchema.index({ university: 1, courseCode: 1 });

const Course = mongoose.model('Course', courseSchema);

export default Course;
