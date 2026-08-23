import Joi from 'joi';
import mongoose from 'mongoose';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import Listing from '../models/Listing.js';
import Post from '../models/Post.js';
import { checkMessage } from '../utils/messageRules.js';
import { logger } from '../utils/logger.js';

const MAX_LIMIT = 50;

const startSchema = Joi.object({
  contextType: Joi.string().valid('listing', 'post').required(),
  contextId: Joi.string().hex().length(24).required(),
  text: Joi.string().trim().max(1000).allow('').default(''),
  anonymous: Joi.boolean().default(true),
  confirmContact: Joi.boolean().default(false),
});

const sendSchema = Joi.object({
  text: Joi.string().trim().max(1000).allow('').default(''),
  images: Joi.array().items(Joi.string().uri()).max(3).default([]),
  confirmContact: Joi.boolean().default(false),
});

const badId = (res) =>
  res.status(400).json({ status: 'error', code: 'INVALID_ID', message: 'ID không hợp lệ' });

const err = (res, o) => res.status(o.status).json({ status: 'error', ...o });

/**
 * Nhắn tin chỉ mở cho người đã xác thực trường.
 *
 * Với chợ, đây là mức an toàn tối thiểu trước khi hẹn gặp người lạ.
 * Với bài viết, nó chặn kiểu tạo tài khoản rác rồi rải tin nhắn — kênh
 * riêng tư dễ bị lạm dụng hơn bình luận công khai nhiều.
 */
const requireVerified = (user) =>
  user.verificationStatus === 'verified'
    ? null
    : {
        status: 403,
        code: 'UNIVERSITY_VERIFICATION_REQUIRED',
        message: 'Bạn cần xác thực email trường để nhắn tin',
      };

/**
 * Thông tin hiển thị của một bên trong hội thoại.
 *
 * ẨN DANH KHÔNG CÓ NGHĨA LÀ KHÔNG CÓ TÍN HIỆU NÀO.
 *
 * Bản đầu tôi trả về đúng `{ displayName: 'Người mua', isAnonymous: true }`.
 * Nhưng người bán sắp hẹn gặp một người lạ để trao đồ và tiền — họ cần
 * biết đối phương ít nhất là sinh viên đã xác thực cùng trường, nếu không
 * họ sẽ không trả lời.
 *
 * Nên vẫn giữ ẩn danh (không tên, không id, không ảnh) nhưng kèm huy hiệu
 * đã xác thực và tên trường. Hai thông tin đó không thu hẹp được ai trong
 * hàng nghìn sinh viên, mà đủ để người bán yên tâm.
 *
 * @param showUniversity chỉ bật khi trường đã hiển nhiên từ ngữ cảnh —
 *        xem loadContext. Với bài viết toàn quốc, để lộ trường là thêm
 *        thông tin mới, có thể thu hẹp đáng kể ai là tác giả.
 */
const partyOf = (userDoc, anonymous, fallbackLabel = 'Người dùng', showUniversity = false) => {
  if (anonymous) {
    const uni = userDoc?.university;
    return {
      displayName: fallbackLabel,
      isAnonymous: true,
      avatar: null,
      isVerified: userDoc?.verificationStatus === 'verified',
      university:
        showUniversity && uni?.shortName
          ? { shortName: uni.shortName, name: uni.name }
          : null,
    };
  }

  if (!userDoc || typeof userDoc !== 'object') return null;

  return {
    id: String(userDoc._id),
    displayName: userDoc.nickname || 'Người dùng',
    avatar: userDoc.profilePhoto || null,
    major: userDoc.major || '',
    year: userDoc.year || null,
    isVerified: userDoc.verificationStatus === 'verified',
    university: userDoc.university?.shortName
      ? { shortName: userDoc.university.shortName, name: userDoc.university.name }
      : null,
    isAnonymous: false,
  };
};

const roleOf = (convo, userId) =>
  String(convo.owner?._id || convo.owner) === String(userId) ? 'owner' : 'guest';

