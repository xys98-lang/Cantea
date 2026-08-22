import mongoose from 'mongoose';
import dotenv from 'dotenv';
import University from '../models/University.js';

dotenv.config();

/**
 * Danh sách trường khởi tạo cho Cantea.
 * LƯU Ý: đuôi mail dưới đây cần bạn kiểm chứng lại với từng trường
 * trước khi lên production — trường có thể dùng đuôi khác cho sinh viên
 * và cho giảng viên, hoặc đã đổi sang hệ thống mới.
 */
const universities = [
  {
    name: 'Trường Đại học Kinh tế TP.HCM',
    shortName: 'UEH',
    slug: 'ueh',
    city: 'HCMC',
    emailDomains: ['st.ueh.edu.vn', 'ueh.edu.vn'],
  },
  {
    name: 'Đại học RMIT Việt Nam',
    shortName: 'RMIT',
    slug: 'rmit',
    city: 'HCMC',
    emailDomains: ['rmit.edu.vn'],
  },
  {
    name: 'Trường Đại học Tôn Đức Thắng',
    shortName: 'TDTU',
    slug: 'tdtu',
    city: 'HCMC',
    emailDomains: ['tdtu.edu.vn', 'student.tdtu.edu.vn'],
  },
  {
    name: 'Trường Đại học Sài Gòn',
    shortName: 'SGU',
    slug: 'sgu',
    city: 'HCMC',
    emailDomains: ['sgu.edu.vn'],
  },
  {
    name: 'Trường Đại học Tài nguyên và Môi trường TP.HCM',
    shortName: 'HCMUNRE',
    slug: 'hcmunre',
    city: 'HCMC',
    emailDomains: ['hcmunre.edu.vn'],
  },
  {
    name: 'Trường Đại học Bách khoa - ĐHQG TP.HCM',
    shortName: 'HCMUT',
    slug: 'hcmut',
    city: 'HCMC',
    emailDomains: ['hcmut.edu.vn'],
  },
  {
    name: 'Trường Đại học Khoa học Tự nhiên - ĐHQG TP.HCM',
    shortName: 'HCMUS',
    slug: 'hcmus',
    city: 'HCMC',
    emailDomains: ['hcmus.edu.vn'],
  },
  {
    name: 'Trường Đại học Công nghệ Thông tin - ĐHQG TP.HCM',
    shortName: 'UIT',
    slug: 'uit',
    city: 'HCMC',
    emailDomains: ['uit.edu.vn', 'gm.uit.edu.vn'],
  },
  {
    name: 'Trường Đại học Ngoại thương CSII',
    shortName: 'FTU2',
    slug: 'ftu2',
    city: 'HCMC',
    emailDomains: ['ftu.edu.vn'],
  },
  {
    name: 'Trường Đại học Sư phạm Kỹ thuật TP.HCM',
    shortName: 'HCMUTE',
    slug: 'hcmute',
    city: 'HCMC',
    emailDomains: ['hcmute.edu.vn', 'student.hcmute.edu.vn'],
  },
];

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Đã kết nối MongoDB');

    let created = 0;
    let updated = 0;

    for (const u of universities) {
      const result = await University.updateOne(
        { slug: u.slug },
        { $set: u },
        { upsert: true }
      );
      if (result.upsertedCount) created += 1;
      else if (result.modifiedCount) updated += 1;
    }

    const total = await University.countDocuments();
    console.log(`✅ Tạo mới: ${created} | Cập nhật: ${updated} | Tổng: ${total}`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error(`❌ Seed thất bại: ${error.message}`);
    process.exit(1);
  }
};

seed();
