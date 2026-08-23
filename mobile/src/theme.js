/**
 * HỆ THỐNG THIẾT KẾ CANTEA — 7 chủ đề
 *
 * Bốn chủ đề nền sáng, ba nền tối. Tất cả dùng CHUNG một bộ tên token,
 * nên màn hình không bao giờ biết mình đang ở chủ đề nào — nó chỉ gọi
 * `t.colors.ink`, còn giá trị thật do ThemeProvider quyết định.
 *
 * Thêm chủ đề mới sau này chỉ là thêm một khoá vào `palettes`.
 *
 * ═══ ĐỘ TƯƠNG PHẢN ═══
 *
 * Cả 7 chủ đề đã qua 95 phép kiểm theo chuẩn WCAG AA. Hai chỗ hụt trong
 * bản thiết kế gốc đã được chỉnh:
 *   Sớm  ink3  #8A9099 → #868C95   (2.96 → 3.12 trên nền)
 *   Giấy ink2  #6E6E6E → #6B6B6B   (4.47 → 4.68 trên khối nhạt)
 *
 * Hai token được SUY RA vì thiết kế không khai:
 *   lineStrong    viền ô nhập — trộn line với ink2 ở 38%. Cần đậm hơn
 *                 kẻ ngang, nếu không ô nhập trông như một hàng danh sách.
 *   accentPressed nút đang nhấn — trộn accent với bg ở 24%.
 *
 * ═══ GỘP TOKEN ═══
 *
 * Thiết kế dùng 23 token, code trước đây dùng 18 với cách chia khác.
 * Ba chỗ gộp lại:
 *   raised = fill        thiết kế chỉ có một bậc `alt`
 *   inkStrong = ink      thiết kế không tách tiêu đề khỏi chữ chính
 *   inkBody = inkMuted   thiết kế chỉ có hai bậc chữ mờ
 *
 * Giữ cả tên cũ để mã hiện tại không phải sửa, nhưng chúng trỏ cùng giá trị.
 */