const serializeConversation = (c, viewerId, context) => {
  const role = roleOf(c, viewerId);
  const isOwner = role === 'owner';

  const otherDoc = isOwner ? c.guest : c.owner;
  const otherAnon = isOwner ? c.guestAnonymous : c.ownerAnonymous;
  const iAmAnon = isOwner ? c.ownerAnonymous : c.guestAnonymous;

  const otherLabel =
    c.context?.type === 'post'
      ? isOwner
        ? 'Người đọc ẩn danh'
        : 'Tác giả'
      : isOwner
        ? 'Người mua ẩn danh'
        : 'Người bán';

  /**
   * Hiện tên trường khi nó không phải thông tin mới.
   *
   * Tin đăng: hai bên bắt buộc cùng trường (kiểm ở startConversation), nên
   * nói ra không thêm gì mà giúp người bán yên tâm.
   * Bài viết trường: cũng vậy.
   * Bài viết toàn quốc: KHÔNG — trường là thông tin mới, thu hẹp đáng kể.
   */
  const showUni = c.context?.type === 'listing' || context?.scope === 'university';

  return {
    id: String(c._id),
    role,
    contextType: c.context?.type,
    other: partyOf(otherDoc, otherAnon, otherLabel, showUni),

    /** Trạng thái của chính mình — quyết định gửi được ảnh và link hay không */
    iAmAnonymous: Boolean(iAmAnon),
    canReveal: Boolean(iAmAnon),
    canSendMedia: !iAmAnon,

    context: context || null,
    lastMessage: c.lastMessage?.at
      ? {
          text: c.lastMessage.text || (c.lastMessage.hasImages ? '[Ảnh]' : ''),
          at: c.lastMessage.at,
          fromMe: String(c.lastMessage.sender) === String(viewerId),
        }
      : null,
    unread: isOwner ? c.unreadOwner || 0 : c.unreadGuest || 0,
    blocked: (c.blockedBy || []).some((id) => String(id) === String(viewerId)),
    updatedAt: c.updatedAt,
  };
};

const serializeMessage = (m, viewerId) => ({
  id: String(m._id),
  text: m.isDeleted ? 'Tin nhắn đã bị xoá' : m.text || '',
  images: m.isDeleted ? [] : m.images || [],
  kind: m.kind || 'text',
  fromMe: String(m.sender) === String(viewerId),
  senderAnonymous: Boolean(m.senderAnonymous),
  isDeleted: Boolean(m.isDeleted),
  readAt: m.readAt,
  createdAt: m.createdAt,
});

/** Nạp nội dung gốc để hiện thẻ ghim trên đầu hội thoại */
const loadContext = async (type, id) => {
  if (type === 'listing') {
    const l = await Listing.findById(id).select('title images price dealType status seller');
    if (!l) return null;
    return {
      kind: 'listing',
      id: String(l._id),
      title: l.title,
      image: l.images?.[0] || null,
      price: l.price,
      dealType: l.dealType,
      status: l.status,
      ownerId: String(l.seller),
      ownerAnonymous: false, // tin đăng không bao giờ ẩn danh
    };
  }

  const p = await Post.findById(id)
    .select('+author')
    .select('title isAnonymous isDeleted author communityType');
  if (!p || p.isDeleted) return null;
  return {
    kind: 'post',
    id: String(p._id),
    title: p.title,
    image: null,
    /** Quyết định có được hiện tên trường của bên ẩn danh hay không */
    scope: p.communityType,
    ownerId: String(p.author),
    ownerAnonymous: Boolean(p.isAnonymous),
  };
};

// ===== HANDLERS =====

