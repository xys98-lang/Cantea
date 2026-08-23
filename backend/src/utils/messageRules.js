/**
 * QUY TẮC NỘI DUNG TIN NHẮN
 *
 * Quyền tính theo TỪNG NGƯỜI GỬI, không theo hội thoại. Trong cùng một
 * cuộc trò chuyện, người đã công khai gửi được ảnh và link, người còn
 * đang ẩn thì không.
 *
 *                     Đang ẩn danh    Đã công khai
 *   Chữ                    ✓                ✓
 *   Ảnh                    ✗                ✓
 *   Đường link             ✗                ✓
 *   Số điện thoại       cảnh báo            ✓
 *
 * Lý do: ẩn danh chỉ thật sự là ẩn danh khi không có kênh nào rò rỉ
 * danh tính. Ảnh mang siêu dữ liệu vị trí, khuôn mặt, nét chữ, phông
 * nền phòng trọ. Link mang mã theo dõi và có thể dẫn tới trang thu thập
 * thông tin. Chặn cả hai là điều kiện để lời hứa ẩn danh có nghĩa.
 *
 * Muốn gửi thì phải công khai — và đó là đánh đổi công bằng, người dùng
 * tự quyết. Công khai rồi thì không quay lại ẩn được nữa, nên quyết
 * định đó phải được nói rõ trước khi họ bấm.
 */

const URL_PATTERNS = [
  /https?:\/\/\S+/i,
  /\bwww\.[a-z0-9-]+\.\S+/i,
  /\b[a-z0-9][a-z0-9-]{1,}\.(com|vn|net|org|io|me|co|info|biz|app|shop|site|online|store|link|xyz|top|cc|ly|gl|be)\b/i,
];

export const findLinks = (text) => {
  const t = String(text || '');
  // Người cố né bộ lọc hay viết "abc (chấm) com"
  const normalized = t
    .replace(/\s*\(\s*(chấm|cham|dot|\.)\s*\)\s*/gi, '.')
    .replace(/\s*\[\s*(chấm|cham|dot|\.)\s*\]\s*/gi, '.')
    .replace(/\s+(chấm|dot)\s+/gi, '.');

  return URL_PATTERNS.some((re) => re.test(normalized) || re.test(t));
};

export const findContactInfo = (text) => {
  const t = String(text || '');
  const found = [];

  // Số Việt Nam: gộp chữ số trước để bắt cả "090 123 4567" và "090.123.4567"
  const digits = t.replace(/[^\d+]/g, '');
  if (/(?:\+84|84|0)\d{9,10}/.test(digits) && digits.replace(/\D/g, '').length >= 9) {
    found.push('số điện thoại');
  }
  if (/@[A-Za-z0-9._-]{3,}/.test(t)) found.push('tên tài khoản');
  if (
    /\b(zalo|telegram|tele|insta|instagram|facebook|fb|messenger|viber|wechat|line|tiktok|gmail|email)\b/i.test(
      t
    )
  ) {
    found.push('tài khoản mạng xã hội');
  }

  return [...new Set(found)];
};

/**
 * @param text        nội dung tin nhắn
 * @param anonymous   người GỬI đang ẩn danh trong hội thoại này
 * @param hasImages   tin nhắn có đính kèm ảnh
 * @param confirmed   người dùng đã xem cảnh báo và đồng ý gửi
 * @returns null nếu hợp lệ, hoặc object lỗi để controller trả về
 */
export const checkMessage = (text, { anonymous = true, hasImages = false, confirmed = false } = {}) => {
  // Người đã công khai không bị hạn chế gì — họ chịu trách nhiệm bằng tên mình
  if (!anonymous) return null;

  if (hasImages) {
    return {
      status: 403,
      code: 'IMAGE_REQUIRES_IDENTITY',
      message: 'Không gửi được ảnh khi đang nhắn ẩn danh.',
      detail:
        'Ảnh mang theo nhiều dấu vết hơn bạn nghĩ — vị trí chụp, khuôn mặt, ' +
        'nét chữ, phông nền phòng. Hiện danh tính để gửi được ảnh.',
      needsIdentity: true,
    };
  }

  if (findLinks(text)) {
    return {
      status: 403,
      code: 'LINK_REQUIRES_IDENTITY',
      message: 'Không gửi được đường link khi đang nhắn ẩn danh.',
      detail:
        'Link có thể mang mã theo dõi hoặc dẫn tới trang thu thập thông tin. ' +
        'Hiện danh tính để gửi được link — khi đó bạn chịu trách nhiệm bằng tên mình.',
      needsIdentity: true,
    };
  }

  const contacts = findContactInfo(text);
  if (contacts.length && !confirmed) {
    return {
      status: 409,
      code: 'CONTACT_INFO_DETECTED',
      message: `Tin nhắn này chứa ${contacts.join(' và ')}.`,
      detail:
        'Bạn đang nhắn ẩn danh, nhưng gửi đi thì đối phương biết được thông tin ' +
        'thật của bạn. Chỉ chia sẻ khi bạn đã tin tưởng người này.',
      contacts,
      canConfirm: true,
    };
  }

  return null;
};
