import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { Button, Callout, Field, Rule, Segmented } from '../src/components/ui';
import { ImageUploader } from '../src/components/ImageUploader';
import { useAuth } from '../src/store/auth';
import {
  fetchListing,
  createListing,
  updateListing,
  CATEGORIES,
  DEAL_TYPES,
  CONDITIONS,
  formatPrice,
} from '../src/api/listings';
import { useTheme, useThemedStyles } from '../src/store/theme';

const onlyDigits = (v) => String(v).replace(/\D/g, '');

export default function ListingNew() {
  const t = useTheme();
  const s = useThemedStyles(styles);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const isEdit = Boolean(id);

  const [form, setForm] = useState({
    title: '',
    description: '',
    courseCode: '',
    category: 'material',
    dealType: 'sell',
    condition: 'good',
    price: '',
    originalPrice: '',
  });
  const [images, setImages] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);

  useFocusEffect(
    useCallback(() => {
      if (!isEdit) return;
      let alive = true;
      (async () => {
        try {
          const { listing } = await fetchListing(id);
          if (!alive) return;
          setForm({
            title: listing.title || '',
            description: listing.description || '',
            courseCode: listing.courseCode || '',
            // Tin cũ dùng textbook/notes — quy về material
            category: ['textbook', 'notes'].includes(listing.category)
              ? 'material'
              : listing.category,
            dealType: listing.dealType,
            condition: listing.condition,
            price: listing.price ? String(listing.price) : '',
            originalPrice: listing.originalPrice ? String(listing.originalPrice) : '',
          });
          setImages((listing.images || []).map((url) => ({ url, thumb: url })));
        } catch (e) {
          if (alive) setError(e.message);
        } finally {
          if (alive) setLoading(false);
        }
      })();
      return () => {
        alive = false;
      };
    }, [id, isEdit])
  );

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const isSell = form.dealType === 'sell';

  const submit = async () => {
    setError('');

    if (form.title.trim().length < 3) {
      setError('Tiêu đề cần ít nhất 3 ký tự');
      return;
    }
    if (!images.length) {
      setError('Thêm ít nhất một ảnh. Tin không ảnh gần như không ai bấm vào.');
      return;
    }
    if (isSell && !Number(form.price)) {
      setError('Nhập giá bán, hoặc chuyển sang hình thức Tặng');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        courseCode: form.courseCode.trim().toUpperCase(),
        category: form.category,
        dealType: form.dealType,
        condition: form.condition,
        price: isSell ? Number(form.price) || 0 : 0,
        originalPrice: form.originalPrice ? Number(form.originalPrice) : null,
        images: images.map((i) => i.url),
      };

      const listing = isEdit ? await updateListing(id, payload) : await createListing(payload);
      router.replace(`/listing-detail?id=${listing.id}`);
    } catch (e) {
      setError(e.message || 'Không đăng được tin');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={t.colors.ink} />
      </View>
    );
  }

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
        <Pressable onPress={() => router.back()} style={s.back} hitSlop={8}>
          <Text style={s.backText}>← Huỷ</Text>
        </Pressable>

        <Text style={s.title}>{isEdit ? 'Sửa tin đăng' : 'Đăng tin'}</Text>
        <Rule style={{ marginBottom: t.spacing.md }} />

        {/*
          CẢNH BÁO ĐẶT TRƯỚC MỌI Ô NHẬP.

          Người dùng vừa từ tab Cộng đồng sang — nơi ẩn danh bật sẵn — nên
          mặc định trong đầu họ là "mình vẫn ẩn". Phải phá vỡ giả định đó
          trước khi họ gõ chữ đầu tiên, không phải bằng một dòng nhỏ ở cuối.
        */}
        <Callout tone="warn">
          Tin đăng không có chế độ ẩn danh. Người xem sẽ thấy{' '}
          <Text style={s.strong}>
            {[user?.nickname, user?.major, user?.year ? `Năm ${user.year}` : null]
              .filter(Boolean)
              .join(' · ')}
          </Text>
          . Người mua cần biết mình đang nói chuyện với ai để dám hẹn gặp.
        </Callout>

        {Boolean(error) && (
          <Callout tone="warn" style={{ marginTop: t.spacing.md }}>
            {error}
          </Callout>
        )}

        <Text style={s.sectionLabel}>ẢNH</Text>
        <ImageUploader
          value={images}
          onChange={setImages}
          folder="listing"
          max={5}
          coverHint
          hint="Chụp ở nơi sáng, đặt sách trên nền phẳng. Ảnh bìa quyết định tin có được bấm vào không."
        />

        <Text style={s.sectionLabel}>HÌNH THỨC</Text>
        <Segmented
          options={DEAL_TYPES}
          value={form.dealType}
          onChange={(v) => setForm((f) => ({ ...f, dealType: v, price: v === 'sell' ? f.price : '' }))}
        />

        <Field
          label="Tiêu đề"
          value={form.title}
          onChangeText={set('title')}
          placeholder="Giải tích 1 — Nguyễn Đình Trí, bản in còn mới"
          maxLength={120}
        />

        <Field
          label="Mã môn"
          value={form.courseCode}
          onChangeText={set('courseCode')}
          placeholder="CTDL"
          autoCapitalize="characters"
          maxLength={20}
          hint="Người mua thường tìm bằng mã môn hơn là tên sách"
        />

        {isSell && (
          <View style={{ flexDirection: 'row', gap: t.spacing.sm }}>
            <Field
              label="Giá bán"
              value={form.price}
              onChangeText={(v) => set('price')(onlyDigits(v))}
              placeholder="45000"
              keyboardType="number-pad"
              hint={form.price ? formatPrice(Number(form.price)) : ' '}
              style={{ flex: 1 }}
            />
            <Field
              label="Giá bìa"
              value={form.originalPrice}
              onChangeText={(v) => set('originalPrice')(onlyDigits(v))}
              placeholder="80000"
              keyboardType="number-pad"
              hint={
                form.originalPrice && form.price && Number(form.originalPrice) > Number(form.price)
                  ? `Giảm ${Math.round((1 - Number(form.price) / Number(form.originalPrice)) * 100)}%`
                  : 'Không bắt buộc'
              }
              style={{ flex: 1 }}
            />
          </View>
        )}

        <Text style={s.sectionLabel}>TÌNH TRẠNG</Text>
        <View style={s.chipRow}>
          {CONDITIONS.map((c) => (
            <Pressable
              key={c.value}
              onPress={() => set('condition')(c.value)}
              style={[s.chip, form.condition === c.value && s.chipOn]}
            >
              <Text style={[s.chipText, form.condition === c.value && s.chipTextOn]}>
                {c.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={s.sectionLabel}>LOẠI</Text>
        <View style={s.chipRow}>
          {CATEGORIES.filter((c) => c.value).map((c) => (
            <Pressable
              key={c.value}
              onPress={() => set('category')(c.value)}
              style={[s.chip, form.category === c.value && s.chipOn]}
            >
              <Text style={[s.chipText, form.category === c.value && s.chipTextOn]}>
                {c.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={s.fieldLabel}>Mô tả</Text>
        <TextInput
          style={s.textarea}
          value={form.description}
          onChangeText={set('description')}
          placeholder="Sách còn nguyên, có ghi chú bút chì vài trang đầu. Giao ở cổng B trong giờ hành chính."
          placeholderTextColor={t.colors.icon}
          multiline
          textAlignVertical="top"
          maxLength={2000}
        />

        <Button
          title={isEdit ? 'Lưu thay đổi' : 'Đăng tin'}
          onPress={submit}
          loading={saving}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = (t) =>
  StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.colors.bg },
  scroll: { paddingHorizontal: t.spacing.screen },
  back: { paddingVertical: t.spacing.sm, marginBottom: t.spacing.sm },
  backText: { ...t.type.label, color: t.colors.ink },
  title: { ...t.type.title, color: t.colors.ink },
  strong: { fontFamily: t.fonts.bold },

  sectionLabel: {
    ...t.type.eyebrow,
    color: t.colors.inkMuted,
    marginTop: t.spacing.lg,
    marginBottom: t.spacing.sm,
  },
  fieldLabel: { ...t.type.label, color: t.colors.ink, marginTop: t.spacing.md, marginBottom: t.spacing.sm },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: t.radius.pill,
    borderWidth: 1,
    borderColor: t.colors.lineStrong,
  },
  chipOn: { backgroundColor: t.colors.ink, borderColor: t.colors.ink },
  chipText: { fontFamily: t.fonts.semibold, fontSize: 12.5, color: t.colors.inkMuted },
  chipTextOn: { color: t.colors.inverse },

  textarea: {
    ...t.type.body,
    color: t.colors.ink,
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.lineStrong,
    borderRadius: t.radius.md,
    padding: 14,
    minHeight: 130,
  },
});
