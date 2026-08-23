/**
 * BỘ TÁCH THỜI KHOÁ BIỂU UEH
 *
 * Nguồn: daotao.ueh.edu.vn/khdt — trang tra cứu công khai, không cần đăng nhập.
 *
 * Định dạng một dòng lịch học:
 *   Thứ Tư, 07g10 - 11g30, B1-409, 25/03/2026->20/05/2026, 279 Nguyễn Tri Phương...
 *   └─ thứ ──┘  └─ giờ ──┘  └phòng┘ └─── khoảng ngày ───┘  └───── địa chỉ ─────┘
 *
 * Một lớp học phần có thể có NHIỀU dòng với khoảng ngày khác nhau — học ở
 * phòng suốt kỳ, nhưng vài buổi lẻ chuyển sang LMS hoặc ONLINE. Đây là điểm
 * mô hình dữ liệu hiện tại chưa diễn tả được, xem ghi chú ở cuối file.
 *
 * Viết theo kiểu cắm-rời: mỗi trường một bộ tách riêng, chọn theo slug.
 * Thêm trường thứ hai là thêm một file, không đụng vào lõi.
 */

const DAY_MAP = {
  'thứ hai': 2,
  'thứ ba': 3,
  'thứ tư': 4,
  'thứ năm': 5,
  'thứ sáu': 6,
  'thứ bảy': 7,
  'chủ nhật': 8,
};

/** Phòng ảo — không có địa điểm thật, không cần hiện trên lưới */
const VIRTUAL_ROOMS = ['LMS', 'ONLINE', 'ELEARNING', 'MSTEAMS', 'ZOOM'];

/**
 * Một dòng lịch học. Phần địa chỉ để lỏng vì nó chứa dấu phẩy,
 * ngoặc vuông và cả địa chỉ cũ — bắt chính xác sẽ rất dễ gãy.
 */
const LINE_RE = new RegExp(
  '(Thứ\\s+(?:Hai|Ba|Tư|Năm|Sáu|Bảy)|Chủ\\s+Nhật)' + // thứ
    '\\s*,\\s*' +
    '(\\d{1,2})g(\\d{2})\\s*-\\s*(\\d{1,2})g(\\d{2})' + // 07g10 - 11g30
    '\\s*,\\s*' +
    '([^,]+?)' + // phòng: B1-409 | LMS | ONLINE
    '\\s*,\\s*' +
    '(\\d{2}\\/\\d{2}\\/\\d{4})\\s*->\\s*(\\d{2}\\/\\d{2}\\/\\d{4})', // khoảng ngày
  'gi'
);

/** 26D1TEC55006501 — hai số năm, chữ, số, mã môn, số lớp */
const CLASS_CODE_RE = /\b(\d{2}[A-Z]\d[A-Z]{2,4}\d{6,10})\b/;

const DATE_RE = /\b(\d{2}\/\d{2}\/\d{4})\b/;

const pad = (n) => String(n).padStart(2, '0');

const toISODate = (ddmmyyyy) => {
  const [d, m, y] = ddmmyyyy.split('/');
  return new Date(Number(y), Number(m) - 1, Number(d));
};

const daysBetween = (a, b) => Math.round((b - a) / 86400000);

/**
 * Tách mã toà nhà khỏi mã phòng.
 * "B1-409" → { building: 'B1', room: '409' }
 * "A2.301" → { building: 'A2', room: '301' }
 * "N201"   → { building: 'N',  room: '201' }
 */
const splitRoom = (raw) => {
  const value = String(raw || '').trim();

  if (!value) return { room: '', building: '', virtual: false };

  if (VIRTUAL_ROOMS.includes(value.toUpperCase())) {
    return { room: value.toUpperCase(), building: '', virtual: true };
  }

  let m = value.match(/^([A-Z]{1,2}\d?)\s*[-.]\s*(.+)$/i);
  if (m) return { room: m[2].trim(), building: m[1].toUpperCase(), virtual: false };

  m = value.match(/^([A-Z]{1,2})(\d{3,})$/i);
  if (m) return { room: m[2], building: m[1].toUpperCase(), virtual: false };

  return { room: value, building: '', virtual: false };
};

/**
 * Lấy mã cơ sở từ địa chỉ.
 * "... (Khu B1)" → "B1" · "..., Khu N" → "N"
 *
 * Trả về mã trần chứ không phải cụm "Khu B1", để khớp với
 * University.campuses[].code và so sánh được giữa các buổi học.
 */
const extractCampus = (tail) => {
  const t = String(tail || '');

  const inParens = t.match(/\(\s*Khu\s+([A-Z]\d?)\s*\)/i);
  if (inParens) return inParens[1].toUpperCase();

  const bare = t.match(/\bKhu\s+([A-Z]\d?)\b/);
  return bare ? bare[1].toUpperCase() : '';
};

/**
 * Tách một khối văn bản dán từ trang tra cứu UEH.
 *
 * @returns {{ courses: Array, warnings: Array }}
 */
