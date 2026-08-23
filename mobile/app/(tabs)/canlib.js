import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Callout, EmptyState, Tabs } from '../../src/components/ui';
import { Thumb } from '../../src/components/Thumb';
import { useAuth } from '../../src/store/auth';
import {
  fetchListings,
  toggleSaveListing,
  CATEGORIES,
  dealLabel,
  formatPrice,
  sellerLine,
  STATUS_LABEL,
} from '../../src/api/listings';
import { fetchUnread } from '../../src/api/messages';
import { useTheme, useThemedStyles } from '../../src/store/theme';

const GAP = 12;

/**
 * Thẻ sản phẩm.
 *
 * Cấu trúc lấy từ Musinsa: ảnh dọc, dòng "thương hiệu", tên hai dòng,
 * rồi dòng giá ba phần — phần trăm giảm đỏ, giá hiện tại đậm, giá gốc
 * gạch ngang. Với sách cũ, phần trăm giảm so với giá bìa là con số có
 * nghĩa thật chứ không phải trang trí.
 *
 * Dòng "thương hiệu" của Musinsa ở đây là biệt danh · khoa · khoá của
 * người bán. Cùng vị trí, cùng vai trò: cho biết món đồ này từ đâu ra.
 */
const ListingCard = ({ item, width, onPress, onSave }) => {
  const t = useTheme();
  const s = useThemedStyles(styles);
  const closed = item.status === 'sold' || item.status === 'hidden';
  const badge = item.dealType === 'give' ? 'TẶNG' : item.dealType === 'exchange' ? 'TRAO ĐỔI' : null;

  return (
    <Pressable onPress={onPress} style={{ width }}>
      <View style={{ width, height: width * 1.12 }}>
        {/*
          Lấy đúng bằng bề rộng ô lưới, không phải 600px như trước.
          Ô rộng chừng 170pt nên tải 600px là thừa hơn ba lần bề mặt hiển thị.
        */}
        <Thumb
          uri={item.cover}
          width={width}
          height={width * 1.12}
          round={t.radius.xs}
          icon="book-outline"
        />

        {closed && (
          <View style={s.soldOverlay}>
            <Text style={s.soldText}>{STATUS_LABEL[item.status]}</Text>
          </View>
        )}

        {Boolean(badge) && !closed && (
          <View style={[s.badge, item.dealType === 'give' && s.badgeSolid]}>
            <Text style={[s.badgeText, item.dealType === 'give' && s.badgeTextSolid]}>
              {badge}
            </Text>
          </View>
        )}

        <Pressable onPress={onSave} style={s.fav} hitSlop={10}>
          <Ionicons
            name={item.savedByMe ? 'heart' : 'heart-outline'}
            size={16}
            color={item.savedByMe ? t.colors.alert : t.colors.inverse}
          />
        </Pressable>
      </View>

      <Text style={s.seller} numberOfLines={1}>
        {sellerLine(item.seller)}
      </Text>
      <Text style={s.cardTitle} numberOfLines={2}>
        {item.title}
      </Text>

      <View style={s.priceRow}>
        {Boolean(item.discountPercent) && (
          <Text style={s.off}>-{item.discountPercent}%</Text>
        )}
        <Text style={[s.now, item.dealType !== 'sell' && s.free]}>{dealLabel(item)}</Text>
        {Boolean(item.originalPrice) && item.originalPrice > item.price && (
          <Text style={s.was}>{formatPrice(item.originalPrice)}</Text>
        )}
      </View>
    </Pressable>
  );
};

