import mongoose from 'mongoose';
import dotenv from 'dotenv';
import University from '../models/University.js';

dotenv.config();

/**
 * DANH SÁCH TRƯỜNG ĐẠI HỌC TP.HCM
 *
 * Đuôi email là dữ liệu quan trọng nhất trong file này. Sai một đuôi thì
 * toàn bộ sinh viên trường đó không xác thực được, và họ sẽ không biết
 * vì sao — chỉ thấy báo "email này chưa thuộc trường nào Cantea hỗ trợ".
 *
 * VÌ SAO KHAI CẢ TÊN MIỀN CHÍNH LẪN TÊN MIỀN CON
 *
 * Nhiều trường cấp cho sinh viên một tên miền con (student.hcmus.edu.vn)
 * còn giảng viên dùng tên miền chính (hcmus.edu.vn). Nhưng cách đặt không
 * thống nhất: có trường cấp thẳng tên miền chính cho sinh viên, có trường
 * dùng sv., st., hoặc gm.
 *
 * Khai cả hai là lựa chọn an toàn. Xác thực ở Cantea chỉ để chứng minh
 * "người này thuộc trường X" — mà email tên miền chính cũng chứng minh
 * điều đó. Bỏ sót một đuôi thì chặn nhầm người thật; khai thừa một đuôi
 * thì chỉ cho thêm giảng viên vào, không phải rủi ro.
 *
 * ĐÁNH DẤU KIỂM CHỨNG
 *   ✓  đã đối chiếu với thông báo chính thức của trường
 *   ?  điền theo quy ước chung, CẦN KIỂM LẠI trước khi mở cho trường đó
 */