export const parseUEH = (text) => {
  const raw = String(text || '');
  const warnings = [];

  if (!raw.trim()) {
    return { courses: [], warnings: ['Chưa dán nội dung nào'] };
  }

  /**
   * Cắt theo mã lớp học phần. Mỗi mã mở đầu một môn, phần văn bản
   * tới mã kế tiếp thuộc về môn đó.
   */
  const codeGlobal = new RegExp(CLASS_CODE_RE.source, 'g');
  const marks = [];
  let m;
  while ((m = codeGlobal.exec(raw)) !== null) {
    marks.push({ code: m[1], at: m.index });
  }

  // Không thấy mã nào — vẫn thử tách các dòng lịch, coi như một môn
  const blocks = marks.length
    ? marks.map((mark, i) => ({
        code: mark.code,
        text: raw.slice(mark.at, i + 1 < marks.length ? marks[i + 1].at : raw.length),
      }))
    : [{ code: '', text: raw }];

  const courses = [];

  for (const block of blocks) {
    const meetings = [];
    const oneOffs = [];
    let campus = '';

    LINE_RE.lastIndex = 0;
    let line;
    while ((line = LINE_RE.exec(block.text)) !== null) {
      const [full, dayRaw, h1, m1, h2, m2, roomRaw, fromRaw, toRaw] = line;

      const dayKey = dayRaw.toLowerCase().replace(/\s+/g, ' ').trim();
      const dayOfWeek = DAY_MAP[dayKey];
      if (!dayOfWeek) {
        warnings.push(`Không hiểu thứ: "${dayRaw}"`);
        continue;
      }

      const { room, building, virtual } = splitRoom(roomRaw);
      const from = toISODate(fromRaw);
      const to = toISODate(toRaw);

      // Phần đuôi sau khoảng ngày chứa địa chỉ và tên khu
      const tail = block.text.slice(line.index + full.length, line.index + full.length + 220);
      if (!campus) campus = extractCampus(tail);

      const entry = {
        dayOfWeek,
        startTime: `${pad(h1)}:${m1}`,
        endTime: `${pad(h2)}:${m2}`,
        campus: virtual ? '' : extractCampus(tail),
        room: virtual ? '' : room,
        building: virtual ? '' : building,
        note: virtual ? room : '',
        virtual,
        from: fromRaw,
        to: toRaw,
        spanDays: daysBetween(from, to),
      };

      /**
       * Buổi trải dài hơn một tuần là lịch học hằng tuần.
       * Buổi chỉ có một hai ngày là ngoại lệ — đổi phòng, học bù,
       * chuyển sang online. Tách riêng để không ghi đè lịch chính.
       */
      if (entry.spanDays >= 7) meetings.push(entry);
      else oneOffs.push(entry);
    }

    if (!meetings.length && !oneOffs.length) continue;

    // Không có buổi hằng tuần nào — lấy buổi lẻ dài nhất làm lịch chính
    if (!meetings.length && oneOffs.length) {
      const best = oneOffs.sort((a, b) => b.spanDays - a.spanDays)[0];
      meetings.push(best);
      oneOffs.splice(oneOffs.indexOf(best), 1);
    }

    // Gộp buổi trùng thứ và giờ — trang UEH hay lặp lại cùng một buổi
    const seen = new Set();
    const unique = meetings.filter((x) => {
      const key = `${x.dayOfWeek}-${x.startTime}-${x.endTime}-${x.room}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    courses.push({
      courseCode: block.code,
      courseName: guessName(block.text, block.code),
      campus,
      meetings: unique.map(({ virtual, spanDays, ...keep }) => keep),
      /** Buổi lẻ — hiện cho sinh viên xem chứ không đưa vào lưới */
      exceptions: oneOffs.map((x) => ({
        date: x.from,
        time: `${x.startTime}–${x.endTime}`,
        where: x.note || [x.building, x.room].filter(Boolean).join('-'),
      })),
    });
  }

  if (!courses.length) {
    warnings.push(
      'Không tìm thấy dòng lịch học nào. Kiểm tra xem bạn đã copy cả cột "Lịch học" chưa.'
    );
  }

  return { courses, warnings };
};

/**
 * Tên học phần nằm giữa mã lớp và ngày bắt đầu.
 * Trang UEH không có dấu phân cách cố định nên phải cắt theo mốc.
 */
const guessName = (text, code) => {
  let body = text;
  if (code) body = body.slice(body.indexOf(code) + code.length);

  const dateAt = body.search(DATE_RE);
  const chunk = dateAt > 0 ? body.slice(0, dateAt) : body.slice(0, 120);

  const name = chunk
    .replace(/[\t\r\n]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return name.slice(0, 120) || 'Môn chưa đặt tên';
};

/**
 * ĐIỂM MÔ HÌNH DỮ LIỆU CHƯA ĐÁP ỨNG
 *
 * Schedule.meetings hiện chỉ có thứ, giờ, phòng — không có khoảng ngày.
 * Nhưng dữ liệu thật của UEH cho thấy một môn có thể học ở B1-409 suốt
 * kỳ, riêng ngày 22/04 chuyển sang LMS và 29/04 học ONLINE.
 *
 * Hệ quả nếu bỏ qua: sinh viên thấy "B1-409" mọi thứ Tư, và ngày 29/04
 * họ đến trường trong khi lớp học online.
 *
 * Cách xử lý tạm: những buổi lẻ được trả về trong `exceptions` và hiện
 * cho sinh viên xem ở bước xem trước. Cách xử lý đúng là thêm
 * `startDate`/`endDate` vào từng meeting, cộng một collection ngoại lệ
 * theo ngày — nên làm cùng lúc với tính năng nhắc lịch.
 */