export const getConversations = async (req, res) => {
  const list = await Conversation.find({
    $or: [{ owner: req.user._id }, { guest: req.user._id }],
    archivedBy: { $ne: req.user._id },
  })
    .sort({ 'lastMessage.at': -1, updatedAt: -1 })
    .limit(MAX_LIMIT)
    .populate({ path: 'owner', select: 'nickname profilePhoto major year verificationStatus university', populate: { path: 'university', select: 'shortName name' } })
    .populate({ path: 'guest', select: 'nickname profilePhoto major year verificationStatus university', populate: { path: 'university', select: 'shortName name' } });

  const contexts = await Promise.all(
    list.map((c) => loadContext(c.context.type, c.context.ref).catch(() => null))
  );

  const totalUnread = list.reduce((n, c) => {
    const isOwner = roleOf(c, req.user._id) === 'owner';
    return n + (isOwner ? c.unreadOwner : c.unreadGuest);
  }, 0);

  res.status(200).json({
    status: 'success',
    data: {
      conversations: list.map((c, i) => serializeConversation(c, req.user._id, contexts[i])),
      totalUnread,
    },
  });
};

/**
 * POST /api/messages
 * Mở hội thoại cho một tin đăng hoặc một bài viết.
 */
export const startConversation = async (req, res) => {
  const { error, value } = startSchema.validate(req.body);
  if (error) {
    return err(res, { status: 400, code: 'VALIDATION_ERROR', message: error.details[0].message });
  }

  const denied = requireVerified(req.user);
  if (denied) return err(res, denied);

  const ctx = await loadContext(value.contextType, value.contextId);
  if (!ctx) {
    return err(res, {
      status: 404,
      code: 'CONTEXT_NOT_FOUND',
      message: value.contextType === 'post' ? 'Bài viết không tồn tại' : 'Tin đăng không tồn tại',
    });
  }

  if (ctx.ownerId === String(req.user._id)) {
    return err(res, {
      status: 400,
      code: 'CANNOT_MESSAGE_SELF',
      message: value.contextType === 'post' ? 'Đây là bài của bạn' : 'Đây là tin đăng của bạn',
    });
  }

  let convo = await Conversation.findOne({
    'context.ref': ctx.id,
    guest: req.user._id,
  });

  if (!convo) {
    try {
      convo = await Conversation.create({
        context: { type: ctx.kind, ref: ctx.id },
        owner: ctx.ownerId,
        guest: req.user._id,
        // Tác giả bài ẩn danh thì vẫn ẩn khi có người nhắn tới.
        // Chủ tin đăng luôn công khai.
        ownerAnonymous: ctx.ownerAnonymous,
        guestAnonymous: value.anonymous !== false,
      });
      if (ctx.kind === 'listing') {
        await Listing.updateOne({ _id: ctx.id }, { $inc: { messageCount: 1 } });
      }
    } catch (e) {
      if (e.code === 11000) {
        convo = await Conversation.findOne({ 'context.ref': ctx.id, guest: req.user._id });
      } else {
        throw e;
      }
    }
  }

  if (value.text) {
    const violation = checkMessage(value.text, {
      anonymous: convo.guestAnonymous,
      confirmed: value.confirmContact,
    });
    if (violation) return err(res, violation);

    await Message.create({
      conversation: convo._id,
      sender: req.user._id,
      text: value.text,
      senderAnonymous: convo.guestAnonymous,
    });
    convo.lastMessage = { text: value.text, sender: req.user._id, at: new Date() };
    convo.unreadOwner += 1;
    convo.archivedBy = (convo.archivedBy || []).filter(
      (id) => String(id) !== String(ctx.ownerId)
    );
    await convo.save();
  }

  const full = await Conversation.findById(convo._id)
    .populate({ path: 'owner', select: 'nickname profilePhoto major year verificationStatus university', populate: { path: 'university', select: 'shortName name' } })
    .populate({ path: 'guest', select: 'nickname profilePhoto major year verificationStatus university', populate: { path: 'university', select: 'shortName name' } });

  res.status(201).json({
    status: 'success',
    data: { conversation: serializeConversation(full, req.user._id, ctx) },
  });
};

const loadConversation = async (id, userId) => {
  if (!mongoose.isValidObjectId(id)) return { error: 'INVALID_ID' };

  const convo = await Conversation.findById(id)
    .populate({ path: 'owner', select: 'nickname profilePhoto major year verificationStatus university', populate: { path: 'university', select: 'shortName name' } })
    .populate({ path: 'guest', select: 'nickname profilePhoto major year verificationStatus university', populate: { path: 'university', select: 'shortName name' } });

  if (!convo) return { error: 'NOT_FOUND' };

  const isParty =
    String(convo.owner?._id) === String(userId) || String(convo.guest?._id) === String(userId);
  if (!isParty) return { error: 'FORBIDDEN' };

  return { convo };
};

