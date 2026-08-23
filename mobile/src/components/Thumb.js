import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useThemedStyles } from '../store/theme';

/**
 * ẢNH CÓ BỘ NHỚ ĐỆM TRÊN ĐĨA
 *
 * <Image> của React Native chỉ giữ ảnh trong RAM, mất sạch khi đóng app.
 * Nghĩa là mỗi lần mở Canlib, cùng những tấm ảnh đó lại được tải về từ
 * đầu — một sinh viên tải khoảng 3.000 lượt ảnh mỗi tháng cho chừng 140
 * tấm ảnh khác nhau.
 *
 * expo-image giữ ảnh trên đĩa nên tải một lần dùng nhiều ngày. Băng thông
 * giảm khoảng 20 lần, đổi lại chừng 30MB bộ nhớ trên máy — không đáng kể
 * so với một video ngắn.
 *
 * Gom vào một component thay vì sửa sáu màn riêng lẻ: sau này muốn đổi
 * cách đệm, thêm ảnh mờ chờ tải, hay chuyển sang dịch vụ lưu ảnh khác
 * thì chỉ sửa ở đây.
 */

/** Chèn phép biến đổi vào URL Cloudinary để lấy đúng kích thước cần */
const sized = (url, w, h) => {
  const u = String(url || '');
  if (!u.includes('/upload/')) return u;
  return u.replace('/upload/', `/upload/w_${w},h_${h},c_fill,q_auto,f_auto/`);
};

/**
 * @param uri       URL gốc trên Cloudinary
 * @param size      cạnh vuông, tính bằng điểm
 * @param width     dùng khi ảnh không vuông
 * @param height
 * @param round     bo góc, mặc định radius.sm
 * @param icon      biểu tượng hiện khi không có ảnh
 * @param scale     hệ số nhân để lấy ảnh nét trên màn hình mật độ cao
 */
export const Thumb = ({
  uri,
  size,
  width,
  height,
  round,
  icon = 'image-outline',
  scale = 2,
  style,
  contentFit = 'cover',
}) => {
  const t = useTheme();
  const s = useThemedStyles(styles);
  const w = width ?? size ?? 64;
  const h = height ?? size ?? 64;

  const box = [s.box, { width: w, height: h, borderRadius: round ?? t.radius.sm }, style];

  if (!uri) {
    return (
      <View style={box}>
        <Ionicons name={icon} size={Math.min(26, w * 0.34)} color={t.colors.lineStrong} />
      </View>
    );
  }

  return (
    <Image
      source={{ uri: sized(uri, Math.round(w * scale), Math.round(h * scale)) }}
      style={box}
      contentFit={contentFit}
      /**
       * 'memory-disk' giữ cả trong RAM lẫn trên đĩa. Cuộn lên xuống thì
       * lấy từ RAM cho mượt, mở lại app thì lấy từ đĩa khỏi tải lại.
       */
      cachePolicy="memory-disk"
      transition={140}
      recyclingKey={uri}
    />
  );
};

/**
 * Ảnh lớn chiếm hết chiều ngang — dùng cho băng ảnh ở màn chi tiết tin.
 * Không cắt theo tỉ lệ vuông, và lấy độ phân giải cao hơn vì ảnh to.
 */
export const HeroImage = ({ uri, width, height, style }) => {
  const t = useTheme();
  const s = useThemedStyles(styles);

  if (!uri) {
    return (
      <View style={[s.box, { width, height, borderRadius: 0 }, style]}>
        <Ionicons name="image-outline" size={44} color={t.colors.lineStrong} />
      </View>
    );
  }

  return (
    <Image
      source={{ uri: sized(uri, Math.round(width * 2), Math.round(height * 2)) }}
      style={[{ width, height }, style]}
      contentFit="cover"
      cachePolicy="memory-disk"
      transition={180}
      recyclingKey={uri}
    />
  );
};

const styles = (t) =>
  StyleSheet.create({
  box: {
    backgroundColor: t.colors.fill,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