export const palettes = {
  paper: {
    name: 'Giấy',
    group: 'sáng',
    desc: 'Trắng · mực đen',
    isDark: false,
    colors: {
      bg: '#FFFFFF',
      surface: '#FFFFFF',
      fill: '#F0F0F0',
      raised: '#F0F0F0',
      line: '#E6E6E6',
      lineStrong: '#B7B7B7',
      ink: '#141414',
      inkStrong: '#141414',
      inkBody: '#6B6B6B',
      inkMuted: '#6B6B6B',
      icon: '#8F8F8F',
      accent: '#141414',
      accentPressed: '#4C4C4C',
      onAccent: '#FFFFFF',
      inverse: '#FFFFFF',
      alert: '#D8352A',
      alertSoft: '#FCEBE9',
      alertInk: '#8E211A',
      highlight: '#F0F0F0',
      category: [
        { fg: '#0E7A57', bg: '#E3F5EE' },
        { fg: '#0F7570', bg: '#DFF2F1' },
        { fg: '#C1372F', bg: '#FBE6E4' },
        { fg: '#2547B8', bg: '#E5EBFA' },
        { fg: '#7E6210', bg: '#FAF1D9' },
      ],
    },
  },
  dawn: {
    name: 'Sớm',
    group: 'sáng',
    desc: 'Xanh nhạt',
    isDark: false,
    colors: {
      bg: '#F6F5FA',
      surface: '#FFFFFF',
      fill: '#D8DFE9',
      raised: '#D8DFE9',
      line: '#E4E6EC',
      lineStrong: '#AFB2B8',
      ink: '#212121',
      inkStrong: '#212121',
      inkBody: '#585C63',
      inkMuted: '#585C63',
      icon: '#868C95',
      accent: '#212121',
      accentPressed: '#545455',
      onAccent: '#FFFFFF',
      inverse: '#FFFFFF',
      alert: '#C43A2E',
      alertSoft: '#FBE9E7',
      alertInk: '#8C2A21',
      highlight: '#EFF0A3',
      category: [
        { fg: '#0E7350', bg: '#DFF0E8' },
        { fg: '#0E6E6A', bg: '#DCEFEE' },
        { fg: '#BC352D', bg: '#F8E4E2' },
        { fg: '#2343AF', bg: '#E2E9F6' },
        { fg: '#785D0F', bg: '#F2EFD4' },
      ],
    },
  },
  dusk: {
    name: 'Chiều',
    group: 'sáng',
    desc: 'Cam đất · mận',
    isDark: false,
    colors: {
      bg: '#FFEADB',
      surface: '#FFF7F0',
      fill: '#FFDEC7',
      raised: '#FFDEC7',
      line: '#F3DAC8',
      lineStrong: '#C6AA9A',
      ink: '#493129',
      inkStrong: '#493129',
      inkBody: '#7C5C4E',
      inkMuted: '#7C5C4E',
      icon: '#9A7F71',
      accent: '#8B597B',
      accentPressed: '#A77C92',
      onAccent: '#FFF7F0',
      inverse: '#FFF7F0',
      alert: '#B33F35',
      alertSoft: '#FBDDD8',
      alertInk: '#7E2A23',
      highlight: '#EFA3A0',
      category: [
        { fg: '#2A6046', bg: '#E4EFE6' },
        { fg: '#1F615C', bg: '#DFEEEC' },
        { fg: '#A83A31', bg: '#FBDDD8' },
        { fg: '#33507B', bg: '#E4EAF2' },
        { fg: '#7A5518', bg: '#F8EBD4' },
      ],
    },
  },
  sun: {
    name: 'Nắng',
    group: 'sáng',
    desc: 'Vàng bơ · trời',
    isDark: false,
    colors: {
      bg: '#FFF7D6',
      surface: '#FFFDF2',
      fill: '#FFF2B2',
      raised: '#FFF2B2',
      line: '#F1E4B4',
      lineStrong: '#B3B6A5',
      ink: '#23405F',
      inkStrong: '#23405F',
      inkBody: '#4E6C8D',
      inkMuted: '#4E6C8D',
      icon: '#7B8FA6',
      accent: '#33598A',
      accentPressed: '#647F9C',
      onAccent: '#FFFDF2',
      inverse: '#FFFDF2',
      alert: '#B8443A',
      alertSoft: '#FBE3DC',
      alertInk: '#7C2A22',
      highlight: '#A8C6E7',
      category: [
        { fg: '#146048', bg: '#DFF0E6' },
        { fg: '#12615C', bg: '#DDEFED' },
        { fg: '#AE3E35', bg: '#FBE3DC' },
        { fg: '#274D80', bg: '#E2EAF5' },
        { fg: '#725A10', bg: '#FBF0CE' },
      ],
    },
  },
  ink: {
    name: 'Mực',
    group: 'tối',
    desc: 'Đen xám',
    isDark: true,
    colors: {
      bg: '#0E0E10',
      surface: '#17171A',
      fill: '#232328',
      raised: '#232328',
      line: '#2A2A30',
      lineStrong: '#55555B',
      ink: '#F4F4F6',
      inkStrong: '#F4F4F6',
      inkBody: '#9A9AA2',
      inkMuted: '#9A9AA2',
      icon: '#74747C',
      accent: '#F4F4F6',
      accentPressed: '#BDBDBF',
      onAccent: '#0E0E10',
      inverse: '#0E0E10',
      alert: '#FF6B5E',
      alertSoft: '#2C1715',
      alertInk: '#FFAEA4',
      highlight: '#2E2E36',
      category: [
        { fg: '#45D6A0', bg: '#10281F' },
        { fg: '#4FD2CA', bg: '#0D2726' },
        { fg: '#FF7A6E', bg: '#2A1614' },
        { fg: '#7C9BF7', bg: '#141A2E' },
        { fg: '#F5D06A', bg: '#2A2312' },
      ],
    },
  },
  night: {
    name: 'Khuya',
    group: 'tối',
    desc: 'Navy · nâu cát',
    isDark: true,
    colors: {
      bg: '#212938',
      surface: '#2A3347',
      fill: '#374259',
      raised: '#374259',
      line: '#3A4659',
      lineStrong: '#636F82',
      ink: '#F0E4D4',
      inkStrong: '#F0E4D4',
      inkBody: '#A6B2C6',
      inkMuted: '#A6B2C6',
      icon: '#7E8AA1',
      accent: '#E3B78D',
      accentPressed: '#B49579',
      onAccent: '#212938',
      inverse: '#212938',
      alert: '#F08A7C',
      alertSoft: '#3B2320',
      alertInk: '#F7B4A9',
      highlight: '#374259',
      category: [
        { fg: '#5FD9A8', bg: '#1D3A32' },
        { fg: '#5FD2CB', bg: '#1B3A39' },
        { fg: '#F5877A', bg: '#3B2320' },
        { fg: '#8DAAF7', bg: '#26314C' },
        { fg: '#F0CE7C', bg: '#3A3324' },
      ],
    },
  },
  city: {
    name: 'Phố',
    group: 'tối',
    desc: 'Đen thật · tím',
    isDark: true,
    colors: {
      bg: '#0A0A0B',
      surface: '#131316',
      fill: '#1E1E23',
      raised: '#1E1E23',
      line: '#26262E',
      lineStrong: '#56565E',
      ink: '#F5F5F7',
      inkStrong: '#F5F5F7',
      inkBody: '#A3A3AD',
      inkMuted: '#A3A3AD',
      icon: '#70707A',
      accent: '#6B4FF0',
      accentPressed: '#543EB9',
      onAccent: '#FFFFFF',
      inverse: '#FFFFFF',
      alert: '#F0685E',
      alertSoft: '#2A1412',
      alertInk: '#F8A79D',
      highlight: '#1E1E23',
      category: [
        { fg: '#6FE8B0', bg: '#0F2E22' },
        { fg: '#5FD8D0', bg: '#0D2A29' },
        { fg: '#F29A96', bg: '#2E1614' },
        { fg: '#6FB6F7', bg: '#0E2236' },
        { fg: '#F7DC93', bg: '#2E2612' },
      ],
    },
  },
};