export default function Canlib() {
  const t = useTheme();
  const s = useThemedStyles(styles);
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const verified = user?.verificationStatus === 'verified';

  const [listings, setListings] = useState([]);
  const [category, setCategory] = useState(null);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [canPost, setCanPost] = useState(false);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [width, setWidth] = useState(0);

  const colW = width ? (width - GAP) / 2 : 0;

  const load = useCallback(
    async (nextPage = 1, opts = {}) => {
      const cat = opts.category !== undefined ? opts.category : category;
      const q = opts.query !== undefined ? opts.query : query;

      setError('');
      try {
        const data = await fetchListings({
          page: nextPage,
          category: cat || undefined,
          q: q || undefined,
        });
        setListings((prev) => (nextPage === 1 ? data.listings : [...prev, ...data.listings]));
        setHasMore(data.pagination?.hasMore || false);
        setCanPost(data.canPost);
        setPage(nextPage);
      } catch (e) {
        setError(e.message || 'Không tải được danh sách');
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [category, query]
  );

  useFocusEffect(
    useCallback(() => {
      load(1);
      fetchUnread()
        .then((d) => setUnread(d.unread || 0))
        .catch(() => {});
    }, [load])
  );

  const pickCategory = (value) => {
    setCategory(value);
    setLoading(true);
    load(1, { category: value });
  };

  const save = async (item) => {
    // Đổi ngay trên màn hình, không đợi máy chủ
    setListings((ls) =>
      ls.map((l) =>
        l.id === item.id
          ? { ...l, savedByMe: !l.savedByMe, saveCount: l.saveCount + (l.savedByMe ? -1 : 1) }
          : l
      )
    );
    try {
      await toggleSaveListing(item.id);
    } catch {
      load(1);
    }
  };

  const header = (
    <View>
      <View style={s.brandBar}>
        <Text style={s.wordmark}>CANLIB</Text>
        <View style={{ flex: 1 }} />
        <Pressable onPress={() => router.push('/messages')} style={s.iconBtn} hitSlop={8}>
          <Ionicons name="chatbubble-outline" size={21} color={t.colors.ink} />
          {unread > 0 && (
            <View style={s.dot}>
              <Text style={s.dotText}>{unread > 9 ? '9+' : unread}</Text>
            </View>
          )}
        </Pressable>
        <Pressable onPress={() => router.push('/my-listings')} style={s.iconBtn} hitSlop={8}>
          <Ionicons name="pricetags-outline" size={20} color={t.colors.ink} />
        </Pressable>
      </View>

      <View style={s.search}>
        <Ionicons name="search" size={16} color={t.colors.icon} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => {
            setLoading(true);
            load(1);
          }}
          placeholder="Tìm giáo trình, đề cương, mã môn…"
          placeholderTextColor={t.colors.icon}
          returnKeyType="search"
          style={s.searchInput}
        />
        {Boolean(query) && (
          <Pressable
            onPress={() => {
              setQuery('');
              setLoading(true);
              load(1, { query: '' });
            }}
            hitSlop={8}
          >
            <Ionicons name="close-circle" size={16} color={t.colors.icon} />
          </Pressable>
        )}
      </View>

      <Tabs
        items={CATEGORIES.map((c) => ({ value: c.value ?? 'all', label: c.label }))}
        value={category ?? 'all'}
        onChange={(v) => pickCategory(v === 'all' ? null : v)}
        style={{ marginTop: t.spacing.md }}
      />

      {!verified && (
        <Callout style={{ marginTop: t.spacing.md }}>
          Bạn đang xem tin của tất cả các trường. Xác thực email trường để đăng tin, nhắn với
          người bán, và chỉ thấy tin trong trường mình.
        </Callout>
      )}

      {Boolean(error) && (
        <Callout tone="warn" style={{ marginTop: t.spacing.md }}>
          {error}
        </Callout>
      )}

      <View style={{ height: t.spacing.md }} />
    </View>
  );

  return (
    <View
      style={{ flex: 1, backgroundColor: t.colors.bg }}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width - t.spacing.screen * 2)}
    >
      <FlatList
        data={colW ? listings : []}
        keyExtractor={(item) => String(item.id)}
        numColumns={2}
        columnWrapperStyle={{ gap: GAP }}
        ListHeaderComponent={header}
        contentContainerStyle={{
          paddingHorizontal: t.spacing.screen,
          paddingTop: insets.top + t.spacing.sm,
          paddingBottom: t.spacing.xxl,
          gap: 18,
        }}
        renderItem={({ item }) => (
          <ListingCard
            item={item}
            width={colW}
            onPress={() => router.push(`/listing-detail?id=${item.id}`)}
            onSave={() => save(item)}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load(1);
            }}
            tintColor={t.colors.ink}
          />
        }
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (hasMore && !loadingMore && !loading) {
            setLoadingMore(true);
            load(page + 1);
          }
        }}
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator color={t.colors.ink} style={{ marginVertical: t.spacing.lg }} />
          ) : null
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={t.colors.ink} style={{ marginTop: t.spacing.xl }} />
          ) : (
            <EmptyState
              title={query ? 'Không tìm thấy' : 'Chưa có tin nào'}
              line={
                query
                  ? `Không có kết quả cho "${query}". Thử mã môn thay vì tên sách.`
                  : 'Chợ bắt đầu từ tin đầu tiên. Có sách kỳ trước không dùng nữa? Đăng lên, có người cần.'
              }
              actionLabel={canPost && !query ? 'Đăng tin đầu tiên' : undefined}
              onAction={() => router.push('/listing-new')}
            />
          )
        }
      />

      {canPost && listings.length > 0 && (
        <Pressable
          onPress={() => router.push('/listing-new')}
          style={[s.fab, { bottom: t.spacing.lg }]}
          accessibilityLabel="Đăng tin"
        >
          <Ionicons name="add" size={26} color={t.colors.inverse} />
        </Pressable>
      )}
    </View>
  );
}

