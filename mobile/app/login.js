import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Callout, Field, Rule } from '../src/components/ui';
import { useAuth } from '../src/store/auth';
import { useTheme, useThemedStyles } from '../src/store/theme';

export default function Login() {
  const t = useTheme();
  const s = useThemedStyles(styles);
  const router = useRouter();
  const { login } = useAuth();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError('');

    if (!email.trim() || !password) {
      setError('Nhập email và mật khẩu để tiếp tục.');
      return;
    }

    setLoading(true);
    try {
      await login(email.trim(), password);
      router.replace('/home');
    } catch (e) {
      /**
       * Khối lỗi gọn lại một dòng và nói luôn cách sửa.
       * Đoạn ba dòng trước đây đẩy cả biểu mẫu xuống dưới, khiến người
       * dùng phải cuộn để tìm lại ô nhập vừa gõ sai.
       */
      if (e.code === 'NETWORK_ERROR' || e.code === 'TIMEOUT') {
        setError('Không kết nối được. Kiểm tra wifi rồi thử lại.');
      } else if (e.code === 'INVALID_CREDENTIALS') {
        setError('Sai email hoặc mật khẩu. Thử lại, hoặc đặt lại mật khẩu.');
      } else {
        setError(e.message || 'Không đăng nhập được.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: t.colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          s.scroll,
          { paddingTop: insets.top + t.spacing.xxl, paddingBottom: insets.bottom + t.spacing.lg },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={s.wordmark}>cantea</Text>
        <Rule style={{ marginBottom: t.spacing.md }} />
        <Text style={s.tagline}>Cộng đồng sinh viên các trường đại học TP.HCM</Text>

        {Boolean(error) && (
          <Callout tone="warn" style={{ marginTop: t.spacing.lg }}>
            {error}
          </Callout>
        )}

        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="ban@gmail.com"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
        />

        {/* "Quên mật khẩu?" đặt cạnh nhãn — đúng chỗ mắt nhìn khi bí */}
        <View style={s.pwdLabelRow}>
          <Text style={s.pwdLabel}>Mật khẩu</Text>
          <Pressable
            onPress={() =>
              router.push(
                email.trim()
                  ? `/forgot-password?email=${encodeURIComponent(email.trim())}`
                  : '/forgot-password'
              )
            }
            hitSlop={8}
          >
            <Text style={s.forgot}>Quên mật khẩu?</Text>
          </Pressable>
        </View>

        <Field
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          secureTextEntry
          autoCapitalize="none"
          textContentType="password"
          onSubmitEditing={submit}
          returnKeyType="go"
          style={{ marginTop: 0 }}
        />

        <Button title="Đăng nhập" onPress={submit} loading={loading} />

        <Pressable onPress={() => router.push('/register')} style={s.switch} hitSlop={8}>
          <Text style={s.switchText}>
            Chưa có tài khoản? <Text style={s.switchLink}>Đăng ký</Text>
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = (t) =>
  StyleSheet.create({
  scroll: { paddingHorizontal: t.spacing.screen, flexGrow: 1 },
  wordmark: { ...t.type.display, fontSize: 40, letterSpacing: -2, color: t.colors.ink },
  tagline: { ...t.type.body, color: t.colors.inkMuted },

  pwdLabelRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: t.spacing.md,
    marginBottom: t.spacing.sm,
  },
  pwdLabel: { ...t.type.label, color: t.colors.ink, flex: 1 },
  forgot: { fontFamily: t.fonts.semibold, fontSize: 12, color: t.colors.inkMuted },

  switch: { alignItems: 'center', paddingVertical: t.spacing.md, marginTop: t.spacing.sm },
  switchText: { ...t.type.caption, color: t.colors.inkMuted },
  switchLink: { fontFamily: t.fonts.bold, color: t.colors.ink },
});