const notFound = (res, code) =>
  res.status(code === 'NOT_FOUND' ? 404 : 403).json({
    status: 'error',
    code,
    message: code === 'NOT_FOUND' ? 'Hội thoại không tồn tại' : 'Bạn không thuộc hội thoại này',
  });

export const getMessages = async (req, res) => {
  const { convo, error } = await loadConversation(req.params.id, req.user._id);
  if (error === 'INVALID_ID') return badId(res);
  if (error) return notFound(res, error);

  const limit = Math.min(MAX_LIMIT, parseInt(req.query.limit, 10) || 30);
  const before = req.query.before ? new Date(req.query.before) : null;

  const filter = { conversation: convo._id };
  if (before && !Number.isNaN(before.getTime())) filter.createdAt = { $lt: before };

  const [messages, ctx] = await Promise.all([
    Message.find(filter).sort({ createdAt: -1 }).limit(limit).lean(),
    loadContext(convo.context.type, convo.context.ref).catch(() => null),
  ]);

  // Mở hội thoại là đã đọc
  const isOwner = roleOf(convo, req.user._id) === 'owner';
  const field = isOwner ? 'unreadOwner' : 'unreadGuest';
  if (convo[field] > 0) {
    await Conversation.updateOne({ _id: convo._id }, { $set: { [field]: 0 } });
    await Message.updateMany(
      { conversation: convo._id, sender: { $ne: req.user._id }, readAt: null },
      { $set: { readAt: new Date() } }
    );
  }

  res.status(200).json({
    status: 'success',
    data: {
      conversation: serializeConversation(convo, req.user._id, ctx),
      messages: messages.reverse().map((m) => serializeMessage(m, req.user._id)),
      hasMore: messages.length === limit,
    },
  });
};

/**
 * POST /api/messages/:id
 * Quyền gửi ảnh và link tính theo trạng thái ẩn danh CỦA NGƯỜI GỬI.
 */
export const sendMessage = async (req, res) => {
  const { error: valErr, value } = sendSchema.validate(req.body);
  if (valErr) {
    return err(res, { status: 400, code: 'VALIDATION_ERROR', message: valErr.details[0].message });
  }
  if (!value.text.trim() && !value.images.length) {
    return err(res, { status: 400, code: 'EMPTY', message: 'Nhập nội dung hoặc chọn ảnh' });
  }

  const { convo, error } = await loadConversation(req.params.id, req.user._id);
  if (error === 'INVALID_ID') return badId(res);
  if (error) return notFound(res, error);

  const isOwner = roleOf(convo, req.user._id) === 'owner';
  const iAmAnonymous = isOwner ? convo.ownerAnonymous : convo.guestAnonymous;

  const violation = checkMessage(value.text, {
    anonymous: iAmAnonymous,
    hasImages: value.images.length > 0,
    confirmed: value.confirmContact,
  });
  if (violation) return err(res, violation);

  const other = isOwner ? convo.guest._id : convo.owner._id;
  const blockedByOther = (convo.blockedBy || []).some((id) => String(id) === String(other));

  const msg = await Message.create({
    conversation: convo._id,
    sender: req.user._id,
    text: value.text,
    images: value.images,
    senderAnonymous: iAmAnonymous,
  });

  if (!blockedByOther) {
    convo.lastMessage = {
      text: value.text,
      sender: req.user._id,
      at: new Date(),
      hasImages: value.images.length > 0,
    };
    convo[isOwner ? 'unreadGuest' : 'unreadOwner'] += 1;
    convo.archivedBy = (convo.archivedBy || []).filter((id) => String(id) !== String(other));
    await convo.save();
  }

  res.status(201).json({ status: 'success', data: { message: serializeMessage(msg, req.user._id) } });
};

