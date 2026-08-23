import mongoose from 'mongoose';

/**
 * ẢNH CHỤP SỐ ĐẾM THEO GIỜ
 *
 * Bảng xếp hạng đếm lượt xem, thích và bình luận "trong 6 giờ gần nhất".
 * Nhưng Post chỉ lưu TỔNG LUỸ KẾ từ lúc đăng — không có cách nào biết
 * 6 giờ qua có bao nhiêu.
 *
 * Cách giải: cứ một lúc lại chụp lại con số hiện tại. Số của 6 giờ qua
 * bằng số bây giờ trừ số ở ảnh chụp gần 6 giờ trước nhất.
 *
 * ═══ VÌ SAO KHÔNG GHI TỪNG SỰ KIỆN ═══
 *
 * Cách bài bản là mỗi lượt xem ghi một dòng, rồi đếm theo khoảng thời
 * gian. Chính xác tuyệt đối, nhưng một bài 1.240 lượt xem sinh ra 1.240
 * dòng — và bảng đó lớn nhanh hơn tất cả phần còn lại của database cộng
 * lại. Với gói MongoDB miễn phí 512MB thì đó là tự sát.
 *
 * Ảnh chụp mỗi 20 phút cho sai số tối đa 20 phút ở hai đầu khoảng. Với
 * một bảng xếp hạng cập nhật 20 phút một lần thì sai số đó vô nghĩa.
 */
const postSnapshotSchema = new mongoose.Schema(
  {
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
    },

    /** Con số LUỸ KẾ tại thời điểm chụp, không phải số phát sinh */
    views: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },

    at: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

// Truy vấn chính: ảnh chụp gần nhất trước một mốc, của một bài
postSnapshotSchema.index({ post: 1, at: -1 });

/**
 * Tự xoá sau 8 ngày.
 *
 * Cửa sổ dài nhất là "Tuần này" nên cần giữ 7 ngày, cộng một ngày dự
 * phòng. Không có TTL thì bảng này phình vô hạn và ăn hết dung lượng —
 * đây là loại dữ liệu chỉ có giá trị khi còn mới.
 */
postSnapshotSchema.index({ at: 1 }, { expireAfterSeconds: 8 * 24 * 3600 });

const PostSnapshot = mongoose.model('PostSnapshot', postSnapshotSchema);

export default PostSnapshot;
