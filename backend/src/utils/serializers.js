/**
 * TẦNG CHUẨN HOÁ ĐẦU RA
 *
 * Đây là cửa DUY NHẤT để Post và Comment đi ra ngoài API.
 * Không controller nào được res.json() thẳng document Mongoose.
 *
 * Quy tắc bất di bất dịch:
 *   1. Khi isAnonymous = true, trường author bị xoá hoàn toàn khỏi kết quả.
 *      Không phải ẩn ở giao diện — mà không tồn tại trong JSON.
 *   2. Mảng likes không bao giờ trả ra, vì danh sách người thích
 *      trên một bài ít tương tác có thể làm lộ tác giả.
 *   3. Chỉ trả likeCount và likedByMe.
 */

const toId = (v) => (v ? String(v._id || v) : null);

/**
 * Dựng thông tin hiển thị của người viết.
 * Trả về object KHÔNG chứa id thật khi ở chế độ ẩn danh.
 */
const buildAuthorDisplay = ({ authorDoc, isAnonymous, ordinal, isPostAuthor, isMine }) => {
  if (isAnonymous) {
    let label;
    if (isPostAuthor) label = 'Tác giả';
    else if (ordinal) label = `Ẩn danh ${ordinal}`;
    else label = 'Ẩn danh';

    return {
      // KHÔNG có id, KHÔNG có nickname, KHÔNG có ảnh đại diện
      displayName: isMine ? `${label} (bạn)` : label,
      isAnonymous: true,
      avatar: null,
    };
  }

  // Công khai: chỉ trả những trường an toàn, không trả email
  if (!authorDoc || typeof authorDoc !== 'object' || !authorDoc.nickname) {
    return { displayName: 'Người dùng đã xoá', isAnonymous: false, avatar: null };
  }

  return {
    id: toId(authorDoc),
    displayName: authorDoc.nickname,
    avatar: authorDoc.profilePhoto || null,
    isAnonymous: false,
  };
};

/**
 * @param post      Document Post (có thể đã populate 'author' khi không ẩn danh)
 * @param viewerId  _id của người đang xem
 * @param opts.likedByMe  người xem đã thích bài này chưa
 */
export const serializePost = (post, viewerId, opts = {}) => {
  if (!post) return null;

  const p = post.toObject ? post.toObject() : post;
  const authorId = toId(p.author);
  const isMine = authorId && String(authorId) === String(viewerId);

  const out = {
    id: toId(p),
    title: p.title,
    content: p.content,
    images: p.images || [],
    category: p.category,
    communityType: p.communityType,
    university: p.university && p.university.shortName
      ? { id: toId(p.university), shortName: p.university.shortName, name: p.university.name }
      : toId(p.university),
    faculty: p.faculty || null,

    author: buildAuthorDisplay({
      authorDoc: p.author,
      isAnonymous: p.isAnonymous,
      isPostAuthor: p.isAnonymous,
      isMine,
    }),

    likeCount: p.likeCount || 0,
    commentCount: p.commentCount || 0,
    views: p.views || 0,
    likedByMe: Boolean(opts.likedByMe),

    // Quyền của người xem — frontend dựa vào đây để hiện nút Xoá
    canDelete: Boolean(isMine) || Boolean(opts.isModerator),
    isMine: Boolean(isMine),

    isPinned: p.isPinned || false,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };

  // Chốt chặn cuối: dù có sai sót ở trên, hai trường này luôn bị xoá
  delete out.likes;
  delete out.anonymousParticipants;
  if (p.isAnonymous) delete out.author.id;

  return out;
};

export const serializeComment = (comment, viewerId, opts = {}) => {
  if (!comment) return null;

  const c = comment.toObject ? comment.toObject() : comment;
  const authorId = toId(c.author);
  const isMine = authorId && String(authorId) === String(viewerId);

  if (c.isDeleted) {
    return {
      id: toId(c),
      isDeleted: true,
      text: 'Bình luận đã bị xoá',
      author: { displayName: 'Đã xoá', isAnonymous: true, avatar: null },
      replyCount: c.replyCount || 0,
      createdAt: c.createdAt,
    };
  }

  const out = {
    id: toId(c),
    text: c.text,
    parentComment: toId(c.parentComment),
    replyCount: c.replyCount || 0,

    author: buildAuthorDisplay({
      authorDoc: c.author,
      isAnonymous: c.isAnonymous,
      ordinal: c.anonymousOrdinal,
      isPostAuthor: c.isPostAuthor,
      isMine,
    }),

    likeCount: c.likeCount || 0,
    likedByMe: Boolean(opts.likedByMe),
    canDelete: Boolean(isMine) || Boolean(opts.isModerator),
    isMine: Boolean(isMine),
    isDeleted: false,
    createdAt: c.createdAt,
  };

  delete out.likes;
  if (c.isAnonymous) delete out.author.id;

  return out;
};

export const serializePosts = (posts, viewerId, opts = {}) =>
  (posts || []).map((p) =>
    serializePost(p, viewerId, {
      ...opts,
      likedByMe: opts.likedPostIds
        ? opts.likedPostIds.has(String(p._id))
        : false,
    })
  );

export const serializeComments = (comments, viewerId, opts = {}) =>
  (comments || []).map((c) =>
    serializeComment(c, viewerId, {
      ...opts,
      likedByMe: opts.likedCommentIds
        ? opts.likedCommentIds.has(String(c._id))
        : false,
    })
  );
