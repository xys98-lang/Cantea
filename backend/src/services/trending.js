import Post from '../models/Post.js';
import PostSnapshot from '../models/PostSnapshot.js';
import TrendingCache from '../models/TrendingCache.js';
import { logger } from '../utils/logger.js';

/** Khoảng thời gian xếp hạng, tính bằng giờ */
export const WINDOWS = { '6h': 6, '24h': 24, '7d': 168 };

/** Bảng tính lại sau 20 phút — khớp với dòng "Làm mới sau 20 phút" trên màn */
const CACHE_MINUTES = 20;

/** Số bài hiện trên bảng */
const TOP_N = 20;

/**
 * Chỉ xét bài đủ mới. Một bài từ tháng trước dù nhiều lượt xem cũng không
 * còn là "đang nổi" — và loại sớm giúp mỗi lần tính chỉ đụng vài trăm bài
 * thay vì toàn bộ database.
 */
const CANDIDATE_DAYS = 8;

/**
 * TRỌNG SỐ
 *
 * Bình luận nặng gấp 12 lần lượt xem, thích gấp 8.
 *
 * Lượt xem gần như miễn phí — chỉ cần lướt qua. Bấm thích tốn một cái
 * chạm. Viết bình luận tốn công thật. Nếu tính đều nhau thì bài giật tít
 * luôn thắng bài có nội dung, vì tiêu đề sốc kéo được lượt xem mà không
 * ai buồn trả lời.
 */
const W_VIEW = 1;
const W_LIKE = 8;
const W_COMMENT = 12;

/**
 * Hệ số hạ nhiệt theo tuổi bài.
 *
 * Không có nó thì bài cũ luôn thắng — chúng có nhiều giờ hơn để tích số.
 * Số mũ 1.5 lấy từ cách Hacker News làm: đủ mạnh để bài mới có cơ hội,
 * đủ nhẹ để bài hay không bị đẩy đi sau vài giờ.
 */
const GRAVITY = 1.5;

const cacheKey = (scope, uniId, window) =>
  scope === 'university' ? `uni:${uniId}:${window}` : `global:${window}`;

/**
 * Ghi lại con số hiện tại của các bài đang xét.
 *
 * Gọi ngay trước mỗi lần tính bảng, nên nó tự chạy 20 phút một lần mà
 * không cần cron. Máy chủ khởi động lại cũng không lỡ nhịp nào — đây là
 * lý do chọn cách này thay vì tác vụ định kỳ.
 */
const takeSnapshots = async (posts) => {
  if (!posts.length) return;

  const now = new Date();
  await PostSnapshot.insertMany(
    posts.map((p) => ({
      post: p._id,
      views: p.viewCount || 0,
      likes: p.likeCount || 0,
      comments: p.commentCount || 0,
      at: now,
    })),
    { ordered: false }
  ).catch((e) => logger.warn(`Chụp số đếm lỗi: ${e.message}`));
};

/**
 * Số phát sinh trong khoảng, cho từng bài.
 *
 * Lấy ảnh chụp gần mốc bắt đầu khoảng nhất, rồi trừ. Bài chưa có ảnh chụp
 * nào trước mốc đó nghĩa là nó mới hơn cả khoảng — khi đó toàn bộ số hiện
 * tại đều phát sinh trong khoảng, nên delta bằng chính tổng.
 */
const deltasFor = async (posts, hours) => {
  const since = new Date(Date.now() - hours * 3600 * 1000);
  const ids = posts.map((p) => p._id);

  const baselines = await PostSnapshot.aggregate([
    { $match: { post: { $in: ids }, at: { $lte: since } } },
    { $sort: { at: -1 } },
    {
      $group: {
        _id: '$post',
        views: { $first: '$views' },
        likes: { $first: '$likes' },
        comments: { $first: '$comments' },
      },
    },
  ]);

  const base = new Map(baselines.map((b) => [String(b._id), b]));

  return posts.map((p) => {
    const b = base.get(String(p._id));
    return {
      post: p,
      views: Math.max(0, (p.viewCount || 0) - (b?.views || 0)),
      likes: Math.max(0, (p.likeCount || 0) - (b?.likes || 0)),
      comments: Math.max(0, (p.commentCount || 0) - (b?.comments || 0)),
      /** Bài chưa có mốc nào trước khoảng nghĩa là nó vừa xuất hiện */
      isNew: !b,
    };
  });
};

const scoreOf = (d) => {
  const raw = d.views * W_VIEW + d.likes * W_LIKE + d.comments * W_COMMENT;
  if (raw <= 0) return 0;
  const ageHours = (Date.now() - new Date(d.post.createdAt).getTime()) / 3600000;
  return raw / Math.pow(ageHours + 2, GRAVITY);
};

/**
 * Tính bảng xếp hạng cho một phạm vi và khoảng thời gian.
 * @param force bỏ qua bộ nhớ đệm, dùng khi cần số mới nhất
 */
