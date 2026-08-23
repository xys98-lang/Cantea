import { useCallback, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button, Callout, Field, OtpInput, Rule } from '../src/components/ui';
import { ImageUploader } from '../src/components/ImageUploader';
import { useAuth } from '../src/store/auth';
import client from '../src/api/client';
import { useTheme, useThemedStyles } from '../src/store/theme';

const STATUS_LABEL = {
  pending: 'Đang xem xét',
  approved: 'Đã bổ sung',
  rejected: 'Không được duyệt',
};

export default function Verify() {
  const t = useTheme();
  const s = useThemedStyles(styles);
  const router = useRouter();
  const { refresh } = useAuth();
  const insets = useSafeAreaInsets();

  // 'email' → 'code', hoặc rẽ sang 'unknown' → 'sent' khi đuôi chưa hỗ trợ
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [university, setUniversity] = useState(null);
  const [devCode, setDevCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  /** Yêu cầu bổ sung trường */
  const [unknownDomain, setUnknownDomain] = useState('');
  const [uniName, setUniName] = useState('');
  const [note, setNote] = useState('');
  const [evidence, setEvidence] = useState([]);
  const [myRequests, setMyRequests] = useState([]);

  useFocusEffect(
    useCallback(() => {
      client
        .get('/domain-requests/mine')
        .then((r) => setMyRequests(r.data.data.requests || []))
        .catch(() => {});
    }, [])
  );

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
      setDevCode(data.data.devCode || '');
      setCode('');
      setStep('code');
    } catch (e) {
      /**
       * Đuôi email không nhận diện được KHÔNG phải ngõ cụt.
       *
       * Danh sách trường phần lớn điền theo quy ước chung nên chắc chắn
       * có cái sai. Nếu chỉ báo "không hỗ trợ" rồi thôi thì sinh viên
       * không biết báo cho ai, còn chúng ta không biết mình sai chỗ nào.
       * Mỗi lần từ chối phải là một lần sửa được dữ liệu.
       */
      if (e.code === 'UNKNOWN_UNIVERSITY_DOMAIN') {
        setUnknownDomain(email.trim().split('@')[1] || '');
        setStep('unknown');
      } else {
        setError(e.message || 'Không gửi được mã');
      }
    } finally {
      setLoading(false);
    }
  };

  const confirmCode = async (value = code) => {
    setError('');
    if (value.length !== 6) {
      setError('Mã xác thực gồm 6 chữ số');
      return;
    }

    setLoading(true);
    try {
      await client.post('/auth/university/confirm', { code: value });
      await refresh();
      router.replace('/community');
    } catch (e) {
      setError(e.message || 'Mã không đúng');
    } finally {
      setLoading(false);
    }
  };

  const submitRequest = async () => {
    setError('');
    if (uniName.trim().length < 3) {
      setError('Nhập tên đầy đủ của trường bạn');
      return;
    }
    if (!evidence.length) {
      setError('Thêm ít nhất một ảnh chứng minh bạn là sinh viên trường này');
      return;
    }

    setLoading(true);
    try {
      const { data } = await client.post('/domain-requests', {
        email: email.trim(),
        universityName: uniName.trim(),
        note: note.trim(),
        evidence: evidence.map((i) => ({ url: i.url, publicId: i.publicId })),
      });
      setStep('sent');
      setMyRequests((r) => [
        {
          id: data.data.id,
          domain: data.data.domain,
          status: 'pending',
          universityName: uniName,
        },
        ...r,
      ]);
    } catch (e) {
      setError(e.message || 'Không gửi được yêu cầu');
      // Đuôi vừa được bổ sung trong lúc họ điền — quay lại thử luôn
      if (e.code === 'DOMAIN_ALREADY_SUPPORTED') setStep('email');
    } finally {
      setLoading(false);
    }
  };

  const HEAD = {
    email: { title: 'Xác thực email trường', sub: null },
    code: { title: 'Nhập mã', sub: `Mã 6 số vừa gửi tới ${email}` },
    unknown: { title: 'Chưa nhận ra trường này', sub: null },
    sent: { title: 'Đã gửi yêu cầu', sub: null },
  }[step];

  const pending = myRequests.find((r) => r.status === 'pending');
  const resolved = myRequests.find((r) => r.status !== 'pending');

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
          onPress={() =>
            step === 'email' || step === 'sent' ? router.back() : setStep('email')
          }
          style={s.back}
          hitSlop={8}
        >
          <Text style={s.backText}>
            ← {step === 'email' || step === 'sent' ? 'Quay lại' : 'Sửa email'}
          </Text>
        </Pressable>

        <Text style={s.title}>{HEAD.title}</Text>
        <Rule style={{ marginBottom: t.spacing.sm }} />
        {Boolean(HEAD.sub) && <Text style={s.sub}>{HEAD.sub}</Text>}

        {Boolean(error) && (
          <Callout tone="warn" style={{ marginTop: t.spacing.md }}>
            {error}
          </Callout>
        )}

        {/* ══════ Kết quả yêu cầu trước đó ══════ */}
        {step === 'email' && Boolean(pending) && (
          <View style={s.statusCard}>
            <View style={s.statusHead}>
              <Ionicons name="time-outline" size={15} color={t.colors.inkBody} />
              <Text style={s.statusTitle}>{STATUS_LABEL[pending.status]}</Text>
            </View>
            <Text style={s.statusBody}>
              Yêu cầu bổ sung @{pending.domain} cho {pending.universityName}. Chúng tôi kiểm
              tra trong 1–2 ngày và báo lại ngay ở màn này.
            </Text>
          </View>
        )}

        {step === 'email' && !pending && Boolean(resolved) && (
          <View style={[s.statusCard, resolved.status === 'approved' && s.statusOk]}>
            <View style={s.statusHead}>
              <Ionicons
                name={resolved.status === 'approved' ? 'checkmark-circle' : 'close-circle'}
                size={15}
                color={t.colors.inkBody}
              />
              <Text style={s.statusTitle}>{STATUS_LABEL[resolved.status]}</Text>
            </View>
            <Text style={s.statusBody}>
              {resolved.resolution ||
                (resolved.status === 'approved'
                  ? `Đuôi @${resolved.domain} đã được thêm. Thử xác thực lại.`
                  : 'Yêu cầu không được duyệt.')}
            </Text>
          </View>
        )}

        {step === 'email' && (
          <>
            <View style={s.explainer}>
              <Text style={s.explainerText}>
                Nhập email do trường cấp. Cantea tự nhận ra bạn học trường nào từ đuôi mail —
                bạn không cần chọn.
              </Text>
            </View>

            <Field
              label="Email trường"
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
            <Button title="Gửi mã xác thực" onPress={requestCode} loading={loading} />
          </>
        )}

        {step === 'code' && (
          <>
            {Boolean(university?.name) && (
              <View style={s.explainer}>
                <Text style={s.explainerText}>Trường nhận diện được: {university.name}</Text>
              </View>
            )}

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
                if (v.length === 6) confirmCode(v);
              }}
              autoFocus
            />
            <Text style={s.hint}>Mã có hiệu lực trong 15 phút</Text>

            <Button
              title="Xác nhận"
              onPress={() => confirmCode()}
              loading={loading}
              disabled={code.length !== 6}
            />
          </>
        )}

        {/* ══════ Báo trường chưa có ══════ */}
        {step === 'unknown' && (
          <>
            <Callout tone="warn">
              Cantea chưa nhận ra đuôi <Text style={s.strong}>@{unknownDomain}</Text>. Có thể
              trường bạn chưa được thêm, hoặc dữ liệu của chúng tôi sai. Gửi yêu cầu để bổ
              sung — thường xong trong 1–2 ngày.
            </Callout>

            <Field
              label="Tên đầy đủ của trường"
              value={uniName}
              onChangeText={setUniName}
              placeholder="Trường Đại học Kinh tế TP.HCM"
            />

            <Text style={s.sectionLabel}>ẢNH CHỨNG MINH</Text>
            <ImageUploader
              value={evidence}
              onChange={setEvidence}
              folder="post"
              max={3}
              hint="Thẻ sinh viên, ảnh chụp hộp thư trường, hoặc giấy báo trúng tuyển."
            />

            {/*
              Nhắc che thông tin thừa. Thẻ sinh viên thường in cả số CCCD
              và ngày sinh — không cần cho việc xác minh trường, mà lộ ra
              thì thiệt cho họ. Nói trước rẻ hơn xử lý hậu quả.
            */}
            <View style={s.privacyNote}>
              <Ionicons name="shield-outline" size={15} color={t.colors.inkBody} />
              <Text style={s.privacyText}>
                Che số CCCD và những thông tin không cần thiết — chúng tôi chỉ cần thấy tên
                trường. Ảnh bị xoá khỏi máy chủ ngay khi yêu cầu được xử lý xong.
              </Text>
            </View>

            <Field
              label="Ghi chú (không bắt buộc)"
              value={note}
              onChangeText={setNote}
              placeholder="Trường mình dùng đuôi này từ khoá 2024"
              multiline
            />

            <Button title="Gửi yêu cầu" onPress={submitRequest} loading={loading} />
            <Pressable onPress={() => setStep('email')} style={s.linkRow} hitSlop={6}>
              <Text style={s.linkText}>Nhập email khác</Text>
            </Pressable>
          </>
        )}

        {step === 'sent' && (
          <>
            <Callout>
              Yêu cầu bổ sung <Text style={s.strong}>@{unknownDomain}</Text> đã được gửi. Chúng
              tôi kiểm tra trong 1–2 ngày, và khi xong bạn sẽ thấy kết quả ngay ở màn này.
            </Callout>

            <View style={s.statusCard}>
              <Text style={s.statusTitle}>Trong lúc chờ</Text>
              <Text style={s.statusBody}>
                Thời khoá biểu, bảng tin Toàn quốc và Canlib vẫn dùng được bình thường. Chỉ
                cộng đồng riêng của trường là cần xác thực.
              </Text>
            </View>

            <Button title="Về trang chủ" onPress={() => router.replace('/home')} />
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
  strong: { fontFamily: t.fonts.bold },

  sectionLabel: {
    ...t.type.eyebrow,
    color: t.colors.inkMuted,
    marginTop: t.spacing.lg,
    marginBottom: t.spacing.sm,
  },

  explainer: {
    backgroundColor: t.colors.raised,
    borderLeftWidth: 3,
    borderLeftColor: t.colors.ink,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    paddingVertical: 13,
    paddingHorizontal: 14,
    marginTop: t.spacing.md,
  },
  explainerText: { ...t.type.caption, fontSize: 12.5, lineHeight: 20, color: t.colors.inkBody },

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

  statusCard: {
    borderWidth: 1,
    borderColor: t.colors.lineStrong,
    borderRadius: t.radius.md,
    padding: t.spacing.md,
    marginTop: t.spacing.md,
  },
  statusOk: { borderColor: t.colors.ink },
  statusHead: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 5 },
  statusTitle: { ...t.type.label, color: t.colors.ink },
  statusBody: { ...t.type.caption, color: t.colors.inkMuted },

  privacyNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    backgroundColor: t.colors.raised,
    borderRadius: t.radius.sm,
    padding: 12,
    marginTop: t.spacing.md,
  },
  privacyText: { ...t.type.caption, fontSize: 11.5, color: t.colors.inkBody, flex: 1 },

  linkRow: { alignItems: 'center', paddingVertical: t.spacing.md },
  linkText: { ...t.type.label, color: t.colors.inkMuted },
});
