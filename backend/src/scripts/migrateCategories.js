import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Post from '../models/Post.js';

dotenv.config();

/**
 * CHUYỂN BÀI CŨ SANG DANH SÁCH CHUYÊN MỤC MỚI
 *
 * Danh sách rút từ 7 xuống 5. Bài đã đăng vẫn giữ mục cũ trong database,
 * mà mục cũ không còn trong enum — nên mọi lần lưu lại bài đó sẽ hỏng
 * validation. Phải chuyển một lần cho sạch.
 *
 * Chạy SAU khi đã cập nhật models/Post.js.
 */
const MOVE = {
  'Q&A': 'Academics', // mọi bài đều là hỏi đáp, tách riêng không giúp lọc
  'Study Group': 'Academics', // nhóm học là chuyện học tập
  'Student Life': 'CampusLife', // đổi tên, cùng nghĩa
  Events: 'CampusLife', // sự kiện là chuyện trường
  'Book Exchange': 'General', // Canlib đã lo mảng sách vở
};

const migrate = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Đã kết nối MongoDB\n');

    /**
     * Đọc thẳng qua collection, KHÔNG qua model.
     *
     * Model đã có enum mới nên nó sẽ từ chối chính những giá trị cũ mà
     * ta đang cần tìm. Đây là bẫy kinh điển khi viết script chuyển đổi.
     */
    const raw = mongoose.connection.collection('posts');

    const before = {};
    for (const c of await raw.distinct('category')) {
      before[c] = await raw.countDocuments({ category: c });
    }

    console.log('  Trước khi chuyển:');
    Object.entries(before)
      .sort((a, b) => b[1] - a[1])
      .forEach(([k, n]) => {
        const to = MOVE[k];
        console.log(`    ${k.padEnd(16)} ${String(n).padStart(5)} bài` + (to ? `  →  ${to}` : ''));
      });

    let moved = 0;
    for (const [from, to] of Object.entries(MOVE)) {
      const r = await raw.updateMany({ category: from }, { $set: { category: to } });
      if (r.modifiedCount) {
        console.log(`\n  ✓ ${from} → ${to}: ${r.modifiedCount} bài`);
        moved += r.modifiedCount;
      }
    }

    // Bắt giá trị lạ còn sót — dữ liệu thử nghiệm hoặc lỗi nhập tay
    const VALID = ['General', 'Academics', 'Housing', 'CampusLife', 'Jobs'];
    const orphans = await raw.countDocuments({ category: { $nin: VALID } });
    if (orphans) {
      const r = await raw.updateMany(
        { category: { $nin: VALID } },
        { $set: { category: 'General' } }
      );
      console.log(`\n  ⚠️  ${r.modifiedCount} bài có mục lạ, chuyển về General`);
    }

    console.log('\n  Sau khi chuyển:');
    for (const c of VALID) {
      const n = await raw.countDocuments({ category: c });
      if (n) console.log(`    ${c.padEnd(16)} ${String(n).padStart(5)} bài`);
    }

    const total = await Post.countDocuments();
    console.log(`\n✅ Xong · ${moved} bài đổi mục · ${total} bài hợp lệ`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error(`❌ Chuyển đổi thất bại: ${error.message}`);
    process.exit(1);
  }
};

migrate();
