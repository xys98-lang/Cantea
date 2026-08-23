import { useCallback, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button, Field, Notice, Rule } from '../src/components/ui';
import { useAuth } from '../src/store/auth';
import { createPost, fetchQuota, CATEGORIES } from '../src/api/community';
import { ImageUploader } from '../src/components/ImageUploader';
import { useTheme, useThemedStyles } from '../src/store/theme';

export default function PostNew() {
  const t = useTheme();
  const s = useThemedStyles(styles);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const params = useLocalSearchParams();

  const verified = user?.verificationStatus === 'verified';
  const uni = user?.university;

  const [scope, setScope] = useState(
    params.scope === 'university' && verified ? 'university' : 'global'
  );
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('General');
  const [images, setImages] = useState([]);
  const [anonymous, setAnonymous] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [quota, setQuota] = useState(null);

  // Kiểm tra hạn mức ngay khi mở màn, không đợi tới lúc bấm Đăng
  useFocusEffect(
    useCallback(() => {
      fetchQuota().then(setQuota).catch(() => {});
    }, [])
  );

  const outOfQuota = Boolean(quota?.limited && quota.remaining <= 0);

  const submit = async () => {
    setError('');

    if (title.trim().length < 2) {
      setError('Tiêu đề cần ít nhất 2 ký tự');
      return;
    }
    if (!content.trim()) {
      setError('Nhập nội dung bài viết');
      return;
    }

    setSaving(true);
    try {
      await createPost({
        title: title.trim(),
        content: content.trim(),
        category,
        isAnonymous: anonymous,
        communityType: scope,
        images: images.map((img) => img.url),
      });
      router.back();
    } catch (e) {
      setError(e.message || 'Không đăng được bài');
    } finally {
      setSaving(false);
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
          { paddingTop: insets.top + t.spacing.md, paddingBottom: insets.bottom + t.spacing.xl },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable onPress={() => router.back()} style={s.back} hitSlop={8}>
          <Text style={s.backText}>← Huỷ</Text>
        </Pressable>

        <Text style={s.title}>Viết bài</Text>
        <Rule style={{ marginBottom: t.spacing.lg }} />

        <Notice>{error}</Notice>

        <Text style={s.sectionLabel}>ĐĂNG VÀO</Text>
        <View style={s.segment}>
          <Pressable
            onPress={() => setScope('global')}
            style={[s.segBtn, scope === 'global' && s.segOn]}
          >
            <Text style={[s.segText, scope === 'global' && s.segTextOn]}>Toàn quốc</Text>
          </Pressable>
          <Pressable
            onPress={() => (verified ? setScope('university') : router.push('/verify'))}
            style={[s.segBtn, scope === 'university' && s.segOn]}
          >
            {!verified && (
              <Ionicons
                name="lock-closed"
                size={11}
                color={t.colors.inkMuted}
                style={{ marginRight: 4 }}
              />
            )}
            <Text style={[s.segText, scope === 'university' && s.segTextOn]}>
              {verified && uni?.shortName ? uni.shortName : 'Trường bạn'}
            </Text>
          </Pressable>
        </View>
        <Text style={s.scopeHint}>
          {scope === 'global'
            ? 'Sinh viên mọi trường đọc được bài này.'
            : `Chỉ sinh viên ${uni?.shortName || 'trường bạn'} đọc được.`}
        </Text>

        <Text style={[s.sectionLabel, { marginTop: t.spacing.lg }]}>CHUYÊN MỤC</Text>
        <View style={s.chipRow}>
          {CATEGORIES.map((c) => (
            <Pressable
              key={c.value}
              onPress={() => setCategory(c.value)}
              style={[s.chip, category === c.value && s.chipOn]}
            >
              <Text style={[s.chipText, category === c.value && s.chipTextOn]}>{c.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={{ marginTop: t.spacing.lg }}>
          <Field
            label="TIÊU ĐỀ"
            value={title}
            onChangeText={setTitle}
            placeholder="Thầy nào dạy Kinh tế vĩ mô dễ hiểu?"
            maxLength={200}
          />
        </View>

        <Text style={s.fieldLabel}>NỘI DUNG</Text>
        <TextInput
          style={s.textarea}
          value={content}
          onChangeText={setContent}
          placeholder="Viết gì đó…"
          placeholderTextColor={t.colors.inkMuted}
          multiline
          textAlignVertical="top"
          maxLength={3000}
        />
        <Text style={s.counter}>{content.length}/3000</Text>

        <Text style={s.sectionLabel}>ẢNH (KHÔNG BẮT BUỘC)</Text>
        <ImageUploader
          value={images}
          onChange={setImages}
          folder="post"
          max={5}
          hint="Ảnh giúp bài dễ được đọc hơn. Tối đa 5 ảnh, mỗi ảnh dưới 8MB."
        />

        {/* Ẩn danh bật sẵn — người dùng phải chủ động chọn lộ danh tính */}
        <Pressable onPress={() => setAnonymous((a) => !a)} style={s.anonRow}>
          <View style={[s.anonBox, anonymous && s.anonOn]}>
            {anonymous && <Ionicons name="checkmark" size={16} color={t.colors.onAccent} />}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.anonTitle}>Đăng ẩn danh</Text>
            <Text style={s.anonLine}>
              {anonymous
                ? 'Không ai biết bạn là người đăng.'
                : `Bài sẽ hiện tên "${user?.nickname || 'bạn'}".`}
            </Text>
          </View>
        </Pressable>

        {Boolean(quota?.limited) && (
          <View style={[s.guestNote, outOfQuota && s.guestNoteOut]}>
            <Text style={[s.guestNoteText, outOfQuota && s.guestNoteOutText]}>
              {outOfQuota
                ? 'Hôm nay bạn đã đăng đủ 3 bài. Có thể đăng tiếp từ 0h ngày mai, hoặc xác thực email trường để bỏ giới hạn.'
                : `Còn ${quota.remaining} trong ${quota.limit} lượt đăng hôm nay. Xác thực email trường để bỏ giới hạn.`}
            </Text>
            {outOfQuota && (
              <Pressable onPress={() => router.push('/verify')} hitSlop={6}>
                <Text style={s.guestNoteLink}>Xác thực email trường →</Text>
              </Pressable>
            )}
          </View>
        )}

        <View style={{ marginTop: t.spacing.lg }}>
          <Button
            title={outOfQuota ? 'Đã hết lượt hôm nay' : 'Đăng bài'}
            onPress={submit}
            loading={saving}
            disabled={outOfQuota}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = (t) =>
  StyleSheet.create({
  scroll: { paddingHorizontal: t.spacing.lg },
  back: { paddingVertical: t.spacing.sm, marginBottom: t.spacing.sm },
  backText: { ...t.type.label, color: t.colors.accentPressed },
  title: { ...t.type.title, color: t.colors.ink },

  sectionLabel: { ...t.type.micro, color: t.colors.inkMuted, marginBottom: t.spacing.sm },
  fieldLabel: { ...t.type.label, color: t.colors.inkMuted, marginBottom: t.spacing.xs + 2 },

  segment: {
    flexDirection: 'row',
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.md,
    borderWidth: 1,
    borderColor: t.colors.line,
    padding: 3,
    gap: 3,
  },
  segBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: t.radius.sm,
  },
  segOn: { backgroundColor: t.colors.accent },
  segText: { ...t.type.label, color: t.colors.inkMuted },
  segTextOn: { color: t.colors.onAccent },
  scopeHint: { ...t.type.caption, color: t.colors.inkMuted, marginTop: t.spacing.sm },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.line,
  },
  chipOn: { backgroundColor: t.colors.accent, borderColor: t.colors.accent },
  chipText: { ...t.type.label, color: t.colors.inkMuted },
  chipTextOn: { color: t.colors.onAccent },

  textarea: {
    ...t.type.body,
    color: t.colors.ink,
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.line,
    borderRadius: t.radius.md,
    padding: t.spacing.md,
    minHeight: 160,
  },
  counter: { ...t.type.caption, color: t.colors.inkMuted, textAlign: 'right', marginTop: t.spacing.xs },

  anonRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: t.colors.fill,
    borderRadius: t.radius.md,
    padding: t.spacing.md,
    marginTop: t.spacing.md,
    gap: t.spacing.md,
  },
  anonBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: t.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  anonOn: { backgroundColor: t.colors.accent },
  anonTitle: { ...t.type.label, color: t.colors.accentPressed },
  anonLine: { ...t.type.caption, color: t.colors.accentPressed, marginTop: 2 },

  guestNote: {
    backgroundColor: t.colors.raised,
    borderLeftWidth: 3,
    borderLeftColor: t.colors.ink,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    padding: t.spacing.md,
    marginTop: t.spacing.md,
  },
  guestNoteOut: { backgroundColor: t.colors.alertSoft, borderLeftColor: t.colors.alert },
  guestNoteText: { ...t.type.caption, color: t.colors.inkBody },
  guestNoteOutText: { color: t.colors.alertInk },
  guestNoteLink: {
    ...t.type.caption,
    fontFamily: 'BeVietnamPro_700Bold',
    color: t.colors.alertInk,
    marginTop: t.spacing.sm,
  },
});