export const THEME_KEYS = Object.keys(palettes);

/**
 * MÀU CHUYÊN MỤC
 *
 * Năm cặp màu, mỗi cặp gồm chữ và nền. Dùng cho nhãn chuyên mục ở bảng
 * tin và ô chuyên mục ở Canlib.
 *
 * Đây là ngoại lệ có chủ ý của quy tắc "chỉ một màu duy nhất". Nhãn
 * chuyên mục nhỏ và nền rất nhạt nên không cạnh tranh với sắc đỏ cảnh
 * báo — nhưng phải giữ đúng phạm vi đó, đừng dùng màu chuyên mục cho
 * khối lớn hay nút bấm.
 *
 * Ánh xạ lấy từ màn 09 của bản thiết kế v4.0:
 *   HỌC TẬP=c1 · KÝ TÚC XÁ=c2 · CHUYỆN TRƯỜNG=c3 · VIỆC LÀM=c4 · CHÍNH THỨC=c5
 */
export const CATEGORY_COLOR = {
  Academics: 0, // HỌC TẬP        → c1
  Housing: 1, // KÝ TÚC XÁ      → c2
  CampusLife: 2, // CHUYỆN TRƯỜNG  → c3
  Jobs: 3, // VIỆC LÀM       → c4
  General: null, // Chung — không tô màu, dùng viền xám
};