/**
 * POST /api/messages/:id/reveal
 *
 * MỘT CHIỀU. Đối phương đã nhìn thấy thì không quên đi được, nên giả vờ
 * thu lại là dối người dùng. Giao diện phải nói rõ điều đó trước khi bấm.
 */
export const revealIdentity = async (req, res) => {
  const { convo, error } = await loadConversation(req.params.id, req.user._id);
  if (error === 'INVALID_ID') return badId(res);
  if (error) return notFound(res, error);

  const isOwner = roleOf(convo, req.user._id) === 'owner';
  const field = isOwner ? 'ownerAnonymous' : 'guestAnonymous';
  const stamp = isOwner ? 'ownerRevealedAt' : 'guestRevealedAt';

  if (!convo[field]) {
    return err(res, {
      status: 400,
      code: 'ALREADY_REVEALED',
      message: 'Bạn đã hiện danh tính trong hội thoại này',
    });
  }

  await Conversation.updateOne(
    { _id: convo._id },
    { $set: { [field]: false, [stamp]: new Date() } }
  );

  await Message.create({
    conversation: convo._id,
    sender: req.user._id,
    kind: 'system',
    text: `${req.user.nickname || 'Người dùng'} đã hiện danh tính`,
    senderAnonymous: false,
  });

  logger.info(`Hiện danh tính trong hội thoại ${convo._id}`);

  res.status(200).json({
    status: 'success',
    message: 'Đã hiện danh tính. Giờ bạn gửi được ảnh và đường link.',
    data: { anonymous: false, canSendMedia: true },
  });
};

export const archiveConversation = async (req, res) => {
  const { convo, error } = await loadConversation(req.params.id, req.user._id);
  if (error === 'INVALID_ID') return badId(res);
  if (error) return notFound(res, error);

  await Conversation.updateOne({ _id: convo._id }, { $addToSet: { archivedBy: req.user._id } });
  res.status(200).json({ status: 'success', message: 'Đã ẩn hội thoại' });
};

export const blockConversation = async (req, res) => {
  const { convo, error } = await loadConversation(req.params.id, req.user._id);
  if (error === 'INVALID_ID') return badId(res);
  if (error) return notFound(res, error);

  const on = !(convo.blockedBy || []).some((id) => String(id) === String(req.user._id));

  await Conversation.updateOne(
    { _id: convo._id },
    on ? { $addToSet: { blockedBy: req.user._id } } : { $pull: { blockedBy: req.user._id } }
  );

  res.status(200).json({
    status: 'success',
    message: on ? 'Đã chặn. Bạn sẽ không nhận tin từ người này nữa.' : 'Đã bỏ chặn',
    data: { blocked: on },
  });
};

export const reportConversation = async (req, res) => {
  const reason = String(req.body.reason || '').trim().slice(0, 300);
  if (!reason) {
    return err(res, {
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'Cho biết vấn đề bạn gặp phải',
    });
  }

  const { convo, error } = await loadConversation(req.params.id, req.user._id);
  if (error === 'INVALID_ID') return badId(res);
  if (error) return notFound(res, error);

  await Conversation.updateOne(
    { _id: convo._id },
    { $addToSet: { reportedBy: req.user._id }, $set: { reportReason: reason } }
  );

  logger.warn(`Báo cáo hội thoại ${convo._id} bởi ${req.user._id}: ${reason}`);

  res.status(200).json({
    status: 'success',
    message: 'Đã gửi báo cáo. Chúng tôi sẽ xem xét trong 24 giờ.',
  });
};

export const getUnreadCount = async (req, res) => {
  const list = await Conversation.find({
    $or: [{ owner: req.user._id }, { guest: req.user._id }],
    archivedBy: { $ne: req.user._id },
  })
    .select('owner unreadOwner unreadGuest')
    .lean();

  const total = list.reduce((n, c) => {
    const isOwner = String(c.owner) === String(req.user._id);
    return n + (isOwner ? c.unreadOwner || 0 : c.unreadGuest || 0);
  }, 0);

  res.status(200).json({ status: 'success', data: { unread: total } });
};
