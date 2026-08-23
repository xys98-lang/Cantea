import mongoose from 'mongoose';
import dotenv from 'dotenv';
import University from '../models/University.js';

dotenv.config();

/**
 * CƠ SỞ VÀ THỜI GIAN DI CHUYỂN
 *
 * Dữ liệu này chạy một tính năng mà không hệ thống nào của trường có:
 * cảnh báo khi hai buổi học liền nhau nằm ở hai cơ sở không đi kịp.
 * Cổng đăng ký học phần chỉ kiểm tra trùng giờ, không biết hai phòng
 * cách nhau bao xa.
 *
 * Con số phút KHÔNG phải khoảng cách thật — nó là ngưỡng cảnh báo, đã
 * cộng thời gian gửi xe, đi bộ và tìm phòng. Chỉnh xuống nếu sinh viên
 * thấy báo động giả quá nhiều.
 */

const UEH = {
  /**
   * ĐÃ XÁC NHẬN từ dữ liệu thật trên daotao.ueh.edu.vn:
   *   Khu B1 — 279 Nguyễn Tri Phương, Phường Diên Hồng
   *
   * CHƯA XÁC NHẬN: các khu còn lại và địa chỉ. Cách kiểm: tra vài lớp
   * học phần trên cổng đào tạo, mã khu nằm trong ngoặc cuối cột Lịch học.
   */
  travelMinutes: 30,
  list: [
    { code: 'A', name: 'Khu A', address: '59C Nguyễn Đình Chiểu, Quận 3, TP.HCM' },
    { code: 'B1', name: 'Khu B1', address: '279 Nguyễn Tri Phương, Phường Diên Hồng, TP.HCM' },
    { code: 'B2', name: 'Khu B2', address: '' },
    { code: 'N', name: 'Khu N', address: '' },
    { code: 'V', name: 'Khu V', address: '' },
  ],
  travel: [{ from: 'A', to: 'B1', minutes: 30 }],
};

const OU = {
  /**
   * Nguồn: ou.edu.vn/cac-co-so-dao-tao
   *
   * Chỉ đưa vào các cơ sở trong TP.HCM. Các cơ sở ở Bình Dương, Đồng Nai
   * và Khánh Hòa không thể học liền buổi với cơ sở nội thành, nên cảnh
   * báo di chuyển ở đó không có ý nghĩa — và đưa vào chỉ làm dài thêm
   * dải chọn mà sinh viên phải lướt qua.
   */
  travelMinutes: 45,
  list: [
    {
      code: 'VVT',
      name: 'Võ Văn Tần',
      address: '97 Võ Văn Tần, Phường Xuân Hòa, TP.HCM',
    },
    {
      code: 'HHH',
      name: 'Hồ Hảo Hớn',
      address: '35–37 Hồ Hảo Hớn, Phường Cầu Ông Lãnh, TP.HCM',
    },
    {
      code: 'ND',
      name: 'Nhơn Đức',
      address: 'Khu dân cư Nhơn Đức, xã Hiệp Phước, TP.HCM',
    },
    {
      code: 'MTL',
      name: 'Mai Thị Lựu',
      address: '02 Mai Thị Lựu, Phường Tân Định, TP.HCM',
    },
    {
      code: 'GP',
      name: 'Gia Phú',
      address: '311 Gia Phú, Phường Bình Tiên, TP.HCM',
    },
  ],
  /**
   * Đây là lý do phải có bảng theo cặp thay vì một con số chung.
   *
   * Ba cơ sở nội thành nằm sát nhau — Võ Văn Tần, Hồ Hảo Hớn và Mai Thị
   * Lựu đều trong bán kính 2km, đi 15 phút là tới. Nhưng Nhơn Đức ở Nhà
   * Bè cách trung tâm khoảng 20km, giờ cao điểm mất cả tiếng.
   *
   * Lấy một con số cho cả hai thì hoặc bỏ sót cặp xa, hoặc báo động giả
   * với cặp gần — cả hai đều khiến sinh viên thôi tin vào cảnh báo.
   */
  travel: [
    { from: 'VVT', to: 'HHH', minutes: 15 },
    { from: 'VVT', to: 'MTL', minutes: 15 },
    { from: 'HHH', to: 'MTL', minutes: 15 },
    { from: 'VVT', to: 'ND', minutes: 60 },
    { from: 'HHH', to: 'ND', minutes: 55 },
    { from: 'MTL', to: 'ND', minutes: 60 },
    { from: 'VVT', to: 'GP', minutes: 30 },
    { from: 'HHH', to: 'GP', minutes: 25 },
    { from: 'ND', to: 'GP', minutes: 50 },
  ],
};

const CAMPUSES = { ueh: UEH, ou: OU };

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Đã kết nối MongoDB');

    for (const [slug, data] of Object.entries(CAMPUSES)) {
      const uni = await University.findOne({ slug });
      if (!uni) {
        console.log(`⚠️  Không tìm thấy trường "${slug}" — chạy seedData.js trước`);
        continue;
      }

      uni.campuses = data.list;
      uni.campusTravelMinutes = data.travelMinutes;
      uni.campusTravel = data.travel || [];
      await uni.save();

      console.log(`\n✅ ${uni.shortName}: ${data.list.length} cơ sở`);
      data.list.forEach((c) =>
        console.log(
          `   ${c.code.padEnd(4)} ${c.name.padEnd(14)} ${c.address || '(chưa có địa chỉ)'}`
        )
      );

      if (data.travel?.length) {
        console.log(`   Thời gian di chuyển (${data.travel.length} cặp đã khai):`);
        data.travel.forEach((t) =>
          console.log(`     ${t.from} ↔ ${t.to}: ${t.minutes} phút`)
        );
      }
      console.log(`   Cặp chưa khai dùng mặc định ${data.travelMinutes} phút`);
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error(`❌ Seed thất bại: ${error.message}`);
    process.exit(1);
  }
};

seed();
