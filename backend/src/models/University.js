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

    /**
     * Chi nhánh của trường.
     *
     * Hầu hết trường lớn ở TP.HCM đều có nhiều cơ sở nằm cách nhau vài
     * cây số. Sinh viên năm nhất thường không biết điều này khi đăng ký
     * học phần, và chỉ phát hiện ra lúc đứng ở cổng sai — hoặc tệ hơn,
     * lúc đã muộn 20 phút.
     *
     * Danh sách chuẩn hoá thay vì để gõ tự do: có chuẩn thì mới so sánh
     * được hai buổi liền nhau có cùng cơ sở không.
     */
    campuses: [
      {
        code: { type: String, required: true, trim: true, uppercase: true },
        name: { type: String, required: true, trim: true },
        address: { type: String, trim: true, default: '' },
        _id: false,
      },
    ],

    /**
     * Thời gian di chuyển mặc định giữa hai cơ sở bất kỳ, tính bằng phút.
     * Dùng khi cặp cơ sở đó không có trong bảng campusTravel bên dưới.
     */
    campusTravelMinutes: { type: Number, default: 30, min: 5, max: 240 },

    /**
     * Bảng thời gian theo từng cặp cơ sở.
     *
     * Một con số chung không dùng được cho trường có cơ sở rải rác.
     * Đại học Mở là ví dụ rõ nhất: Võ Văn Tần và Hồ Hảo Hớn cách nhau
     * chừng 2km, nhưng Võ Văn Tần và Nhơn Đức ở Nhà Bè cách nhau khoảng
     * 20km. Lấy một con số cho cả hai thì hoặc bỏ sót cặp xa, hoặc báo
     * động giả với cặp gần — cả hai đều khiến cảnh báo mất giá trị.
     *
     * Danh sách thưa: chỉ khai những cặp lệch nhiều so với mặc định.
     * Không cần khai cả hai chiều, tra ngược tự động.
     */
    campusTravel: [
      {
        from: { type: String, required: true, uppercase: true, trim: true },
        to: { type: String, required: true, uppercase: true, trim: true },
        minutes: { type: Number, required: true, min: 0, max: 480 },
        _id: false,
      },
    ],

    studentCount: { type: Number, default: 0 },
    postCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

universitySchema.index({ emailDomains: 1 });
universitySchema.index({ city: 1, isActive: 1 });

/**
 * Thời gian di chuyển giữa hai cơ sở.
 * Tra bảng trước, không thấy thì dùng số mặc định. Cùng cơ sở thì bằng 0.
 */
universitySchema.methods.travelBetween = function (a, b) {
  if (!a || !b) return 0;
  const from = String(a).toUpperCase();
  const to = String(b).toUpperCase();
  if (from === to) return 0;

  const hit = (this.campusTravel || []).find(
    (p) =>
      (p.from === from && p.to === to) || (p.from === to && p.to === from)
  );
  return hit ? hit.minutes : this.campusTravelMinutes || 0;
};

universitySchema.statics.findByEmail = function (email) {
  const domain = String(email || '').split('@')[1]?.toLowerCase().trim();
  if (!domain) return null;
  return this.findOne({ emailDomains: domain, isActive: true });
};

const University = mongoose.model('University', universitySchema);

export default University;