const universities = [
  // ══════════ ĐẠI HỌC QUỐC GIA TP.HCM ══════════
  {
    name: 'Trường Đại học Bách khoa — ĐHQG TP.HCM',
    shortName: 'HCMUT',
    slug: 'hcmut',
    city: 'HCMC',
    emailDomains: ['hcmut.edu.vn'], // ✓ tên miền chính thức của trường
  },
  {
    name: 'Trường Đại học Khoa học Tự nhiên — ĐHQG TP.HCM',
    shortName: 'HCMUS',
    slug: 'hcmus',
    city: 'HCMC',
    /**
     * ✓ Xác nhận từ tuyensinh.hcmus.edu.vn: email sinh viên có dạng
     * [MSSV + 2 số cuối CCCD]@student.hcmus.edu.vn
     *
     * Bản seed trước của tôi chỉ có hcmus.edu.vn — đó là tên miền giảng
     * viên. Sinh viên HCMUS sẽ không xác thực được.
     */
    emailDomains: ['student.hcmus.edu.vn', 'hcmus.edu.vn'],
  },
  {
    name: 'Trường Đại học Khoa học Xã hội và Nhân văn — ĐHQG TP.HCM',
    shortName: 'USSH',
    slug: 'ussh',
    city: 'HCMC',
    emailDomains: ['hcmussh.edu.vn'], // ? tên miền trường đã xác nhận, đuôi sinh viên chưa
  },
  {
    name: 'Trường Đại học Công nghệ Thông tin — ĐHQG TP.HCM',
    shortName: 'UIT',
    slug: 'uit',
    city: 'HCMC',
    emailDomains: ['gm.uit.edu.vn', 'uit.edu.vn'], // ?
  },
  {
    name: 'Trường Đại học Kinh tế - Luật — ĐHQG TP.HCM',
    shortName: 'UEL',
    slug: 'uel',
    city: 'HCMC',
    emailDomains: ['st.uel.edu.vn', 'uel.edu.vn'], // ?
  },
  {
    name: 'Trường Đại học Quốc tế — ĐHQG TP.HCM',
    shortName: 'IU',
    slug: 'iu',
    city: 'HCMC',
    emailDomains: ['hcmiu.edu.vn'], // ?
  },

  // ══════════ CÔNG LẬP ══════════
  {
    name: 'Trường Đại học Kinh tế TP.HCM',
    shortName: 'UEH',
    slug: 'ueh',
    city: 'HCMC',
    emailDomains: ['st.ueh.edu.vn', 'ueh.edu.vn'], // ?
  },
  {
    name: 'Trường Đại học Mở TP.HCM',
    shortName: 'OU',
    slug: 'ou',
    city: 'HCMC',
    /**
     * ✓ Xác nhận từ tuyensinh.ou.edu.vn: email sinh viên có dạng
     * <MSSV><Tên không dấu>@ou.edu.vn
     * oude.edu.vn dành cho hệ Đào tạo từ xa và Vừa làm vừa học.
     */
    emailDomains: ['ou.edu.vn', 'oude.edu.vn'],
  },
  {
    name: 'Trường Đại học Tôn Đức Thắng',
    shortName: 'TDTU',
    slug: 'tdtu',
    city: 'HCMC',
    /** ✓ Xác nhận từ itservices.tdtu.edu.vn: MSSV@student.tdtu.edu.vn */
    emailDomains: ['student.tdtu.edu.vn', 'tdtu.edu.vn'],
  },
  {
    name: 'Trường Đại học Sư phạm Kỹ thuật TP.HCM',
    shortName: 'HCMUTE',
    slug: 'hcmute',
    city: 'HCMC',
    emailDomains: ['student.hcmute.edu.vn', 'hcmute.edu.vn'], // ?
  },
  {
    name: 'Trường Đại học Sư phạm TP.HCM',
    shortName: 'HCMUE',
    slug: 'hcmue',
    city: 'HCMC',
    emailDomains: ['student.hcmue.edu.vn', 'hcmue.edu.vn'], // ?
  },
  {
    name: 'Trường Đại học Công nghiệp TP.HCM',
    shortName: 'IUH',
    slug: 'iuh',
    city: 'HCMC',
    emailDomains: ['student.iuh.edu.vn', 'iuh.edu.vn'], // ?
  },
  {
    name: 'Trường Đại học Công Thương TP.HCM',
    shortName: 'HUIT',
    slug: 'huit',
    city: 'HCMC',
    emailDomains: ['huit.edu.vn'], // ? sinh viên dùng MSSV@huit.edu.vn
  },
  {
    name: 'Trường Đại học Sài Gòn',
    shortName: 'SGU',
    slug: 'sgu',
    city: 'HCMC',
    emailDomains: ['sgu.edu.vn'], // ?
  },
  {
    name: 'Trường Đại học Y Dược TP.HCM',
    shortName: 'UMP',
    slug: 'ump',
    city: 'HCMC',
    emailDomains: ['ump.edu.vn'], // ?
  },
  {
    name: 'Trường Đại học Luật TP.HCM',
    shortName: 'ULAW',
    slug: 'ulaw',
    city: 'HCMC',
    emailDomains: ['hcmulaw.edu.vn'], // ?
  },
  {
    name: 'Trường Đại học Nông Lâm TP.HCM',
    shortName: 'NLU',
    slug: 'nlu',
    city: 'HCMC',
    emailDomains: ['st.hcmuaf.edu.vn', 'hcmuaf.edu.vn'], // ?
  },
  {
    name: 'Trường Đại học Ngân hàng TP.HCM',
    shortName: 'HUB',
    slug: 'hub',
    city: 'HCMC',
    emailDomains: ['st.buh.edu.vn', 'hub.edu.vn', 'buh.edu.vn'], // ?
  },
  {
    name: 'Trường Đại học Tài chính - Marketing',
    shortName: 'UFM',
    slug: 'ufm',
    city: 'HCMC',
    emailDomains: ['ufm.edu.vn'], // ?
  },
  {
    name: 'Trường Đại học Giao thông Vận tải TP.HCM',
    shortName: 'UTH',
    slug: 'uth',
    city: 'HCMC',
    emailDomains: ['ut.edu.vn'], // ?
  },
  {
    name: 'Trường Đại học Kiến trúc TP.HCM',
    shortName: 'UAH',
    slug: 'uah',
    city: 'HCMC',
    emailDomains: ['uah.edu.vn'], // ?
  },
  {
    name: 'Trường Đại học Ngoại thương — Cơ sở II',
    shortName: 'FTU2',
    slug: 'ftu2',
    city: 'HCMC',
    emailDomains: ['ftu.edu.vn'], // ?
  },
  {
    name: 'Trường Đại học Tài nguyên và Môi trường TP.HCM',
    shortName: 'HCMUNRE',
    slug: 'hcmunre',
    city: 'HCMC',
    emailDomains: ['hcmunre.edu.vn'], // ?
  },

  // ══════════ TƯ THỤC VÀ QUỐC TẾ ══════════
  {
    name: 'Đại học RMIT Việt Nam',
    shortName: 'RMIT',
    slug: 'rmit',
    city: 'HCMC',
    emailDomains: ['rmit.edu.vn'], // ?
  },
  {
    name: 'Trường Đại học Văn Lang',
    shortName: 'VLU',
    slug: 'vlu',
    city: 'HCMC',
    emailDomains: ['vlu.edu.vn', 'vanlanguni.vn'], // ?
  },
  {
    name: 'Trường Đại học Công nghệ TP.HCM',
    shortName: 'HUTECH',
    slug: 'hutech',
    city: 'HCMC',
    emailDomains: ['hutech.edu.vn'], // ?
  },
  {
    name: 'Trường Đại học Hoa Sen',
    shortName: 'HSU',
    slug: 'hsu',
    city: 'HCMC',
    emailDomains: ['hoasen.edu.vn'], // ?
  },
  {
    name: 'Trường Đại học Nguyễn Tất Thành',
    shortName: 'NTTU',
    slug: 'nttu',
    city: 'HCMC',
    emailDomains: ['nttu.edu.vn'], // ?
  },
  {
    name: 'Trường Đại học FPT — Cơ sở TP.HCM',
    shortName: 'FPTU',
    slug: 'fptu-hcm',
    city: 'HCMC',
    emailDomains: ['fpt.edu.vn'], // ?
  },
];

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Đã kết nối MongoDB\n');

    let created = 0;
    let updated = 0;

    for (const u of universities) {
      const result = await University.updateOne({ slug: u.slug }, { $set: u }, { upsert: true });
      if (result.upsertedCount) created += 1;
      else if (result.modifiedCount) updated += 1;
    }

    /**
     * Cảnh báo trùng đuôi email.
     *
     * Một đuôi thuộc hai trường thì findByEmail trả về trường nào tuỳ
     * thứ tự trong database — sinh viên có thể bị gán nhầm trường và
     * vào nhầm cộng đồng. Đây là lỗi im lặng, phải bắt ngay lúc seed.
     */
    const all = await University.find().select('shortName emailDomains').lean();
    const seen = new Map();
    const clashes = [];

    all.forEach((uni) => {
      (uni.emailDomains || []).forEach((d) => {
        if (seen.has(d)) clashes.push({ domain: d, a: seen.get(d), b: uni.shortName });
        else seen.set(d, uni.shortName);
      });
    });

    const total = await University.countDocuments();
    console.log(`✅ Tạo mới ${created} · Cập nhật ${updated} · Tổng ${total} trường`);
    console.log(`✅ ${seen.size} đuôi email được nhận diện`);

    if (clashes.length) {
      console.log('\n⚠️  TRÙNG ĐUÔI EMAIL — phải sửa, nếu không sinh viên bị gán nhầm trường:');
      clashes.forEach((c) => console.log(`   ${c.domain} — vừa của ${c.a} vừa của ${c.b}`));
    }

    console.log(
      '\n📌 Chỉ 4 trường đã đối chiếu với thông báo chính thức: HCMUS, TDTU, OU, HCMUT.'
    );
    console.log(
      '   Các trường còn lại điền theo quy ước chung. Trước khi mở cho một trường,'
    );
    console.log('   nhờ một sinh viên trường đó thử xác thực bằng email thật.');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error(`❌ Seed thất bại: ${error.message}`);
    process.exit(1);
  }
};

seed();
