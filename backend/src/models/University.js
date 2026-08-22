import mongoose from 'mongoose';
import { periodEntrySchema } from './User.js';

const universitySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    shortName: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    city: {
      type: String,
      required: true,
      enum: ['HCMC', 'Hanoi', 'Da Nang'],
      default: 'HCMC',
    },
    // vd: ['st.ueh.edu.vn', 'ueh.edu.vn']
    emailDomains: [{ type: String, lowercase: true, trim: true }],
    logoUrl: { type: String, default: null },
    isActive: { type: Boolean, default: true },

    /**
     * Khung tiết riêng của trường. Mỗi trường một giờ khác nhau —
     * có trường vào tiết 1 lúc 7:00, trường khác 6:30.
     *
     * Để trống thì sinh viên trường này dùng khung mặc định.
     * Khi có dữ liệu thật, chỉ cần cập nhật trường này — không phải
     * sửa code, cũng không phải chuyển đổi thời khoá biểu cũ,
     * vì các buổi học đã lưu bằng giờ tuyệt đối.
     */
    periodSchedule: { type: [periodEntrySchema], default: [] },

    studentCount: { type: Number, default: 0 },
    postCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

universitySchema.index({ emailDomains: 1 });
universitySchema.index({ city: 1, isActive: 1 });

universitySchema.statics.findByEmail = function (email) {
  const domain = String(email || '').split('@')[1]?.toLowerCase().trim();
  if (!domain) return null;
  return this.findOne({ emailDomains: domain, isActive: true });
};

const University = mongoose.model('University', universitySchema);

export default University;
