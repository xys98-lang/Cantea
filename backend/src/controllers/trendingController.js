import mongoose from 'mongoose';
import Post from '../models/Post.js';
import { computeTrending, rankDelta, postVelocity, WINDOWS } from '../services/trending.js';
import { serializePost } from '../utils/serializers.js';
import { logger } from '../utils/logger.js';

const err = (res, status, code, message) =>
  res.status(status).json({ status: 'error', code, message });

/**
 * GET /api/trending
 *
 * @query scope   'global' | 'university'
 * @query window  '6h' | '24h' | '7d'
 */
export const getTrending = async (req, res) => {
  const window = WINDOWS[req.query.window] ? req.query.window : '6h';
  const wantUni = req.query.scope === 'university';
  const verified = req.user.verificationStatus === 'verified';
  const uniId = req.user.university?._id || req.user.university || null;

  if (wantUni && (!verified || !uniId)) {
    return err(
      res,
      403,
      'UNIVERSITY_VERIFICATION_REQUIRED',
      'Xác thực email trường để xem bảng xếp hạng của trường bạn'
    );
  }

  const scope = wantUni ? 'university' : 'global';
  const { cache } = await computeTrending({ scope, universityId: uniId, window });

  /**
   * Nạp bài theo đúng thứ tự hạng.
   *
   * MongoDB trả về theo thứ tự bất kỳ nên phải sắp lại bằng Map — dùng
   * thứ tự trả về sẽ cho bảng xếp hạng lộn xộn.
   */
  const ids = cache.ranking.map((r) => r.post);
  const posts = await Post.find({ _id: { $in: ids }, isDeleted: false })
    .populate('author', 'nickname profilePhoto')
    .populate('university', 'shortName')
    .populate('topic', 'title emoji')
    .lean();

  const byId = new Map(posts.map((p) => [String(p._id), p]));

  const items = cache.ranking
    .map((r) => {
      const p = byId.get(String(r.post));
      if (!p) return null; // bài bị xoá sau lần tính gần nhất
      const delta = rankDelta(cache, r.post, r.rank);
      return {
        rank: r.rank,
        delta,
        ...serializePost(p, req.user._id),
      };
    })
    .filter(Boolean);

  const nextAt = new Date(cache.computedAt.getTime() + 20 * 60 * 1000);

  res.status(200).json({
    status: 'success',
    data: {
      scope,
      window,
      items,
      computedAt: cache.computedAt,
      nextRefreshAt: nextAt,
      /** Số phút còn lại tới lần làm mới kế tiếp, cho dòng "Làm mới sau N phút" */
      refreshInMinutes: Math.max(0, Math.ceil((nextAt - Date.now()) / 60000)),
      canSeeUniversity: verified && Boolean(uniId),
    },
  });
};

/**
 * GET /api/trending/mine
 *
 * Bài của chính mình có đang nổi không, và có lan bất thường không.
 *
 * App gọi khi mở tab Cộng đồng. Tác giả ẩn danh cần biết bài mình đang
 * lan tới đâu — vì ẩn danh thất bại không phải do hệ thống lộ tên, mà
 * do chi tiết trong bài đủ để người quen đoán ra. Càng nhiều người đọc
 * thì càng nhiều người có thể đoán.
 */
export const getMyTrending = async (req, res) => {
  const verified = req.user.verificationStatus === 'verified';
  const uniId = req.user.university?._id || req.user.university || null;

  const mine = await Post.find({
    author: req.user._id,
    isDeleted: false,
    createdAt: { $gte: new Date(Date.now() - 8 * 24 * 3600 * 1000) },
  })
    .select('+author title isAnonymous viewCount likeCount commentCount createdAt communityType university excludedFromTrending')
    .lean();

  if (!mine.length) {
    return res.status(200).json({ status: 'success', data: { alerts: [] } });
  }

  const scopes = [{ scope: 'global', universityId: null }];
  if (verified && uniId) scopes.push({ scope: 'university', universityId: uniId });

  const caches = await Promise.all(
    scopes.map((s) => computeTrending({ ...s, window: '6h' }).then((r) => r.cache))
  );

  const alerts = [];
  for (const post of mine) {
    const cache = caches.find((c) =>
      post.communityType === 'university' ? c.scope === 'university' : c.scope === 'global'
    );
    const hit = cache?.ranking.find((r) => String(r.post) === String(post._id));

    // Chưa lên bảng và cũng chưa lan nhanh thì không có gì để báo
    const velocity = await postVelocity(post);
    if (!hit && !velocity.isUnusual) continue;

    alerts.push({
      postId: String(post._id),
      title: post.title,
      isAnonymous: Boolean(post.isAnonymous),
      excluded: Boolean(post.excludedFromTrending),
      rank: hit?.rank || null,
      viewCount: post.viewCount || 0,
      hoursSincePost: Math.round(
        ((Date.now() - new Date(post.createdAt).getTime()) / 3600000) * 10
      ) / 10,
      velocity,
      /**
       * Chỉ cảnh báo bài ẩn danh. Bài công khai lan nhanh là chuyện tốt —
       * tác giả đã chọn đứng tên rồi.
       */
      shouldWarn: Boolean(post.isAnonymous) && velocity.isUnusual && !post.excludedFromTrending,
    });
  }

  res.status(200).json({ status: 'success', data: { alerts } });
};

/**
 * POST /api/trending/exclude/:postId
 *
 * Gỡ bài khỏi bảng xếp hạng. Bài vẫn nằm trong bảng tin, chỉ không được
 * đẩy lên nữa. Đảo ngược được bất cứ lúc nào.
 */
export const toggleExclude = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.postId)) {
    return err(res, 400, 'INVALID_ID', 'ID không hợp lệ');
  }

  const post = await Post.findOne({
    _id: req.params.postId,
    author: req.user._id,
    isDeleted: false,
  }).select('+author excludedFromTrending title');

  if (!post) return err(res, 404, 'POST_NOT_FOUND', 'Không tìm thấy bài viết của bạn');

  const next = req.body.excluded !== undefined ? Boolean(req.body.excluded) : !post.excludedFromTrending;
  post.excludedFromTrending = next;
  await post.save();

  logger.info(`${next ? 'Gỡ' : 'Đưa lại'} bài ${post._id} ${next ? 'khỏi' : 'vào'} bảng xếp hạng`);

  res.status(200).json({
    status: 'success',
    message: next
      ? 'Đã gỡ khỏi Đang nổi. Bài vẫn nằm trong bảng tin.'
      : 'Đã đưa bài trở lại Đang nổi.',
    data: { excluded: next },
  });
};
