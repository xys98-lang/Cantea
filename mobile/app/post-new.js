import { useState } from 'react';
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button, Field, Notice, Rule } from '../src/components/ui';
import { useAuth } from '../src/store/auth';
import { createPost, CATEGORIES } from '../src/api/community';
import { colors, radius, spacing, type } from '../src/theme';

export default function PostNew() {
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
  const [anonymous, setAnonymous] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

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
        <Pressable onPress={() => router.back()} style={s.back} hitSlop={8}>
          <Text style={s.backText}>← Huỷ</Text>
        </Pressable>

        <Text style={s.title}>Viết bài</Text>
        <Rule style={{ marginBottom: spacing.lg }} />

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
                color={colors.inkFaint}
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

        <Text style={[s.sectionLabel, { marginTop: spacing.lg }]}>CHUYÊN MỤC</Text>
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

        <View style={{ marginTop: spacing.lg }}>
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
          placeholderTextColor={colors.inkFaint}
          multiline
          textAlignVertical="top"
          maxLength={3000}
        />
        <Text style={s.counter}>{content.length}/3000</Text>

        {/* Ẩn danh bật sẵn — người dùng phải chủ động chọn lộ danh tính */}
        <Pressable onPress={() => setAnonymous((a) => !a)} style={s.anonRow}>
          <View style={[s.anonBox, anonymous && s.anonOn]}>
            {anonymous && <Ionicons name="checkmark" size={16} color={colors.white} />}
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

        {!verified && (
          <View style={s.guestNote}>
            <Text style={s.guestNoteText}>
              Tài khoản chưa xác thực đăng được 3 bài mỗi giờ. Xác thực email trường để bỏ
              giới hạn.
            </Text>
          </View>
        )}

        <View style={{ marginTop: spacing.lg }}>
          <Button title="Đăng bài" onPress={submit} loading={saving} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  scroll: { paddingHorizontal: spacing.lg },
  back: { paddingVertical: spacing.sm, marginBottom: spacing.sm },
  backText: { ...type.label, color: colors.brandDeep },
  title: { ...type.title, color: colors.ink },

  sectionLabel: { ...type.micro, color: colors.inkFaint, marginBottom: spacing.sm },
  fieldLabel: { ...type.label, color: colors.inkMuted, marginBottom: spacing.xs + 2 },

  segment: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 3,
    gap: 3,
  },
  segBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: radius.sm,
  },
  segOn: { backgroundColor: colors.brand },
  segText: { ...type.label, color: colors.inkMuted },
  segTextOn: { color: colors.white },
  scopeHint: { ...type.caption, color: colors.inkFaint, marginTop: spacing.sm },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipOn: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { ...type.label, color: colors.inkMuted },
  chipTextOn: { color: colors.white },

  textarea: {
    ...type.body,
    color: colors.ink,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 160,
  },
  counter: { ...type.caption, color: colors.inkFaint, textAlign: 'right', marginTop: spacing.xs },

  anonRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.brandSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
    gap: spacing.md,
  },
  anonBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  anonOn: { backgroundColor: colors.brand },
  anonTitle: { ...type.label, color: colors.brandDeep },
  anonLine: { ...type.caption, color: colors.brandDeep, marginTop: 2 },

  guestNote: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  guestNoteText: { ...type.caption, color: colors.accentInk },
});