export const computeTrending = async ({ scope, universityId, window, force = false }) => {
  const hours = WINDOWS[window] || WINDOWS['6h'];
  const key = cacheKey(scope, universityId, window);

  const cached = await TrendingCache.findOne({ key });
  const fresh =
    cached && Date.now() - cached.computedAt.getTime() < CACHE_MINUTES * 60 * 1000;

  if (fresh && !force) return { cache: cached, fromCache: true };

  const filter = {
    isDeleted: false,
    /** Bài đã bị tác giả gỡ khỏi bảng — vẫn nằm trong bảng tin, chỉ không được đẩy lên */
    excludedFromTrending: { $ne: true },
    createdAt: { $gte: new Date(Date.now() - CANDIDATE_DAYS * 24 * 3600 * 1000) },
  };
  if (scope === 'university' && universityId) {
    filter.communityType = 'university';
    filter.university = universityId;
  } else {
    filter.communityType = 'global';
  }

  const posts = await Post.find(filter)
    .select('viewCount likeCount commentCount createdAt')
    .limit(600)
    .lean();

  await takeSnapshots(posts);

  const deltas = await deltasFor(posts, hours);
  const ranked = deltas
    .map((d) => ({ post: d.post._id, score: scoreOf(d) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_N)
    .map((r, i) => ({ post: r.post, rank: i + 1, score: Math.round(r.score * 100) / 100 }));

  /**
   * Hạng lần này thành hạng "lần trước" của lần sau. Chỉ ghi đè khi bảng
   * mới không rỗng — nếu không, một lần tính hụt sẽ xoá sạch lịch sử và
   * mọi bài đều thành MỚI ở lần kế tiếp.
   */
  const previous = cached?.ranking?.length
    ? cached.ranking.map((r) => ({ post: r.post, rank: r.rank }))
    : cached?.previous || [];

  const saved = await TrendingCache.findOneAndUpdate(
    { key },
    {
      $set: {
        key,
        scope,
        university: scope === 'university' ? universityId : null,
        window,
        ranking: ranked,
        previous,
        computedAt: new Date(),
      },
    },
    { upsert: true, new: true }
  );

  return { cache: saved, fromCache: false };
};

/** Chênh lệch hạng so với lần tính trước */
export const rankDelta = (cache, postId, currentRank) => {
  const before = (cache.previous || []).find((p) => String(p.post) === String(postId));
  if (!before) return { kind: 'new', value: null };
  const diff = before.rank - currentRank;
  if (diff === 0) return { kind: 'same', value: 0 };
  return { kind: diff > 0 ? 'up' : 'down', value: Math.abs(diff) };
};

/**
 * VẬN TỐC LAN CỦA MỘT BÀI
 *
 * Trả về bài này đang lan nhanh gấp mấy lần mức thường.
 *
 * Mức thường lấy theo TRUNG VỊ chứ không phải trung bình. Một bài viral
 * duy nhất kéo trung bình lên rất cao, khiến mọi bài khác trông "bình
 * thường" — mà đó lại chính là bài ta cần phát hiện. Trung vị miễn nhiễm
 * với chuyện đó.
 */
export const postVelocity = async (post) => {
  const ageHours = Math.max(
    0.5,
    (Date.now() - new Date(post.createdAt).getTime()) / 3600000
  );
  const rate = (post.viewCount || 0) / ageHours;

  const peers = await Post.find({
    isDeleted: false,
    communityType: post.communityType,
    ...(post.communityType === 'university' ? { university: post.university } : {}),
    _id: { $ne: post._id },
    createdAt: { $gte: new Date(Date.now() - 7 * 24 * 3600 * 1000) },
    viewCount: { $gt: 0 },
  })
    .select('viewCount createdAt')
    .limit(400)
    .lean();

  if (peers.length < 10) return { rate, baseline: null, ratio: null, isUnusual: false };

  const rates = peers
    .map((p) => (p.viewCount || 0) / Math.max(0.5, (Date.now() - new Date(p.createdAt).getTime()) / 3600000))
    .sort((a, b) => a - b);
  const baseline = rates[Math.floor(rates.length / 2)] || 0.1;

  const ratio = rate / Math.max(0.1, baseline);

  return {
    rate: Math.round(rate * 10) / 10,
    baseline: Math.round(baseline * 10) / 10,
    ratio: Math.round(ratio),
    /**
     * Ngưỡng cảnh báo: nhanh gấp 8 lần VÀ đã trên 300 lượt xem.
     *
     * Cần cả hai. Chỉ dựa vào tỉ lệ thì một bài 20 lượt xem trong 10 phút
     * cũng thành "gấp 15 lần" — cảnh báo lúc đó chỉ làm người ta hoang
     * mang vô cớ. Ngưỡng lượt xem đảm bảo bài đã thực sự lan.
     */
    isUnusual: ratio >= 8 && (post.viewCount || 0) >= 300,
  };
};