const styles = (t) =>
  StyleSheet.create({
  brandBar: { flexDirection: 'row', alignItems: 'center', paddingBottom: t.spacing.md },
  wordmark: { fontFamily: t.fonts.extrabold, fontSize: 17, letterSpacing: 3, color: t.colors.ink },
  iconBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  dot: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 15,
    height: 15,
    borderRadius: 8,
    paddingHorizontal: 3,
    backgroundColor: t.colors.alert,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotText: { fontFamily: t.fonts.bold, fontSize: 9, color: t.colors.inverse },

  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: t.colors.raised,
    borderRadius: t.radius.sm,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    fontFamily: t.fonts.regular,
    fontSize: 13,
    color: t.colors.ink,
    paddingVertical: 11,
  },

  soldOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: t.radius.xs,
    backgroundColor: 'rgba(255,255,255,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  soldText: { fontFamily: t.fonts.extrabold, fontSize: 13, letterSpacing: 1.4, color: t.colors.ink },

  badge: {
    position: 'absolute',
    top: 7,
    left: 7,
    borderWidth: 1,
    borderColor: t.colors.lineStrong,
    backgroundColor: t.colors.surface,
    borderRadius: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  badgeSolid: { backgroundColor: t.colors.ink, borderColor: t.colors.ink },
  badgeText: { fontFamily: t.fonts.bold, fontSize: 8.5, letterSpacing: 0.6, color: t.colors.inkBody },
  badgeTextSolid: { color: t.colors.inverse },

  fav: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(20,20,20,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  seller: {
    fontFamily: t.fonts.semibold,
    fontSize: 9.5,
    letterSpacing: 0.2,
    color: t.colors.inkMuted,
    marginTop: 8,
  },
  cardTitle: {
    fontFamily: t.fonts.regular,
    fontSize: 12,
    lineHeight: 16,
    color: t.colors.inkStrong,
    marginTop: 4,
  },

  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 6 },
  off: { fontFamily: t.fonts.extrabold, fontSize: 12.5, color: t.colors.alert },
  now: { fontFamily: t.fonts.extrabold, fontSize: 12.5, color: t.colors.ink },
  free: { letterSpacing: -0.2 },
  was: {
    fontFamily: t.fonts.regular,
    fontSize: 10,
    color: t.colors.icon,
    textDecorationLine: 'line-through',
  },

  fab: {
    position: 'absolute',
    right: t.spacing.screen,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: t.colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
