import 'dotenv/config';
import mongoose from 'mongoose';

/**
 * Nạp danh sách cơ sở cho các trường chưa có.
 *
 * Chạy khô mặc định, thêm --apply mới ghi. Chỉ đụng vào trường đang có mảng
 * campuses rỗng — trường nào đã điền tay thì bỏ qua, để script chạy lại nhiều
 * lần không ghi đè công sức nhập liệu.
 *
 * Địa chỉ dùng tên phường sau sắp xếp hành chính 2025, khớp cách ghi của dữ
 * liệu OU và UEH đã có sẵn.
 */
const APPLY = process.argv.includes('--apply');

const DATA = {
  HCMUT: [
    { code: 'LTK', name: 'Lý Thường Kiệt', address: '268 Lý Thường Kiệt, Phường Diên Hồng, TP.HCM' },
    { code: 'DA', name: 'Dĩ An', address: 'Khu phố Tân Lập, Phường Đông Hòa, TP.HCM' },
  ],
  HCMUS: [
    { code: 'NVC', name: 'Nguyễn Văn Cừ', address: '227 Nguyễn Văn Cừ, Phường Chợ Quán, TP.HCM' },
    { code: 'LT', name: 'Linh Trung', address: 'Khu đô thị ĐHQG TP.HCM, Phường Đông Hòa, TP.HCM' },
  ],
  USSH: [
    { code: 'DTH', name: 'Đinh Tiên Hoàng', address: '10-12 Đinh Tiên Hoàng, Phường Sài Gòn, TP.HCM' },
    { code: 'LX', name: 'Linh Xuân', address: 'Khu phố 33, Phường Linh Xuân, TP.HCM' },
  ],
  HUTECH: [
    { code: 'DBP', name: 'Điện Biên Phủ', address: '475A Điện Biên Phủ, Phường Thạnh Mỹ Tây, TP.HCM' },
    { code: 'UVK', name: 'Ung Văn Khiêm', address: '31/36 Ung Văn Khiêm, Phường Thạnh Mỹ Tây, TP.HCM' },
    { code: 'TD', name: 'Thủ Đức', address: 'Phân khu Đào tạo E1, Khu Công nghệ cao, Phường Tăng Nhơn Phú, TP.HCM' },
    { code: 'HTP', name: 'Hitech Park', address: 'Lô E2b-4, Đường D1, Khu Công nghệ cao, Phường Tăng Nhơn Phú, TP.HCM' },
  ],
  VLU: [
    { code: 'DTT', name: 'Đặng Thùy Trâm', address: '69/68 Đặng Thùy Trâm, Phường Bình Lợi Trung, TP.HCM' },
    { code: 'PVT', name: 'Phan Văn Trị', address: '233A Phan Văn Trị, Phường Bình Lợi Trung, TP.HCM' },
    { code: 'NKN', name: 'Nguyễn Khắc Nhu', address: '45 Nguyễn Khắc Nhu, Phường Cầu Ông Lãnh, TP.HCM' },
  ],
};

async function main() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.error('Khong tim thay MONGODB_URI trong backend/.env');
    process.exit(1);
  }

  await mongoose.connect(uri);
  const col = mongoose.connection.db.collection('universities');

  let willWrite = 0;
  for (const [shortName, campuses] of Object.entries(DATA)) {
    const u = await col.findOne({ shortName });
    if (!u) {
      console.log(`BO QUA  ${shortName.padEnd(8)} khong co trong DB`);
      continue;
    }
    const has = (u.campuses || []).length;
    if (has > 0) {
      console.log(`BO QUA  ${shortName.padEnd(8)} da co ${has} co so`);
      continue;
    }
    console.log(`SE THEM ${shortName.padEnd(8)} ${campuses.length} co so`);
    campuses.forEach((c) => console.log(`          ${c.code.padEnd(5)} ${c.address}`));
    willWrite++;

    if (APPLY) await col.updateOne({ _id: u._id }, { $set: { campuses } });
  }

  console.log(APPLY ? `\nDa ghi ${willWrite} truong.` : `\nChay kho. Them --apply de ghi ${willWrite} truong.`);
  await mongoose.disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
