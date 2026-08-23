import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Topic from '../models/Topic.js';
import Post from '../models/Post.js';

dotenv.config();

/**
 * Khởi tạo chủ đề theo mùa và nội dung mở màn.
 *
 * NGUYÊN TẮC: mọi bài ở đây đăng từ tài khoản chính thức Cantea và
 * mang cờ isOfficial, hiển thị kèm huy hiệu. Không giả làm bài sinh viên.
 *
 * Lý do: sinh viên đầu tiên vào một cộng đồng đầy bài "sinh viên" mà
 * không ai trả lời sẽ nhận ra ngay đó là bài dựng. Mất niềm tin ở bước
 * đó thì rất khó lấy lại. Bài chính thức có nhãn rõ ràng vẫn giải quyết
 * được bảng tin trống, mà không đánh đổi sự thành thật.
 */

const OFFICIAL_EMAIL = 'official@cantea.vn';

const TOPICS = [
  {
    slug: 'tan-sinh-vien-2026',
    title: 'Tân sinh viên 2026',
    subtitle: 'Nhập học, ký túc xá, giáo trình — hỏi gì cũng được',
    emoji: '🎒',
    color: '#6366F1',
    scope: 'global',
    // Mùa nhập học: tháng 8 đến hết tháng 10
    startsAt: new Date('2026-08-01'),
    endsAt: new Date('2026-10-31T23:59:59'),
    order: 1,
  },
  {
    slug: 'tro-tim-o-ghep',
    title: 'Tìm trọ, ở ghép',
    subtitle: 'Chia sẻ phòng trọ và tìm bạn cùng phòng',
    emoji: '🏠',
    color: '#0EA5E9',
    scope: 'global',
    startsAt: new Date('2026-07-15'),
    endsAt: new Date('2026-11-30T23:59:59'),
    order: 2,
  },
];

