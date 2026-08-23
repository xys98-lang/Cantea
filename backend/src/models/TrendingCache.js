import mongoose from 'mongoose';

/**
 * BẢNG XẾP HẠNG ĐÃ TÍNH SẴN
 *
 * Giữ lại hai thứ, và thứ hai mới là lý do chính:
 *
 *   1. Đỡ tính lại mỗi lần có người mở màn Đang nổi
 *   2. Biết được hạng lần trước, để hiện ▲4 ▼1 MỚI
 *
 * Không có bảng này thì không có cách nào biết một bài vừa lên hay xuống
 * hạng — mà đó chính là thứ khiến người ta mở lại màn Đang nổi lần sau.
 *
 * Mỗi tổ hợp phạm vi và khoảng thời gian là một bản ghi riêng: toàn quốc
 * 6 giờ, trường X 24 giờ, và cứ thế.
 */
const trendingCacheSchema = new mongoose.Schema(
  {
    /** "global:6h" hoặc "uni:<universityId>:24h" */
    key: { type: String, required: true, unique: true },

    scope: { type: String, enum: ['global', 'university'], required: true },
    university: { type: mongoose.Schema.Types.ObjectId, ref: 'University', default: null },
    window: { type: String, enum: ['6h', '24h', '7d'], required: true },

    /** Thứ hạng lần này */
    ranking: [
      {
        post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
        rank: Number,
        score: Number,
        _id: false,
      },
    ],

    /**
     * Thứ hạng lần TRƯỚC — chỉ cần cặp bài và hạng, không cần điểm.
     * Dùng để tính mũi tên lên xuống.
     */
    previous: [
      {
        post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
        rank: Number,
        _id: false,
      },
    ],

    computedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

const TrendingCache = mongoose.model('TrendingCache', trendingCacheSchema);

export default TrendingCache;
