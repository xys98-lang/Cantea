import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Callout, EmptyState, Rule, Segmented } from '../src/components/ui';
import { Thumb } from '../src/components/Thumb';
import { fetchMyListings, fetchSavedListings, dealLabel, STATUS_LABEL } from '../src/api/listings';
import { useTheme, useThemedStyles } from '../src/store/theme';

const Row = ({ item, onPress, showSeller }) => {
  const t = useTheme();
  const s = useThemedStyles(styles);

  const closed = item.status === 'sold' || item.status === 'hidden';
  const expiringSoon = !closed && item.daysLeft <= 5;

  return (
    <Pressable onPress={onPress} style={s.row}>
      <View>
        <Thumb uri={item.cover} size={56} icon="book-outline" />
        {closed && <View style={s.veil} />}
      </View>

      <View style={{ flex: 1 }}>
        <Text style={s.title} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={s.price}>{dealLabel(item)}</Text>

        <View style={s.metaRow}>
          {closed ? (
            <Text style={s.statusTag}>{STATUS_LABEL[item.status]}</Text>
          ) : (
            <Text style={[s.meta, expiringSoon && s.metaWarn]}>
              {expiringSoon ? `Còn ${item.daysLeft} ngày` : `${item.viewCount} lượt xem`}
            </Text>
          )}
          {item.messageCount > 0 && (
            <Text style={s.meta}>{item.messageCount} người hỏi</Text>
          )}
          {showSeller && <Text style={s.meta}>{item.seller?.displayName}</Text>}
        </View>
      </View>

      <Ionicons name="chevron-forward" size={16} color={t.colors.icon} />
    </Pressable>
  );
};

export default function MyListings() {
  const t = useTheme();
  const s = useThemedStyles(styles);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [tab, setTab] = useState('mine');
  const [items, setItems] = useState([]);
  const [counts, setCounts] = useState({ active: 0, sold: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(
    async (which = tab) => {
      setError('');
      try {
        if (which === 'mine') {
          const data = await fetchMyListings();
          setItems(data.listings || []);
          setCounts(data.counts || { active: 0, sold: 0 });
        } else {
          const data = await fetchSavedListings();
          setItems(data.listings || []);
        }
      } catch (e) {
        setError(e.message || 'Không tải được danh sách');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [tab]
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const pick = (v) => {
    setTab(v);
    setItems([]);
    setLoading(true);
    load(v);
  };

  const header = (
    <View style={{ paddingHorizontal: t.spacing.screen }}>
      <Pressable onPress={() => router.back()} style={s.back} hitSlop={8}>
        <Text style={s.backText}>← Quay lại</Text>
      </Pressable>
      <Text style={s.screenTitle}>Tin đăng</Text>
      <Rule style={{ marginBottom: t.spacing.md }} />

      <Segmented
        options={[
          { value: 'mine', label: 'Tin của tôi' },
          { value: 'saved', label: 'Đã lưu' },
        ]}
        value={tab}
        onChange={pick}
      />

      {tab === 'mine' && !loading && items.length > 0 && (
        <Text style={s.summary}>
          {counts.active} tin đang bán · {counts.sold} đã bán
        </Text>
      )}

      {Boolean(error) && (
        <Callout tone="warn" style={{ marginTop: t.spacing.md }}>
          {error}
        </Callout>
      )}

      <View style={{ height: t.spacing.sm }} />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg }}>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={header}
        contentContainerStyle={{
          paddingTop: insets.top + t.spacing.sm,
          paddingBottom: insets.bottom + t.spacing.xl,
        }}
        renderItem={({ item }) => (
          <Row
            item={item}
            showSeller={tab === 'saved'}
            onPress={() => router.push(`/listing-detail?id=${item.id}`)}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={t.colors.ink}
          />
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={t.colors.ink} style={{ marginTop: t.spacing.xl }} />
          ) : (
            <View style={{ paddingHorizontal: t.spacing.screen }}>
              <EmptyState
                title={tab === 'mine' ? 'Chưa đăng tin nào' : 'Chưa lưu tin nào'}
                line={
                  tab === 'mine'
                    ? 'Có sách kỳ trước không dùng nữa? Đăng lên, có người đang cần.'
                    : 'Thấy món đồ hay trên Canlib thì bấm hình trái tim để theo dõi.'
                }
                actionLabel={tab === 'mine' ? 'Đăng tin' : 'Mở Canlib'}
                onAction={() =>
                  router.push(tab === 'mine' ? '/listing-new' : '/canlib')
                }
              />
            </View>
          )
        }
      />
    </View>
  );
}

const styles = (t) =>
  StyleSheet.create({
  back: { paddingVertical: t.spacing.sm, marginBottom: t.spacing.sm },
  backText: { ...t.type.label, color: t.colors.ink },
  screenTitle: { ...t.type.title, color: t.colors.ink },
  summary: { ...t.type.caption, color: t.colors.inkMuted, marginTop: t.spacing.md },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.md,
    paddingHorizontal: t.spacing.screen,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.line,
  },
  veil: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: t.radius.sm,
  },

  title: { ...t.type.caption, fontFamily: t.fonts.semibold, fontSize: 13, color: t.colors.ink, lineHeight: 18 },
  price: { fontFamily: t.fonts.extrabold, fontSize: 13, color: t.colors.ink, marginTop: 3 },

  metaRow: { flexDirection: 'row', gap: t.spacing.md, marginTop: 4 },
  meta: { ...t.type.caption, fontSize: 11, color: t.colors.inkMuted },
  metaWarn: { fontFamily: t.fonts.semibold, color: t.colors.alertInk },
  statusTag: { fontFamily: t.fonts.bold, fontSize: 10, letterSpacing: 0.6, color: t.colors.inkMuted },
});
