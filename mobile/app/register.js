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
import { useTheme, useThemedStyles } from '../src/store/theme';

export default function Register() {
  const t = useTheme();
  const s = useThemedStyles(styles);
  const router = useRouter();
  const { register } = useAuth();
  const insets = useSafeAreaInsets();

  const [form, setForm] = useState({
    lastName: '',
    firstName: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async () => {
    setError('');

    if (!form.lastName.trim() || !form.firstName.trim()) {
      setError('Nhập họ và tên của bạn');
      return;
    }
    if (!form.email.trim()) {
      setError('Nhập email để tiếp tục');
      return;
    }
    if (form.password.length < 8) {
      setError('Mật khẩu cần ít nhất 8 ký tự');
      return;
    }

    setLoading(true);
    try {
      await register({
        lastName: form.lastName.trim(),
        firstName: form.firstName.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      router.replace('/home');
    } catch (e) {
      setError(e.message || 'Không tạo được tài khoản');
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
          { paddingTop: insets.top + t.spacing.xl, paddingBottom: insets.bottom + t.spacing.xl },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={s.title}>Tạo tài khoản</Text>
        <Rule style={{ marginBottom: t.spacing.lg }} />

        <View style={s.explainer}>
          <Text style={s.explainerText}>
            Dùng email cá nhân của bạn. Email trường chỉ cần khi bạn muốn vào cộng
            đồng riêng của trường — làm sau cũng được.
          </Text>
        </View>

        <Notice>{error}</Notice>

        <View style={s.row}>
          <Field
            label="HỌ"
            value={form.lastName}
            onChangeText={set('lastName')}
            placeholder="Nguyễn"
            style={{ flex: 1, marginRight: t.spacing.sm }}
          />
          <Field
            label="TÊN"
            value={form.firstName}
            onChangeText={set('firstName')}
            placeholder="Minh"
            style={{ flex: 1 }}
          />
        </View>

        <Field
          label="EMAIL"
          value={form.email}
          onChangeText={set('email')}
          placeholder="ban@gmail.com"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
        />

        <Field
          label="MẬT KHẨU"
          value={form.password}
          onChangeText={set('password')}
          placeholder="Ít nhất 8 ký tự"
          hint="Dùng ít nhất 8 ký tự"
          secureTextEntry
          autoCapitalize="none"
          textContentType="newPassword"
          onSubmitEditing={submit}
          returnKeyType="go"
        />

        <View style={{ marginTop: t.spacing.sm }}>
          <Button title="Tạo tài khoản" onPress={submit} loading={loading} />
        </View>

        <Pressable onPress={() => router.back()} style={s.switch} accessibilityRole="link">
          <Text style={s.switchText}>
            Đã có tài khoản? <Text style={s.switchLink}>Đăng nhập</Text>
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = (t) =>
  StyleSheet.create({
  scroll: {
    paddingHorizontal: t.spacing.lg,
    flexGrow: 1,
  },
  title: {
    ...t.type.title,
    color: t.colors.ink,
  },
  explainer: {
    backgroundColor: t.colors.fill,
    borderRadius: t.radius.md,
    padding: t.spacing.md,
    marginBottom: t.spacing.lg,
  },
  explainerText: {
    ...t.type.caption,
    color: t.colors.accentPressed,
  },
  row: {
    flexDirection: 'row',
  },
  switch: {
    marginTop: t.spacing.lg,
    alignItems: 'center',
    paddingVertical: t.spacing.sm,
  },
  switchText: {
    ...t.type.caption,
    color: t.colors.inkMuted,
  },
  switchLink: {
    color: t.colors.accentPressed,
    fontWeight: '600',
  },
});
