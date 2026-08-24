import 'dotenv/config';
import mongoose from 'mongoose';
import Bookmark from '../models/Bookmark.js';

/**
 * Đổi tên trường `collection` thành `folder` trong collection bookmarks.
 *
 * Mặc định chạy khô, phải thêm --apply mới ghi: $rename là thao tác một chiều,
 * nhìn thấy con số thật trên đúng DB đang dùng trước khi ghi rẻ hơn nhiều so với
 * việc phát hiện sai sau đó.
 */
const APPLY = process.argv.includes('--apply');

/**
 * Dò nhiều tên biến môi trường vì mỗi dự án đặt một kiểu. Đoán sai sẽ khiến script
 * lặng lẽ nối vào một DB rỗng rồi báo "0 bản ghi" — một kết luận sai còn tệ hơn
 * là dừng lại và báo không tìm thấy.
 */
const uri = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.DATABASE_URL;

const COLLECTION_NAME = 'bookmarks';
const OLD = 'collection';
const NEW = 'folder';

async function main() {
  if (!uri) {
    console.error('Khong tim thay chuoi ket noi. Dat MONGO_URI trong backend/.env');
    process.exit(1);
  }

  await mongoose.connect(uri);
  const col = mongoose.connection.db.collection(COLLECTION_NAME);

  const total = await col.countDocuments({});
  const oldCount = await col.countDocuments({ [OLD]: { $exists: true } });
  const newCount = await col.countDocuments({ [NEW]: { $exists: true } });

  /**
   * $rename ghi đè im lặng lên đích. Bình thường con số này phải là 0; khác 0 nghĩa
   * là đã có ai chạy nửa chừng, và lúc đó phải xem tay chứ không nên chạy tiếp.
   */
  const conflict = await col.countDocuments({
    [OLD]: { $exists: true },
    [NEW]: { $exists: true },
  });

  /**
   * Index gắn với tên trường chứ không gắn với dữ liệu. Sau khi đổi tên, index cũ
   * trên `collection` không tự biến mất — nó ở lại, rỗng, và vẫn tốn công ghi mỗi
   * lần chèn bookmark mới.
   */
  const indexes = await col.indexes();
  const stale = indexes.filter(
    (ix) => ix.name !== '_id_' && Object.keys(ix.key).includes(OLD)
  );

  console.log(`DB                     : ${mongoose.connection.name}`);
  console.log(`Tong so bookmark       : ${total}`);
  console.log(`Con truong "${OLD}" : ${oldCount}`);
  console.log(`Da co truong "${NEW}"    : ${newCount}`);
  console.log(`Mang ca hai truong     : ${conflict}`);
  console.log(`Index can go           : ${stale.length ? stale.map((i) => i.name).join(', ') : 'khong co'}`);

  if (conflict > 0) {
    console.error('\nDUNG LAI: co ban ghi mang ca hai truong, $rename se ghi de mat du lieu.');
    await mongoose.disconnect();
    process.exit(1);
  }

  if (oldCount === 0 && newCount > 0) {
    console.log('\nDu lieu da o dang moi roi. Khong co gi de lam.');
    await mongoose.disconnect();
    return;
  }

  if (!APPLY) {
    console.log('\nDay la lan chay kho, chua ghi gi. Them --apply de thuc thi.');
    await mongoose.disconnect();
    return;
  }

  /**
   * Sao lưu bằng $out ngay trong script thay vì nhắc chạy mongodump: mongodump là
   * gói cài riêng, không phải máy nào cũng có, và một bước thủ công đứng chắn giữa
   * thì sớm muộn cũng bị bỏ qua đúng vào lần cần tới nó.
   */
  const stamp = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '');
  const backupName = `${COLLECTION_NAME}_backup_${stamp}`;
  await col.aggregate([{ $out: backupName }]).toArray();
  console.log(`\nDa sao luu sang "${backupName}" (${total} ban ghi).`);

  for (const ix of stale) {
    await col.dropIndex(ix.name);
    console.log(`Da go index ${ix.name}`);
  }

  const renamed = await col.updateMany(
    { [OLD]: { $exists: true } },
    { $rename: { [OLD]: NEW } }
  );
  console.log(`Da doi ten truong tren ${renamed.modifiedCount} ban ghi.`);

  /**
   * Không chuẩn hoá giá trị thiếu: `folder` là ObjectId bắt buộc, mọi bookmark đều
   * đã trỏ tới một bộ sưu tập. Nếu con số dưới đây khác 0 thì dữ liệu có vấn đề từ
   * trước, và cần xem tay chứ không phải điền bừa một giá trị vào.
   */
  const orphan = await col.countDocuments({ [NEW]: { $exists: false } });
  if (orphan > 0) {
    console.warn(`CANH BAO: ${orphan} ban ghi khong co truong "${NEW}". Can kiem tra tay.`);
  }

  /**
   * createIndexes chỉ tạo, không xoá. syncIndexes sẽ xoá mọi index không có trong
   * schema, kể cả index ai đó tạo tay để chữa một truy vấn chậm — việc gỡ đã làm
   * có chọn lọc ở trên rồi.
   */
  await Bookmark.createIndexes();
  console.log('Da tao index theo schema moi.');

  await mongoose.disconnect();
  console.log('\nXong.');
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
