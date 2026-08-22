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
import client from '../src/api/client';
import { colors, radius, spacing, type } from '../src/theme';

export default function Verify() {
  const router = useRouter();
  const { refresh } = useAuth();
  const insets = useSafeAreaInsets();

  // 'email' = nhập mail trường, 'code' = nhập mã 6 số
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [university, setUniversity] = useState(null);
  const [devCode, setDevCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const requestCode = async () => {
    setError('');
    if (!email.trim()) {
      setError('Nhập email trường của bạn');
      return;
    }

    setLoading(true);
    try {
      const { data } = await client.post('/auth/university/request', {
        universityEmail: email.trim(),
      });
      setUniversity(data.data.university);
      // Ở môi trường phát triển, backend trả sẵn mã để tiện thử
      setDevCode(data.data.devCode || '');
      setStep('code');
    } catch (e) {
      setError(e.message || 'Không gửi được mã');
    } finally {
      setLoading(false);
    }
  };

  const confirmCode = async () => {
    setError('');
    if (code.trim().length !== 6) {
      setError('Mã xác thực gồm 6 chữ số');
      return;
    }

    setLoading(true);
    try {
      await client.post('/auth/university/confirm', { code: code.trim() });
      await refresh();
      router.replace('/community');
    } catch (e) {
      setError(e.message || 'Mã không đúng');
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
          { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xl },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable onPress={() => router.back()} style={s.back}>
          <Text style={s.backText}>← Quay lại</Text>
        </Pressable>

        <Text style={s.title}>Xác thực email trường</Text>
        <Rule style={{ marginBottom: spacing.lg }} />

        <Notice>{error}</Notice>

        {step === 'email' ? (
          <>
            <View style={s.explainer}>
              <Text style={s.explainerText}>
                Nhập email do trường cấp. Cantea tự nhận ra bạn học trường nào từ đuôi mail —
                bạn không cần chọn.
              </Text>
            </View>

            <Field
              label="EMAIL TRƯỜNG"
              value={email}
              onChangeText={setEmail}
              placeholder="ban@st.ueh.edu.vn"
              hint="Email cá nhân của bạn vẫn giữ nguyên để đăng nhập"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              onSubmitEditing={requestCode}
              returnKeyType="send"
            />

            <View style={{ marginTop: spacing.sm }}>
              <Button title="Gửi mã xác thực" onPress={requestCode} loading={loading} />
            </View>
          </>
        ) : (
          <>
            <View style={s.explainer}>
              <Text style={s.explainerText}>
                Đã gửi mã 6 số tới {email}
                {university?.shortName ? `\nTrường: ${university.name}` : ''}
              </Text>
            </View>

            {Boolean(devCode) && (
              <View style={s.dev}>
                <Text style={s.devLabel}>CHẾ ĐỘ PHÁT TRIỂN</Text>
                <Text style={s.devCode}>{devCode}</Text>
              </View>
            )}

            <Field
              label="MÃ XÁC THỰC"
              value={code}
              onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              keyboardType="number-pad"
              maxLength={6}
              hint="Mã có hiệu lực trong 15 phút"
              onSubmitEditing={confirmCode}
              returnKeyType="go"
            />

            <View style={{ marginTop: spacing.sm }}>
              <Button title="Xác nhận" onPress={confirmCode} loading={loading} />
            </View>

            <Pressable
              onPress={() => {
                setStep('email');
                setCode('');
                setError('');
              }}
              style={s.switch}
            >
              <Text style={s.switchText}>
                Nhập sai email? <Text style={s.switchLink}>Sửa lại</Text>
              </Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  scroll: { paddingHorizontal: spacing.lg, flexGrow: 1 },
  back: { paddingVertical: spacing.sm, marginBottom: spacing.sm },
  backText: { ...type.label, color: colors.brandDeep },
  title: { ...type.title, color: colors.ink },

  explainer: {
    backgroundColor: colors.brandSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  explainerText: { ...type.caption, color: colors.brandDeep },

  dev: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  devLabel: { ...type.micro, color: colors.accentInk },
  devCode: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 6,
    color: colors.accentInk,
    marginTop: spacing.xs,
  },

  switch: { marginTop: spacing.lg, alignItems: 'center', paddingVertical: spacing.sm },
  switchText: { ...type.caption, color: colors.inkMuted },
  switchLink: { color: colors.brandDeep, fontWeight: '600' },
});
