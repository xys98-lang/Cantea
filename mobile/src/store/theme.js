import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  palettes,
  THEME_KEYS,
  categoryColor,
  fonts,
  type,
  spacing,
  radius,
  shadow,
} from '../theme';

const KEY = 'cantea.theme';

/** Chủ đề dùng khi người dùng chọn "Theo hệ thống" */
const AUTO_LIGHT = 'paper';
const AUTO_DARK = 'ink';

/**
 * "Theo hệ thống" là mặc định, và là thứ đúng cho phần lớn người dùng —
 * điện thoại đã tự chuyển sáng tối theo giờ, app nên đi theo. Sáu chủ đề
 * còn lại dành cho người muốn chọn cụ thể.
 */
export const THEME_OPTIONS = [
  { key: 'system', name: 'Theo hệ thống', group: 'tự động', desc: 'Đổi theo cài đặt máy' },
  ...THEME_KEYS.map((k) => ({
    key: k,
    name: palettes[k].name,
    group: palettes[k].group,
    desc: palettes[k].desc,
    isDark: palettes[k].isDark,
    /** Ba màu để vẽ ô xem trước trong danh sách chọn */
    swatch: [palettes[k].colors.bg, palettes[k].colors.accent, palettes[k].colors.alert],
  })),
];

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const system = useColorScheme(); // 'light' | 'dark' | null
  const [choice, setChoice] = useState('system');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((saved) => {
        // Bỏ qua giá trị lạ — có thể là chủ đề đã gỡ ở bản cập nhật trước
        if (saved && (saved === 'system' || THEME_KEYS.includes(saved))) setChoice(saved);
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const setTheme = useCallback((next) => {
    setChoice(next);
    AsyncStorage.setItem(KEY, next).catch(() => {});
  }, []);

  const activeKey =
    choice === 'system' ? (system === 'dark' ? AUTO_DARK : AUTO_LIGHT) : choice;
  const palette = palettes[activeKey] || palettes[AUTO_LIGHT];

  const value = useMemo(() => {
    const t = {
      /** Người dùng đã chọn gì — có thể là 'system' */
      choice,
      /** Chủ đề đang thực sự áp dụng */
      key: activeKey,
      name: palette.name,
      isDark: palette.isDark,
      setTheme,
      ready,

      colors: palette.colors,
      fonts,
      type,
      spacing,
      radius,
      shadow,
    };
    /** Tra cặp màu chuyên mục, trả về null nếu mục đó không tô màu */
    t.category = (key) => categoryColor(t, key);
    return t;
  }, [choice, activeKey, palette, setTheme, ready]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme phải được dùng bên trong ThemeProvider');
  return ctx;
};

/**
 * Tạo bảng style theo chủ đề hiện tại.
 *
 * VÌ SAO PHẢI LÀM VẬY
 *
 * StyleSheet.create() chạy một lần lúc nạp file và SAO CHÉP giá trị màu
 * vào style ngay lúc đó:
 *
 *   const s = StyleSheet.create({ title: { color: colors.ink } });
 *   // → { title: { color: '#141414' } }   chuỗi đã bị đóng băng
 *
 * Đổi màu lúc chạy không có tác dụng gì. Cách duy nhất là dựng lại bảng
 * style mỗi khi chủ đề đổi — nên style phải là HÀM nhận theme.
 *
 * Cách dùng:
 *
 *   const styles = (t) => StyleSheet.create({
 *     title: { ...t.type.title, color: t.colors.ink },
 *   });
 *
 *   export default function Screen() {
 *     const t = useTheme();
 *     const s = useThemedStyles(styles);
 *     return <Text style={s.title}>…</Text>;
 *   }
 *
 * LƯU Ý: hằng số có màu KHÔNG được đặt ở cấp module — ở đó `t` chưa tồn
 * tại. Chuyển chúng thành hàm nhận theme, ví dụ `const statusOf = (t) => ({…})`.
 */
export const useThemedStyles = (factory) => {
  const t = useTheme();
  return useMemo(() => factory(t), [factory, t]);
};
