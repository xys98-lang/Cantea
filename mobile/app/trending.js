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
import { Callout, EmptyState, Segmented, Tabs } from '../src/components/ui';
import { useAuth } from '../src/store/auth';
import { useTheme, useThemedStyles } from '../src/store/theme';
import { categoryColor } from '../src/theme';
import { categoryLabel } from '../src/api/community';
import { fetchTrending, WINDOWS, clockOf, deltaLabel } from '../src/api/trending';

const Row = ({ item, onPress }) => {
  const t = useTheme();
  const s = useThemedStyles(styles);

  const delta = deltaLabel(item.delta);
  const cat = item.isOfficial ? null : categoryColor(t, item.category);

  return (
    <Pressable onPress={onPress} style={s.row}>
      {/* Ba hạng đầu in đậm — mắt cần một mốc để bám khi lướt bảng */}
      <Text style={[s.rank, item.rank <= 3 && s.rankTop]}>{item.rank}</Text>

      <View style={{ flex: 1 }}>
        <Text style={s.title} numberOfLines={2}>
          {item.title}
        </Text>

        <View style={s.meta}>
          {item.isOfficial ? (
            <View style={[s.cat, { backgroundColor: t.colors.category[4].bg }]}>
              <Text style={[s.catText, { color: t.colors.category[4].fg }]}>CHÍNH THỨC</Text>
            </View>
          ) : cat ? (
            <View style={[s.cat, { backgroundColor: cat.bg }]}>
              <Text style={[s.catText, { color: cat.fg }]}>
                {categoryLabel(item.category).toUpperCase()}
              </Text>
            </View>
          ) : null}
          <Text style={s.count}>{item.viewCount} lượt xem</Text>
        </View>
      </View>

      {Boolean(delta) && (
        <View style={[s.delta, delta.kind === 'new' && s.deltaNew]}>
          <Text
            style={[
              s.deltaText,
              delta.kind === 'new' && s.deltaNewText,
              delta.kind === 'up' && { color: t.colors.ink },
            ]}
          >
            {delta.text}
          </Text>
        </View>
      )}
    </Pressable>
  );
};

