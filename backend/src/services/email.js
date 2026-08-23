import { logger } from '../utils/logger.js';

/**
 * GỬI EMAIL
 *
 * Viết tách khỏi nhà cung cấp: đổi từ Resend sang SendGrid hay SMTP chỉ
 * cần thêm một adapter ở dưới, không đụng vào controller nào.
 *
 * ═══ CHƯA CẤU HÌNH THÌ IN RA TERMINAL ═══
 *
 * Không có khoá thì mã vẫn hiện trong log như trước. Nhờ vậy máy phát
 * triển chạy được ngay mà không cần tài khoản email, và quên cấu hình
 * lúc lên máy thật thì log sẽ hét lên chứ không âm thầm nuốt mất mã.
 */

const FROM = process.env.EMAIL_FROM || 'Cantea <no-reply@cantea.vn>';
const TIMEOUT_MS = 12000;

const configured = () => Boolean(process.env.RESEND_API_KEY);

/** Bọc timeout — nhà cung cấp treo thì không được kéo cả API treo theo */
const withTimeout = (promise, ms) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Nhà cung cấp email không phản hồi')), ms)
    ),
  ]);

const sendViaResend = async ({ to, subject, html, text }) => {
  const res = await withTimeout(
    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: FROM, to: [to], subject, html, text }),
    }),
    TIMEOUT_MS
  );

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Resend ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json();
};

/**
 * @returns {{ sent: boolean, devCode?: string }}
 *   sent=false nghĩa là chưa cấu hình — controller sẽ trả devCode cho app
 *   hiển thị, đúng hành vi cũ ở máy phát triển.
 */
export const sendEmail = async ({ to, subject, html, text }) => {
  if (!configured()) {
    logger.warn(`[EMAIL CHƯA CẤU HÌNH] tới ${to} · ${subject}`);
    logger.info(`[NỘI DUNG] ${text.replace(/\s+/g, ' ').slice(0, 200)}`);
    return { sent: false };
  }

  await sendViaResend({ to, subject, html, text });
  logger.info(`Đã gửi email tới ${to}: ${subject}`);
  return { sent: true };
};

/* ═══════════════════════════════════════════
   MẪU EMAIL
   ═══════════════════════════════════════════ */

/**
 * Khung chung. Dùng bảng thay vì flexbox vì Outlook không hiểu flexbox,
 * và nhiều trường ở Việt Nam dùng Outlook cho hộp thư sinh viên.
 */
const wrap = (title, body, footer) => `<!DOCTYPE html>
<html lang="vi"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F0F0F0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F0F0F0;padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#FFFFFF;border-radius:14px;overflow:hidden;">
  <tr><td style="padding:28px 28px 0;">
    <div style="font:800 22px/1 -apple-system,Segoe UI,Roboto,sans-serif;letter-spacing:-.5px;color:#141414;">cantea</div>
    <div style="margin-top:8px;height:3px;width:36px;background:#141414;border-radius:2px;display:inline-block;"></div>
    <div style="margin-top:8px;margin-left:4px;height:3px;width:11px;background:#CFCFCF;border-radius:2px;display:inline-block;"></div>
  </td></tr>
  <tr><td style="padding:22px 28px 0;">
    <div style="font:700 19px/1.35 -apple-system,Segoe UI,Roboto,sans-serif;color:#141414;">${title}</div>
  </td></tr>
  <tr><td style="padding:14px 28px 26px;font:400 14px/1.65 -apple-system,Segoe UI,Roboto,sans-serif;color:#3D3D3D;">
    ${body}
  </td></tr>
  <tr><td style="padding:16px 28px 26px;border-top:1px solid #E6E6E6;font:400 12px/1.6 -apple-system,Segoe UI,Roboto,sans-serif;color:#6E6E6E;">
    ${footer}
  </td></tr>
</table>
</td></tr></table>
</body></html>`;

const codeBlock = (code) => `
<div style="margin:20px 0;padding:18px;background:#F7F7F7;border-radius:10px;text-align:center;">
  <div style="font:800 32px/1 -apple-system,Segoe UI,Roboto,monospace;letter-spacing:10px;color:#141414;">${code}</div>
</div>`;

/**
 * CẢNH BÁO LỪA ĐẢO Ở CUỐI MỖI EMAIL CÓ MÃ
 *
 * Mã 6 số là thứ kẻ lừa đảo hay gọi điện xin — "em là bên kỹ thuật, đọc
 * giúp anh mã vừa nhận". Một dòng ở đây không chặn được hết, nhưng người
 * đã đọc rồi thì sẽ khựng lại khi có người hỏi xin.
 */
const NEVER_SHARE =
  'Cantea không bao giờ hỏi mã này qua điện thoại, tin nhắn hay mạng xã hội. ' +
  'Ai hỏi xin mã đều là lừa đảo.';

export const universityCodeEmail = (code, universityName) => ({
  subject: 'Mã xác thực email trường — Cantea',
  html: wrap(
    'Mã xác thực của bạn',
    `<p style="margin:0;">Bạn vừa yêu cầu xác thực email trường trên Cantea${
      universityName ? ` cho <b>${universityName}</b>` : ''
    }.</p>
     ${codeBlock(code)}
     <p style="margin:0;">Mã có hiệu lực trong <b>15 phút</b>.</p>
     <p style="margin:12px 0 0;">Email cá nhân của bạn vẫn giữ nguyên để đăng nhập — email trường chỉ dùng để xác nhận bạn là sinh viên.</p>`,
    `${NEVER_SHARE}<br><br>Không phải bạn yêu cầu? Bỏ qua email này, tài khoản của bạn vẫn an toàn.`
  ),
  text: `Mã xác thực Cantea: ${code}\n\nMã có hiệu lực trong 15 phút.\n\n${NEVER_SHARE}\n\nKhông phải bạn yêu cầu? Bỏ qua email này.`,
});

export const passwordResetEmail = (code) => ({
  subject: 'Mã đặt lại mật khẩu — Cantea',
  html: wrap(
    'Đặt lại mật khẩu',
    `<p style="margin:0;">Bạn vừa yêu cầu đặt lại mật khẩu Cantea.</p>
     ${codeBlock(code)}
     <p style="margin:0;">Mã có hiệu lực trong <b>15 phút</b>.</p>
     <p style="margin:12px 0 0;">Sau khi đổi mật khẩu, mọi thiết bị khác đang đăng nhập tài khoản này sẽ bị đăng xuất.</p>`,
    `${NEVER_SHARE}<br><br>Không phải bạn yêu cầu? Bỏ qua email này — mật khẩu hiện tại vẫn giữ nguyên.`
  ),
  text: `Mã đặt lại mật khẩu Cantea: ${code}\n\nMã có hiệu lực trong 15 phút.\n\n${NEVER_SHARE}\n\nKhông phải bạn yêu cầu? Bỏ qua email này, mật khẩu vẫn giữ nguyên.`,
});

/**
 * Gửi mã và trả về kết quả cho controller.
 *
 * KHÔNG ném lỗi ra ngoài. Người dùng đang chờ mã — nếu API sập vì nhà
 * cung cấp email trục trặc thì họ không hiểu chuyện gì. Trả về cờ để
 * controller nói cho đúng: "không gửi được, thử lại sau ít phút".
 */
export const deliverCode = async (to, template) => {
  try {
    const { sent } = await sendEmail({ to, ...template });
    return { ok: true, sent };
  } catch (e) {
    logger.error(`Gửi email tới ${to} thất bại: ${e.message}`);
    return { ok: false, sent: false, error: e.message };
  }
};
