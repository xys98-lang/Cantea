import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button, Callout, Divider, Pill } from '../src/components/ui';
import { HeroImage } from '../src/components/Thumb';
import {
  fetchListing,
  toggleSaveListing,
  setListingStatus,
  bumpListing,
  deleteListing,
  formatPrice,
  dealLabel,
  conditionLabel,
  categoryLabel,
  sellerLine,
} from '../src/api/listings';
import { useTheme, useThemedStyles } from '../src/store/theme';

const W = Dimensions.get('window').width;

export default function ListingDetail() {
  const t = useTheme();
  const s = useThemedStyles(styles);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams();

  const [listing, setListing] = useState(null);
  const [conversationId, setConversationId] = useState(null);
  const [canMessage, setCanMessage] = useState(false);
  const [imgIndex, setImgIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await fetchListing(id);
      setListing(data.listing);
      setConversationId(data.conversationId);
      setCanMessage(data.canMessage);
    } catch (e) {
      setError(e.message || 'Không tải được tin đăng');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const save = async () => {
    setListing((l) => ({ ...l, savedByMe: !l.savedByMe }));
    try {
      await toggleSaveListing(id);
    } catch {
      load();
    }
  };

  const markSold = () =>
    Alert.alert(
      'Đánh dấu đã bán',
      'Những người đang hỏi mua sẽ được báo tự động. Tin vẫn hiện thêm 7 ngày rồi tự ẩn.',
      [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'Đã bán',
          onPress: async () => {
            try {
              const r = await setListingStatus(id, 'sold');
              Alert.alert('Xong', r.message);
              load();
            } catch (e) {
              Alert.alert('Lỗi', e.message);
            }
          },
        },
      ]
    );

  const bump = async () => {
    try {
      const r = await bumpListing(id);
      Alert.alert('Đã đẩy tin', r.message);
      load();
    } catch (e) {
      Alert.alert('Chưa đẩy được', e.message);
    }
  };

  const remove = () =>
    Alert.alert('Xoá tin đăng', 'Tin sẽ biến mất khỏi chợ. Hội thoại đã có vẫn giữ nguyên.', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xoá',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteListing(id);
            router.back();
          } catch (e) {
            Alert.alert('Lỗi', e.message);
          }
        },
      },
    ]);

  const contact = () => {
    if (conversationId) {
      router.push(`/chat?id=${conversationId}`);
    } else {
      router.push(`/chat?listing=${id}`);
    }
  };

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={t.colors.ink} />
      </View>
    );
  }

  if (!listing) {
    return (
      <View style={[s.center, { paddingHorizontal: t.spacing.lg }]}>
        <Callout tone="warn">{error || 'Tin đăng không tồn tại'}</Callout>
        <Button title="Quay lại" variant="ghost" onPress={() => router.back()} />
      </View>
    );
  }

  const closed = listing.status === 'sold';

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 110 }}>
        {/* ===== Ảnh ===== */}
        <View>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) =>
              setImgIndex(Math.round(e.nativeEvent.contentOffset.x / W))
            }
          >
            {(listing.images.length ? listing.images : [null]).map((uri, i) => (
              <HeroImage key={i} uri={uri} width={W} height={W} />
            ))}
          </ScrollView>

          {listing.images.length > 1 && (
            <View style={s.counter}>
              <Text style={s.counterText}>
                {imgIndex + 1} / {listing.images.length}
              </Text>
            </View>
          )}

          <Pressable
            onPress={() => router.back()}
            style={[s.backBtn, { top: insets.top + t.spacing.sm }]}
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={22} color={t.colors.ink} />
          </Pressable>

          {closed && (
            <View style={s.soldBanner}>
              <Text style={s.soldText}>ĐÃ BÁN</Text>
            </View>
          )}
        </View>

        <View style={s.body}>
          <View style={s.tagRow}>
            <Pill>{categoryLabel(listing.category)}</Pill>
            {Boolean(listing.courseCode) && <Pill tone="solid">{listing.courseCode}</Pill>}
            <Pill>{conditionLabel(listing.condition)}</Pill>
          </View>

          <Text style={s.title}>{listing.title}</Text>

          <View style={s.priceRow}>
            {Boolean(listing.discountPercent) && (
              <Text style={s.off}>-{listing.discountPercent}%</Text>
            )}
            <Text style={s.price}>{dealLabel(listing)}</Text>
            {Boolean(listing.originalPrice) && listing.originalPrice > listing.price && (
              <Text style={s.was}>Giá bìa {formatPrice(listing.originalPrice)}</Text>
            )}
          </View>

          <Divider style={{ marginVertical: t.spacing.lg }} />

          {/* ===== Người bán ===== */}
          <Text style={s.sectionLabel}>NGƯỜI BÁN</Text>
          <View style={s.sellerRow}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>
                {(listing.seller?.displayName || '?').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={s.sellerNameRow}>
                <Text style={s.sellerName}>{listing.seller?.displayName}</Text>
                {listing.seller?.isVerified && (
                  <Ionicons name="checkmark-circle" size={14} color={t.colors.ink} />
                )}
              </View>
              <Text style={s.sellerMeta}>
                {[listing.seller?.major, listing.seller?.year ? `Năm ${listing.seller.year}` : null]
                  .filter(Boolean)
                  .join(' · ') || 'Chưa cập nhật ngành'}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={s.statNum}>{listing.seller?.exchangesCompleted || 0}</Text>
              <Text style={s.statLabel}>lượt trao</Text>
            </View>
          </View>

          {Boolean(listing.description) && (
            <>
              <Divider style={{ marginVertical: t.spacing.lg }} />
              <Text style={s.sectionLabel}>MÔ TẢ</Text>
              <Text style={s.description}>{listing.description}</Text>
            </>
          )}

          <Divider style={{ marginVertical: t.spacing.lg }} />

          <View style={s.metaRow}>
            <Text style={s.metaText}>{listing.viewCount} lượt xem</Text>
            <Text style={s.metaText}>{listing.saveCount} lượt lưu</Text>
            {listing.isMine && <Text style={s.metaText}>Còn {listing.daysLeft} ngày</Text>}
          </View>

          {/*
            Không có thanh toán trong app, nên phải nói thẳng. Người dùng
            quen Shopee sẽ mặc định có bên trung gian giữ tiền — hiểu nhầm
            đó dẫn tới mất tiền thật.
          */}
          <Callout tone="warn" style={{ marginTop: t.spacing.lg }}>
            Cantea không giữ tiền hộ và không đảm bảo giao dịch. Hẹn gặp ở nơi đông người
            trong trường, xem hàng rồi mới trả tiền. Không chuyển khoản trước.
          </Callout>

          {/* ===== Quản lý tin của mình ===== */}
          {listing.isMine && (
            <View style={{ marginTop: t.spacing.lg, gap: t.spacing.sm }}>
              <Button
                title="Sửa tin"
                variant="ghost"
                onPress={() => router.push(`/listing-new?id=${id}`)}
                style={{ marginTop: 0 }}
              />
              {!closed && (
                <>
                  <Button
                    title="Đánh dấu đã bán"
                    variant="ghost"
                    onPress={markSold}
                    style={{ marginTop: 0 }}
                  />
                  <Button
                    title="Đẩy tin lên đầu"
                    variant="ghost"
                    onPress={bump}
                    style={{ marginTop: 0 }}
                  />
                </>
              )}
              <Pressable onPress={remove} style={s.deleteBtn}>
                <Text style={s.deleteText}>Xoá tin đăng</Text>
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>

      {/* ===== Thanh hành động ===== */}
      {!listing.isMine && (
        <View style={[s.bar, { paddingBottom: insets.bottom + t.spacing.sm }]}>
          <Pressable onPress={save} style={s.barFav} hitSlop={6}>
            <Ionicons
              name={listing.savedByMe ? 'heart' : 'heart-outline'}
              size={23}
              color={listing.savedByMe ? t.colors.alert : t.colors.inkBody}
            />
          </Pressable>

          {canMessage ? (
            <Button
              title={conversationId ? 'Mở hội thoại' : 'Nhắn cho người bán'}
              onPress={contact}
              disabled={closed}
              style={{ flex: 1, marginTop: 0 }}
            />
          ) : (
            <Button
              title="Xác thực để nhắn tin"
              onPress={() => router.push('/verify')}
              style={{ flex: 1, marginTop: 0 }}
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = (t) =>
  StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.colors.bg },

  counter: {
    position: 'absolute',
    right: t.spacing.md,
    bottom: t.spacing.md,
    backgroundColor: 'rgba(20,20,20,0.6)',
    borderRadius: t.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  counterText: { fontFamily: t.fonts.semibold, fontSize: 10.5, color: t.colors.inverse },
  backBtn: {
    position: 'absolute',
    left: t.spacing.md,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  soldBanner: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.68)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  soldText: { fontFamily: t.fonts.extrabold, fontSize: 22, letterSpacing: 3, color: t.colors.ink },

  body: { paddingHorizontal: t.spacing.screen, paddingTop: t.spacing.md },
  tagRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  title: { ...t.type.title, fontSize: 21, color: t.colors.ink, marginTop: t.spacing.md },

  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: t.spacing.sm },
  off: { fontFamily: t.fonts.extrabold, fontSize: 20, color: t.colors.alert },
  price: { fontFamily: t.fonts.extrabold, fontSize: 20, color: t.colors.ink },
  was: { ...t.type.caption, color: t.colors.inkMuted },

  sectionLabel: { ...t.type.eyebrow, color: t.colors.inkMuted, marginBottom: t.spacing.sm },
  sellerRow: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.md },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: t.colors.fill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: t.fonts.bold, fontSize: 15, color: t.colors.ink },
  sellerNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sellerName: { ...t.type.itemTitle, color: t.colors.ink },
  sellerMeta: { ...t.type.caption, fontSize: 11.5, color: t.colors.inkMuted, marginTop: 2 },
  statNum: { fontFamily: t.fonts.extrabold, fontSize: 16, color: t.colors.ink },
  statLabel: { ...t.type.caption, fontSize: 10, color: t.colors.inkMuted },

  description: { ...t.type.body, color: t.colors.inkBody },

  metaRow: { flexDirection: 'row', gap: t.spacing.md },
  metaText: { ...t.type.caption, fontSize: 11.5, color: t.colors.inkMuted },

  deleteBtn: { alignItems: 'center', paddingVertical: t.spacing.md },
  deleteText: { ...t.type.label, color: t.colors.alertInk },

  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.md,
    paddingHorizontal: t.spacing.screen,
    paddingTop: t.spacing.sm,
    backgroundColor: t.colors.surface,
    borderTopWidth: 1,
    borderTopColor: t.colors.line,
  },
  barFav: {
    width: 46,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: t.colors.lineStrong,
    borderRadius: t.radius.md,
  },
});
