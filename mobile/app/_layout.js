import { useEffect } from 'react';
import { Keyboard, TextInput, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  BeVietnamPro_400Regular,
  BeVietnamPro_500Medium,
  BeVietnamPro_600SemiBold,
  BeVietnamPro_700Bold,
  BeVietnamPro_800ExtraBold,
} from '@expo-google-fonts/be-vietnam-pro';
import { AuthProvider } from '../src/store/auth';
import { ThemeProvider, useTheme } from '../src/store/theme';
import { configureForeground } from '../src/services/notifications';

/**
 * Kéo bàn phím xuống nhưng ô nhập vẫn giữ focus, nên chạm lại vào chính
 * ô đó React Native coi như không có gì thay đổi. Sửa một lần ở đây thay
 * vì từng ô: bàn phím ẩn thì bỏ focus, chạm lại là mở bình thường.
 */
const useKeyboardBlurFix = () => {
  useEffect(() => {
    const shown = { at: 0 };
    const onShow = Keyboard.addListener('keyboardDidShow', () => {
      shown.at = Date.now();
    });
    const onHide = Keyboard.addListener('keyboardDidHide', () => {
      /**
       * Bỏ qua nếu bàn phím vừa mở chưa tới nửa giây.
       *
       * Trên iOS, keyboardDidHide đôi khi bắn ra ngay trong lúc bàn phím đang
       * bung lên. Gỡ focus lúc đó sẽ đóng lại chính bàn phím vừa mở — và với ô
       * nhập có autoFocus như màn xác thực, người dùng không bao giờ gõ được.
       */
      if (Date.now() - shown.at < 500) return;

      const focused = TextInput.State?.currentlyFocusedInput?.();
      if (focused) TextInput.State.blurTextInput(focused);
    });
    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, []);
};

/**
 * Tách riêng vì nó cần useTheme, mà hook đó chỉ chạy được BÊN TRONG
 * ThemeProvider. Gọi ở component cha sẽ nổ.
 */
const ThemedStack = () => {
  const t = useTheme();

  return (
    <>
      {/* Chữ trên thanh trạng thái phải đảo theo nền, nếu không sẽ chìm */}
      <StatusBar style={t.isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: t.colors.bg },
          animation: 'fade',
        }}
      />
    </>
  );
};

/**
 * Mặc định expo KHÔNG hiện thông báo khi app đang mở — coi như người dùng
 * đã biết. Nhắc giờ học thì khác: họ có thể đang mải đọc bảng tin và cần
 * bị ngắt lời. Gọi một lần lúc khởi động.
 */
configureForeground();

export default function RootLayout() {
  useKeyboardBlurFix();

  /**
   * ExtraBold 800 bắt buộc với hướng đơn sắc. Khi bảng màu chỉ còn một
   * dải xám, phân cấp thị giác đến từ độ tương phản giữa 800 và 400.
   */
  const [fontsLoaded] = useFonts({
    BeVietnamPro_400Regular,
    BeVietnamPro_500Medium,
    BeVietnamPro_600SemiBold,
    BeVietnamPro_700Bold,
    BeVietnamPro_800ExtraBold,
  });

  if (!fontsLoaded) {
    // Chưa biết theme nên dùng đen — tối chuyển sang sáng đỡ chói mắt
    // hơn sáng chuyển sang tối
    return <View style={{ flex: 1, backgroundColor: '#0F0F0F' }} />;
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <ThemedStack />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
