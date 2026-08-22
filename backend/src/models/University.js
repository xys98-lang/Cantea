import mongoose from 'mongoose';

const universitySchema = new mongoose.Schema(
  {
    // Tên đầy đủ: "Trường Đại học Kinh tế TP.HCM"
    name: {
      type: String,
      required: true,
      trim: true,
    },
    // Tên viết tắt hiển thị trong app: "UEH"
    shortName: {
      type: String,
      required: true,
      trim: true,
    },
    // Định danh dùng trong URL: "ueh"
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    city: {
      type: String,
      required: true,
      enum: ['HCMC', 'Hanoi', 'Da Nang'],
      default: 'HCMC',
    },
    // Các đuôi mail hợp lệ của trường, dùng để tự nhận diện
    // vd: ['st.ueh.edu.vn', 'ueh.edu.vn']
    emailDomains: [
      {
        type: String,
        lowercase: true,
        trim: true,
      },
    ],
    logoUrl: { type: String, default: null },
    isActive: { type: Boolean, default: true },

    // Thống kê, cập nhật định kỳ
    studentCount: { type: Number, default: 0 },
    postCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

universitySchema.index({ emailDomains: 1 });
universitySchema.index({ city: 1, isActive: 1 });

/**
 * Tìm trường từ đuôi email.
 * Trả về null nếu email không hợp lệ hoặc không thuộc trường nào.
 */
universitySchema.statics.findByEmail = function (email) {
  const domain = String(email || '').split('@')[1]?.toLowerCase().trim();
  if (!domain) return null;
  return this.findOne({ emailDomains: domain, isActive: true });
};

const University = mongoose.model('University', universitySchema);

export default University;