/**
 * Cặp màu thứ năm dành cho huy hiệu CHÍNH THỨC. Đây không phải chuyên
 * mục mà là cờ isOfficial, nhưng dùng chung dải màu để nhìn nhất quán.
 */
export const OFFICIAL_COLOR_INDEX = 4;

/** Trả về cặp màu cho một chuyên mục, hoặc null nếu mục đó không tô màu */
export const categoryColor = (theme, key) => {
  const i = CATEGORY_COLOR[key];
  if (i === null || i === undefined) return null;
  return theme.colors.category[i] || null;
};

/** Cặp màu cho huy hiệu bài chính thức */
export const officialColor = (theme) => theme.colors.category[OFFICIAL_COLOR_INDEX] || null;

/**
 * Be Vietnam Pro — bộ phông do xưởng Việt Nam dựng, xử lý dấu chồng
 * ("ế", "ữ", "ạ") cân đối hơn hẳn phông hệ thống.
 *
 * LƯU Ý: React Native trên Android không hiểu fontWeight với phông tuỳ
 * chỉnh. Luôn dùng fontFamily, không bao giờ dùng fontWeight.
 */
export const fonts = {
  regular: 'BeVietnamPro_400Regular',
  medium: 'BeVietnamPro_500Medium',
  semibold: 'BeVietnamPro_600SemiBold',
  bold: 'BeVietnamPro_700Bold',
  extrabold: 'BeVietnamPro_800ExtraBold',
};

/** letterSpacing trong React Native tính bằng điểm tuyệt đối, không phải em */
export const type = {
  display: { fontFamily: fonts.extrabold, fontSize: 44, letterSpacing: -2.2, lineHeight: 46 },
  title: { fontFamily: fonts.extrabold, fontSize: 25, letterSpacing: -1 },
  heading: { fontFamily: fonts.bold, fontSize: 15, letterSpacing: -0.3 },
  itemTitle: { fontFamily: fonts.semibold, fontSize: 14, letterSpacing: -0.14, lineHeight: 20 },
  body: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 21 },
  label: { fontFamily: fonts.bold, fontSize: 13, letterSpacing: -0.1 },
  caption: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 19 },
  captionStrong: { fontFamily: fonts.semibold, fontSize: 11 },
  eyebrow: { fontFamily: fonts.extrabold, fontSize: 10, letterSpacing: 1.4 },
  tiny: { fontFamily: fonts.medium, fontSize: 10 },
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48, screen: 16 };

export const radius = { xs: 4, sm: 6, md: 10, lg: 12, pill: 999 };

/**
 * Hệ thống này KHÔNG dùng đổ bóng — Android chỉ có một tham số độ nổi
 * nên bóng màu thành bóng xám, hai nền tảng trông khác nhau. Thay bằng
 * đường kẻ 1px. Ở nền tối thì bóng vô nghĩa hoàn toàn.
 */
export const shadow = { card: {}, float: {} };

/**
 * ═══════════ TƯƠNG THÍCH NGƯỢC ═══════════
 * Các màn chưa chuyển sang hệ theme vẫn `import { colors } from '../theme'`.
 * Xuất chủ đề Giấy dưới tên cũ để chúng chạy tiếp — chúng sẽ không đổi màu
 * khi người dùng chọn chủ đề khác, nhưng cũng không vỡ.
 */
const p = palettes.paper.colors;
export const colors = {
  ...p,
  white: '#FFFFFF',
  brand: p.accent,
  brandDeep: p.accentPressed,
  brandSoft: p.fill,
  border: p.line,
  inkFaint: p.inkMuted,
  danger: p.alert,
  dangerSoft: p.alertSoft,
  dangerInk: p.alertInk,
  accentInk: p.inkBody,
  success: p.ink,
  successSoft: p.fill,
  successInk: p.inkBody,
  warning: p.fill,
  warningSoft: p.raised,
  warningInk: p.inkBody,
};

export const hairline = { borderBottomWidth: 1, borderBottomColor: p.line };
