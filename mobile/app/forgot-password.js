import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Callout, Field, OtpInput, Rule } from '../src/components/ui';
import client from '../src/api/client';
import { useTheme, useThemedStyles } from '../src/store/theme';

export default function ForgotPassword() {
  const t = useTheme();
  const s = useThemedStyles(styles);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();

  // 'email' → 'code' → 'password' → 'done'
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState(params.email ? String(params.email) : '');
  const [code, setCode] = useState('');
  const [ticket, setTicket] = useState('');
  const [password, setPassword] = useState('');
  const [devCode, setDevCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  /**
   * Đếm ngược tới lúc gửi lại được. Backend chặn gửi lại trong 60 giây,
   * nên nếu không đếm ngược thì người dùng bấm "Gửi lại" và nhận một lỗi
   * khó hiểu — họ tưởng app hỏng chứ không biết là phải chờ.
   */
  const [cooldown, setCooldown] = useState(0);
  const timer = useRef(null);

  const startCooldown = (seconds = 60) => {
    setCooldown(seconds);
    clearInterval(timer.current);
    timer.current = setInterval(() => {
      setCooldown((n) => {
        if (n <= 1) {
          clearInterval(timer.current);
          return 0;
        }
        return n - 1;
      });
    }, 1000);
  };

  useEffect(() => () => clearInterval(timer.current), []);

  const request = async () => {
    setError('');
    if (!email.trim()) {
      setError('Nhập email bạn dùng để đăng nhập');
      return;
    }

    setLoading(true);
    try {
      const { data } = await client.post('/auth/password/request', { email: email.trim() });
      setDevCode(data.data?.devCode || '');
      setCode('');
      setStep('code');
      startCooldown(60);
    } catch (e) {
      setError(e.message || 'Không gửi được mã');
      if (e.retryAfterSeconds) startCooldown(e.retryAfterSeconds);
    } finally {
      setLoading(false);
    }
  };

  const verify = async (value = code) => {
    setError('');
    if (value.length !== 6) {
      setError('Mã xác thực gồm 6 chữ số');
      return;
    }

    setLoading(true);
    try {
      const { data } = await client.post('/auth/password/verify', {
        email: email.trim(),
        code: value,
      });
      setTicket(data.data.ticket);
      setStep('password');
    } catch (e) {
      setError(e.message || 'Mã không đúng');
    } finally {
      setLoading(false);
    }
  };

  const reset = async () => {
    setError('');
    if (password.length < 8) {
      setError('Mật khẩu cần ít nhất 8 ký tự');
      return;
    }

    setLoading(true);
    try {
      await client.post('/auth/password/reset', { ticket, password });
      setStep('done');
    } catch (e) {
      setError(e.message || 'Không đặt lại được mật khẩu');
      // Vé hỏng thì quay về bước nhập mã, không để người dùng bấm vô vọng
      if (['TICKET_INVALID', 'TICKET_STALE'].includes(e.code)) setStep('code');
    } finally {
      setLoading(false);
    }
  };

  const HEAD = {
    email: { title: 'Quên mật khẩu', sub: 'Nhập email bạn dùng để đăng nhập Cantea.' },
    code: { title: 'Nhập mã', sub: `Mã 6 số vừa được gửi tới ${email}` },
    password: { title: 'Mật khẩu mới', sub: 'Chọn mật khẩu bạn chưa từng dùng ở đâu khác.' },
    done: { title: 'Xong', sub: 'Mật khẩu đã được đặt lại.' },
  }[step];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: t.colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          s.scroll,
          { paddingTop: insets.top + t.spacing.sm, paddingBottom: insets.bottom + t.spacing.xl },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable
          onPress={() => (step === 'email' || step === 'done' ? router.back() : setStep('email'))}
          style={s.back}
          hitSlop={8}
        >
          <Text style={s.backText}>{step === 'email' || step === 'done' ? '← Quay lại' : '← Sửa email'}</Text>
        </Pressable>

        <Text style={s.title}>{HEAD.title}</Text>
        <Rule style={{ marginBottom: t.spacing.sm }} />
        <Text style={s.sub}>{HEAD.sub}</Text>

        {Boolean(error) && (
          <Callout tone="warn" style={{ marginTop: t.spacing.md }}>
            {error}
          </Callout>
        )}

        {step === 'email' && (
          <>
            <Field
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="ban@gmail.com"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              onSubmitEditing={request}
              returnKeyType="send"
            />
            <Button title="Gửi mã đặt lại" onPress={request} loading={loading} />
          </>
        )}

        {step === 'code' && (
          <>
            {Boolean(devCode) && (
              <View style={s.dev}>
                <Text style={s.devLabel}>CHẾ ĐỘ PHÁT TRIỂN</Text>
                <Text style={s.devCode}>{devCode}</Text>
              </View>
            )}

            <OtpInput
              value={code}
              onChange={(v) => {
                setCode(v);
                // Tự xác nhận khi gõ đủ 6 số — không bắt bấm thêm nút
                if (v.length === 6) verify(v);
              }}
              autoFocus
            />
            <Text style={s.hint}>Mã có hiệu lực trong 15 phút</Text>

            <Button
              title="Xác nhận"
              onPress={() => verify()}
              loading={loading}
              disabled={code.length !== 6}
            />

            <Pressable
              onPress={cooldown > 0 ? undefined : request}
              disabled={cooldown > 0}
              style={s.linkRow}
              hitSlop={6}
            >
              {cooldown > 0 ? (
                <Text style={s.linkMuted}>Gửi lại sau {cooldown} giây</Text>
              ) : (
                <Text style={s.linkText}>
                  Chưa nhận được mã? <Text style={s.link}>Gửi lại</Text>
                </Text>
              )}
            </Pressable>
          </>
        )}

        {step === 'password' && (
          <>
            <Field
              label="Mật khẩu mới"
              value={password}
              onChangeText={setPassword}
              placeholder="Ít nhất 8 ký tự"
              hint="Đặt lại mật khẩu sẽ đăng xuất mọi thiết bị khác đang dùng tài khoản này."
              secureTextEntry
              autoCapitalize="none"
              textContentType="newPassword"
              onSubmitEditing={reset}
              returnKeyType="go"
              autoFocus
            />
            <Button title="Đặt lại mật khẩu" onPress={reset} loading={loading} />
          </>
        )}

        {step === 'done' && (
          <>
            <Callout style={{ marginTop: t.spacing.lg }}>
              Mật khẩu mới đã có hiệu lực. Mọi thiết bị khác đang đăng nhập tài khoản này
              đã bị đăng xuất.
            </Callout>
            <Button title="Đăng nhập" onPress={() => router.replace('/login')} />
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = (t) =>
  StyleSheet.create({
  scroll: { paddingHorizontal: t.spacing.screen, flexGrow: 1 },
  back: { paddingVertical: t.spacing.sm, marginBottom: t.spacing.sm },
  backText: { ...t.type.label, color: t.colors.ink },
  title: { ...t.type.title, color: t.colors.ink },
  sub: { ...t.type.body, color: t.colors.inkMuted },
  hint: { ...t.type.caption, color: t.colors.inkMuted, marginTop: t.spacing.sm },

  dev: {
    backgroundColor: t.colors.raised,
    borderLeftWidth: 3,
    borderLeftColor: t.colors.ink,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: t.spacing.md,
    alignItems: 'center',
  },
  devLabel: { ...t.type.eyebrow, color: t.colors.inkMuted },
  devCode: {
    fontFamily: t.fonts.extrabold,
    fontSize: 28,
    letterSpacing: 8,
    color: t.colors.ink,
    marginTop: 4,
  },

  linkRow: { alignItems: 'center', paddingVertical: t.spacing.md, marginTop: t.spacing.sm },
  linkText: { ...t.type.caption, color: t.colors.inkMuted },
  link: { fontFamily: t.fonts.bold, color: t.colors.ink },
  linkMuted: { ...t.type.caption, color: t.colors.inkMuted },
});
