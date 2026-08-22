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
import { Button, Field, Notice, Rule } from '../src/components/ui';
import { useAuth } from '../src/store/auth';
import { colors, spacing, type } from '../src/theme';

export default function Login() {
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
      setError('Nhập email và mật khẩu để tiếp tục');
      return;
    }

    setLoading(true);
    try {
      await login(email.trim(), password);
      router.replace('/home');
    } catch (e) {
      setError(e.message || 'Không đăng nhập được');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          s.scroll,
          { paddingTop: insets.top + spacing.xxl, paddingBottom: insets.bottom + spacing.xl },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.header}>
          <Text style={s.wordmark}>cantea</Text>
          <Rule />
          <Text style={s.tagline}>Cộng đồng sinh viên các trường đại học</Text>
        </View>

        <Notice>{error}</Notice>

        <Field
          label="EMAIL"
          value={email}
          onChangeText={setEmail}
          placeholder="ban@gmail.com"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
        />

        <Field
          label="MẬT KHẨU"
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          secureTextEntry
          autoCapitalize="none"
          textContentType="password"
          onSubmitEditing={submit}
          returnKeyType="go"
        />

        <View style={{ marginTop: spacing.sm }}>
          <Button title="Đăng nhập" onPress={submit} loading={loading} />
        </View>

        <Pressable
          onPress={() => router.push('/register')}
          style={s.switch}
          accessibilityRole="link"
        >
          <Text style={s.switchText}>
            Chưa có tài khoản? <Text style={s.switchLink}>Đăng ký</Text>
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing.lg,
    flexGrow: 1,
  },
  header: {
    marginBottom: spacing.xl,
  },
  wordmark: {
    ...type.wordmark,
    color: colors.brandDeep,
  },
  tagline: {
    ...type.body,
    color: colors.inkMuted,
  },
  switch: {
    marginTop: spacing.lg,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  switchText: {
    ...type.caption,
    color: colors.inkMuted,
  },
  switchLink: {
    color: colors.brandDeep,
    fontWeight: '600',
  },
});