/** Nội dung hướng dẫn thật, viết bằng giọng của Cantea */
const OFFICIAL_POSTS = [
  {
    topicSlug: 'tan-sinh-vien-2026',
    category: 'Q&A',
    title: 'Tuần đầu nhập học cần chuẩn bị giấy tờ gì?',
    content: `Danh sách chung cho hầu hết trường ở TP.HCM. Trường bạn có thể khác một chút, nên kiểm tra lại thông báo trên cổng thông tin.

Giấy tờ thường được yêu cầu:
• Giấy báo trúng tuyển (bản gốc)
• Học bạ THPT và bằng tốt nghiệp hoặc giấy chứng nhận tốt nghiệp tạm thời
• Giấy khai sinh (bản sao)
• CCCD và bản photo công chứng
• Ảnh 3x4, thường cần 4–6 tấm
• Giấy chuyển sinh hoạt Đoàn nếu là đoàn viên
• Hồ sơ miễn giảm học phí nếu thuộc diện chính sách

Kinh nghiệm: photo công chứng mỗi loại 3 bản. Trong năm nhất bạn sẽ cần chúng nhiều lần hơn tưởng — làm thẻ ngân hàng, đăng ký ký túc xá, làm thẻ BHYT.

Trường bạn yêu cầu gì khác? Bình luận bên dưới để mọi người cùng biết.`,
  },
  {
    topicSlug: 'tan-sinh-vien-2026',
    category: 'Student Life',
    title: 'Mua giáo trình: mới, cũ, hay chờ?',
    content: `Câu hỏi tốn tiền nhất của năm nhất. Vài điều nên biết trước khi ra nhà sách.

Đừng mua hết giáo trình ngay tuần đầu. Nhiều môn giảng viên không dùng tới sách, hoặc phát tài liệu riêng. Chờ buổi đầu tiên, nghe giảng viên nói cần gì rồi mua.

Sách cũ từ khoá trước thường rẻ hơn một nửa. Kiểm tra số phiên bản trước khi mua — một số môn đổi giáo trình theo năm, nhất là các môn có số liệu như kinh tế hay kế toán.

Một số môn chỉ cần vài chương. Hỏi anh chị khoá trên xem môn nào đáng mua sách, môn nào photo phần cần là đủ.

Cantea có mục chợ đồ cũ để mua bán giáo trình giữa sinh viên. Tính năng đang được xây dựng.`,
  },
  {
    topicSlug: 'tan-sinh-vien-2026',
    category: 'Academics',
    title: 'Đăng ký học phần: ba lỗi tân sinh viên hay mắc',
    content: `Đăng ký học phần là lúc nhiều người vỡ mộng nhất trong học kỳ đầu.

Một là canh sai giờ mở cổng. Hệ thống thường quá tải ngay phút đầu. Đăng nhập sẵn trước 10 phút, mở đúng trang đăng ký, và chuẩn bị sẵn danh sách mã lớp — đừng vừa mở vừa tìm.

Hai là không có phương án dự phòng. Lớp bạn muốn có thể đầy trong 30 giây. Chuẩn bị trước 2–3 mã lớp thay thế cho mỗi môn, kèm khung giờ không đụng nhau.

Ba là đăng ký quá nhiều tín chỉ học kỳ đầu. Năm nhất còn phải làm quen với cách học đại học, sinh hoạt xa nhà, và nhiều thứ khác. Lấy vừa sức trước, học kỳ sau tăng dần.

Kinh nghiệm ở trường bạn thế nào? Chia sẻ để khoá sau đỡ vấp.`,
  },
  {
    topicSlug: 'tro-tim-o-ghep',
    category: 'Student Life',
    title: 'Xem phòng trọ: kiểm tra gì trước khi đặt cọc',
    content: `Đặt cọc rồi mới phát hiện vấn đề là chuyện rất thường gặp.

Đi xem phòng vào buổi tối nếu được. Ban ngày khó biết khu vực có ồn không, đèn đường có sáng không, hàng xóm thế nào.

Hỏi rõ giá điện nước. Nhiều nơi tính điện 4.000–5.000đ/kWh thay vì giá nhà nước. Với phòng dùng máy lạnh, khoản chênh này có thể vượt cả tiền phòng.

Kiểm tra áp lực nước và sóng điện thoại ngay trong phòng. Hai thứ này không nhìn được, phải thử.

Yêu cầu hợp đồng viết tay có chữ ký, ghi rõ tiền cọc, thời hạn, điều kiện trả phòng. Thoả thuận miệng không bảo vệ được bạn khi có tranh chấp.

Chụp ảnh hiện trạng phòng lúc nhận. Đây là bằng chứng khi trả phòng, tránh bị trừ cọc vì hư hỏng có sẵn.`,
  },
];

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Đã kết nối MongoDB');

    // Tài khoản chính thức — không dùng để đăng nhập, chỉ để gắn tác giả
    let official = await User.findOne({ email: OFFICIAL_EMAIL });
    if (!official) {
      official = await User.create({
        email: OFFICIAL_EMAIL,
        password: `cantea-official-${Date.now()}-${Math.random()}`,
        firstName: 'Cantea',
        lastName: 'Team',
        nickname: 'Cantea',
        roles: ['admin'],
        verificationStatus: 'guest',
      });
      console.log('✅ Đã tạo tài khoản chính thức');
    }

    let topicsCreated = 0;
    const topicBySlug = {};

    for (const t of TOPICS) {
      await Topic.updateOne({ slug: t.slug }, { $set: t }, { upsert: true });
      const doc = await Topic.findOne({ slug: t.slug });
      topicBySlug[t.slug] = doc;
      topicsCreated += 1;
    }
    console.log(`✅ Chủ đề: ${topicsCreated}`);

    let postsCreated = 0;
    for (const p of OFFICIAL_POSTS) {
      const exists = await Post.findOne({ title: p.title, isOfficial: true });
      if (exists) continue;

      await Post.create({
        title: p.title,
        content: p.content,
        category: p.category,
        topic: topicBySlug[p.topicSlug]?._id || null,
        author: official._id,
        isOfficial: true,
        isAnonymous: false,
        communityType: 'global',
        university: null,
        lastActivityAt: new Date(),
      });
      postsCreated += 1;
    }

    // Cập nhật lại số bài của từng chủ đề
    for (const slug of Object.keys(topicBySlug)) {
      const count = await Post.countDocuments({
        topic: topicBySlug[slug]._id,
        isDeleted: false,
      });
      await Topic.updateOne({ slug }, { $set: { postCount: count } });
    }

    console.log(`✅ Bài chính thức mới: ${postsCreated}`);
    console.log(`✅ Tổng bài toàn quốc: ${await Post.countDocuments({ communityType: 'global' })}`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error(`❌ Seed thất bại: ${error.message}`);
    process.exit(1);
  }
};

seed();