export default function Trending() {
  const router = useRouter();
  const t = useTheme();
  const s = useThemedStyles(styles);
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const verified = user?.verificationStatus === 'verified';

  const [scope, setScope] = useState('global');
  const [window, setWindow] = useState('6h');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(
    async (nextScope = scope, nextWindow = window) => {
      setError('');
      try {
        setData(await fetchTrending(nextScope, nextWindow));
      } catch (e) {
        setError(e.message || 'Không tải được bảng xếp hạng');
        setData(null);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [scope, window]
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const pickScope = (v) => {
    if (v === 'university' && !verified) {
      router.push('/verify');
      return;
    }
    setScope(v);
    setLoading(true);
    load(v, window);
  };

  const pickWindow = (v) => {
    setWindow(v);
    setLoading(true);
    load(scope, v);
  };

  const header = (
    <View style={s.head}>
      <Pressable onPress={() => router.back()} style={s.back} hitSlop={10}>
        <Ionicons name="chevron-back" size={23} color={t.colors.ink} />
      </Pressable>

      <Text style={s.screenTitle}>Đang nổi</Text>
      <View style={s.rule}>
        <View style={s.ruleMain} />
        <View style={s.ruleTail} />
      </View>

      <Segmented options={WINDOWS} value={window} onChange={pickWindow} />

      <Tabs
        items={[
          { value: 'global', label: 'Toàn quốc' },
          {
            value: 'university',
            label: verified && user?.university?.shortName
              ? user.university.shortName
              : 'Trường bạn',
            locked: !verified,
          },
        ]}
        value={scope}
        onChange={pickScope}
        style={{ marginTop: t.spacing.md }}
      />

      {/*
        Nói rõ bảng tính lúc nào và bao giờ tính lại. Không có dòng này,
        người dùng kéo làm mới liên tục mà số không đổi rồi tưởng app hỏng.
      */}
      {Boolean(data?.computedAt) && (
        <View style={s.stamp}>
          <Ionicons name="time-outline" size={12} color={t.colors.icon} />
          <Text style={s.stampText}>
            Cập nhật {clockOf(data.computedAt)} · Làm mới sau {data.refreshInMinutes} phút
          </Text>
        </View>
      )}

      {Boolean(error) && (
        <Callout tone="warn" style={{ marginTop: t.spacing.md }}>
          {error}
        </Callout>
      )}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg }}>
      <FlatList
        data={data?.items || []}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={header}
        contentContainerStyle={{
          paddingHorizontal: t.spacing.screen,
          paddingTop: insets.top + t.spacing.sm,
          paddingBottom: insets.bottom + t.spacing.xxl,
        }}
        renderItem={({ item }) => (
          <Row item={item} onPress={() => router.push(`/post-detail?id=${item.id}`)} />
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
            <EmptyState
              title="Chưa có bài nào nổi"
              line={
                window === '6h'
                  ? 'Sáu giờ qua chưa đủ hoạt động để xếp hạng. Thử khoảng 24 giờ.'
                  : 'Chưa đủ bài để xếp hạng trong khoảng này.'
              }
              actionLabel={window === '6h' ? 'Xem 24 giờ' : undefined}
              onAction={() => pickWindow('24h')}
            />
          )
        }
        ListFooterComponent={
          data?.items?.length ? (
            <Callout style={{ marginTop: t.spacing.lg }}>
              Xếp theo lượt xem, bình chọn và bình luận trong{' '}
              {WINDOWS.find((w) => w.value === window)?.label.toLowerCase()} gần nhất — bài
              mới được cộng thêm điểm để không bị bài cũ đè. Bài của chính bạn không tính
              vào lượt xem.
            </Callout>
          ) : null
        }
      />
    </View>
  );
}

const styles = (t) =>
  StyleSheet.create({
    head: { paddingBottom: t.spacing.sm },
    back: { paddingVertical: 4, marginBottom: t.spacing.sm, alignSelf: 'flex-start' },
    screenTitle: { ...t.type.title, color: t.colors.ink },
    rule: { flexDirection: 'row', alignItems: 'center', marginTop: 7, marginBottom: t.spacing.md },
    ruleMain: { width: 36, height: 3, borderRadius: 2, backgroundColor: t.colors.ink },
    ruleTail: {
      width: 11,
      height: 3,
      borderRadius: 2,
      backgroundColor: t.colors.lineStrong,
      marginLeft: 4,
    },

    stamp: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: t.spacing.md,
    },
    stampText: { ...t.type.caption, fontSize: 11, color: t.colors.inkMuted },

    row: {
      flexDirection: 'row',
      gap: 12,
      paddingVertical: 13,
      borderBottomWidth: 1,
      borderBottomColor: t.colors.line,
      alignItems: 'flex-start',
    },
    rank: {
      width: 19,
      textAlign: 'center',
      fontFamily: t.fonts.bold,
      fontSize: 15,
      color: t.colors.icon,
      marginTop: 1,
    },
    rankTop: { color: t.colors.ink, fontFamily: t.fonts.extrabold },

    title: { ...t.type.body, fontSize: 13.5, lineHeight: 19, color: t.colors.ink },

    meta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
    cat: { borderRadius: t.radius.xs, paddingHorizontal: 6, paddingVertical: 3 },
    catText: { fontFamily: t.fonts.bold, fontSize: 8.5, letterSpacing: 0.5 },
    count: { ...t.type.caption, fontSize: 10.5, color: t.colors.inkMuted },

    delta: { paddingTop: 3, minWidth: 34, alignItems: 'flex-end' },
    deltaText: { fontFamily: t.fonts.bold, fontSize: 9.5, color: t.colors.icon },
    deltaNew: {
      backgroundColor: t.colors.accent,
      borderRadius: 3,
      paddingHorizontal: 5,
      paddingVertical: 3,
      minWidth: 0,
    },
    deltaNewText: { color: t.colors.onAccent },
  });
