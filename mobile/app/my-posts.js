import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { Callout, EmptyState, Tabs } from '../src/components/ui';
import { useTheme, useThemedStyles } from '../src/store/theme';
import { categoryColor } from '../src/theme';
import { fetchMyPosts, categoryLabel, timeAgo } from '../src/api/community';
import { toggleExclude } from '../src/api/trending';

const PostRow = ({ post, onPress, onToggle, busy }) => {
  const t = useTheme();
  const s = useThemedStyles(styles);
  const cat = categoryColor(t, post.category);

  return (
    <View style={s.row}>
      <Pressable onPress={onPress}>
        <View style={s.rowHead}>
          {post.isAnonymous && (
            <View style={s.anonTag}>
              <Ionicons name="eye-off-outline" size={10} color={t.colors.inkBody} />
              <Text style={s.anonText}>ẨN DANH</Text>
            </View>
          )}
          {Boolean(cat) && (
            <View style={[s.cat, { backgroundColor: cat.bg }]}>
              <Text style={[s.catText, { color: cat.fg }]}>
                {categoryLabel(post.category).toUpperCase()}
              </Text>
            </View>
          )}
          <Text style={s.time}>{timeAgo(post.createdAt)}</Text>
        </View>

        <Text style={s.title} numberOfLines={2}>
          {post.title}
        </Text>

        <View style={s.stats}>
          <Text style={s.stat}>{post.viewCount.toLocaleString('vi-VN')} lượt xem</Text>
          <Text style={s.stat}>{post.likeCount} thích</Text>
          <Text style={s.stat}>{post.commentCount} bình luận</Text>
        </View>
      </Pressable>

      {/*
        Trạng thái trên bảng Đang nổi, và nút đảo ngược.
        Đây là lý do màn này tồn tại — người đã gỡ bài cần chỗ để đổi ý.
      */}
      {post.excludedFromTrending ? (
        <Pressable onPress={onToggle} disabled={busy} style={[s.trendRow, s.trendOff]}>
          <Ionicons name="eye-off-outline" size={14} color={t.colors.inkMuted} />
          <Text style={s.trendOffText}>Đã gỡ khỏi Đang nổi</Text>
          {busy ? (
            <ActivityIndicator size="small" color={t.colors.inkMuted} />
          ) : (
            <Text style={s.trendAction}>Đưa lại</Text>
          )}
        </Pressable>
      ) : post.trendingRank ? (
        <Pressable onPress={onToggle} disabled={busy} style={[s.trendRow, s.trendOn]}>
          <Ionicons name="trending-up" size={14} color={t.colors.ink} />
          <Text style={s.trendOnText}>Đang ở hạng {post.trendingRank}</Text>
          {busy ? (
            <ActivityIndicator size="small" color={t.colors.inkMuted} />
          ) : (
            <Text style={s.trendAction}>Gỡ khỏi bảng</Text>
          )}
        </Pressable>
      ) : null}
    </View>
  );
};

export default function MyPosts() {
  const router = useRouter();
  const t = useTheme();
  const s = useThemedStyles(styles);
  const insets = useSafeAreaInsets();

  const [posts, setPosts] = useState([]);
  const [counts, setCounts] = useState({ total: 0, anonymous: 0, excluded: 0 });
  const [filter, setFilter] = useState('all');
  const [busyId, setBusyId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await fetchMyPosts();
      setPosts(data.posts || []);
      setCounts(data.counts || { total: 0, anonymous: 0, excluded: 0 });
    } catch (e) {
      setError(e.message || 'Không tải được danh sách');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const flip = (post) => {
    const back = post.excludedFromTrending;

    const run = async () => {
      setBusyId(post.id);
      try {
        await toggleExclude(post.id, !back);
        // Đổi ngay trên màn, khỏi tải lại cả danh sách
        setPosts((ps) =>
          ps.map((p) =>
            p.id === post.id
              ? { ...p, excludedFromTrending: !back, trendingRank: back ? p.trendingRank : null }
              : p
          )
        );
      } catch (e) {
        Alert.alert('Lỗi', e.message);
      } finally {
        setBusyId(null);
      }
    };

    if (back) {
      run();
      return;
    }

    Alert.alert(
      'Gỡ khỏi Đang nổi',
      'Bài vẫn nằm trong bảng tin và ai có liên kết vẫn đọc được — chỉ không được đẩy lên bảng xếp hạng nữa.',
      [
        { text: 'Huỷ', style: 'cancel' },
        { text: 'Gỡ khỏi bảng', onPress: run },
      ]
    );
  };

  const shown = posts.filter((p) => {
    if (filter === 'anonymous') return p.isAnonymous;
    if (filter === 'excluded') return p.excludedFromTrending;
    return true;
  });

  const header = (
    <View style={s.head}>
      <Pressable onPress={() => router.back()} style={s.back} hitSlop={10}>
        <Text style={s.backText}>← Quay lại</Text>
      </Pressable>

      <Text style={s.screenTitle}>Bài của tôi</Text>
      <View style={s.rule}>
        <View style={s.ruleMain} />
        <View style={s.ruleTail} />
      </View>

      <Text style={s.sub}>
        {counts.total} bài · {counts.anonymous} đăng ẩn danh
      </Text>

      <Tabs
        items={[
          { value: 'all', label: 'Tất cả' },
          { value: 'anonymous', label: 'Ẩn danh' },
          { value: 'excluded', label: `Đã gỡ${counts.excluded ? ` (${counts.excluded})` : ''}` },
        ]}
        value={filter}
        onChange={setFilter}
        style={{ marginTop: t.spacing.md }}
      />

      {Boolean(error) && (
        <Callout tone="warn" style={{ marginTop: t.spacing.md }}>
          {error}
        </Callout>
      )}

      {filter === 'excluded' && counts.excluded > 0 && (
        <Callout style={{ marginTop: t.spacing.md }}>
          Những bài này vẫn nằm trong bảng tin và vẫn đọc được — chúng chỉ không được đẩy
          lên bảng Đang nổi. Bấm “Đưa lại” để bỏ giới hạn.
        </Callout>
      )}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg }}>
      <FlatList
        data={shown}
        keyExtractor={(p) => String(p.id)}
        ListHeaderComponent={header}
        contentContainerStyle={{
          paddingHorizontal: t.spacing.screen,
          paddingTop: insets.top + t.spacing.sm,
          paddingBottom: insets.bottom + t.spacing.xxl,
        }}
        renderItem={({ item }) => (
          <PostRow
            post={item}
            busy={busyId === item.id}
            onPress={() => router.push(`/post-detail?id=${item.id}`)}
            onToggle={() => flip(item)}
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
            <EmptyState
              title={filter === 'all' ? 'Chưa đăng bài nào' : 'Không có bài nào ở mục này'}
              line={
                filter === 'all'
                  ? 'Bài bạn đăng sẽ hiện ở đây, kèm số liệu và trạng thái trên bảng Đang nổi.'
                  : 'Thử chọn mục khác.'
              }
              actionLabel={filter === 'all' ? 'Viết bài' : undefined}
              onAction={() => router.push('/post-new')}
            />
          )
        }
      />
    </View>
  );
}

const styles = (t) =>
  StyleSheet.create({
    head: { paddingBottom: t.spacing.sm },
    back: { paddingVertical: 4, marginBottom: t.spacing.sm, alignSelf: 'flex-start' },
    backText: { ...t.type.label, color: t.colors.ink },
    screenTitle: { ...t.type.title, color: t.colors.ink },
    rule: { flexDirection: 'row', alignItems: 'center', marginTop: 7, marginBottom: t.spacing.sm },
    ruleMain: { width: 36, height: 3, borderRadius: 2, backgroundColor: t.colors.ink },
    ruleTail: {
      width: 11,
      height: 3,
      borderRadius: 2,
      backgroundColor: t.colors.lineStrong,
      marginLeft: 4,
    },
    sub: { ...t.type.caption, color: t.colors.inkMuted },

    row: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: t.colors.line },
    rowHead: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },

    anonTag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      backgroundColor: t.colors.fill,
      borderRadius: t.radius.xs,
      paddingHorizontal: 6,
      paddingVertical: 3,
    },
    anonText: { fontFamily: t.fonts.bold, fontSize: 8.5, letterSpacing: 0.5, color: t.colors.inkBody },

    cat: { borderRadius: t.radius.xs, paddingHorizontal: 6, paddingVertical: 3 },
    catText: { fontFamily: t.fonts.bold, fontSize: 8.5, letterSpacing: 0.5 },
    time: { ...t.type.caption, fontSize: 10.5, color: t.colors.inkMuted },

    title: { ...t.type.itemTitle, fontSize: 14.5, lineHeight: 20, color: t.colors.ink, marginTop: 7 },

    stats: { flexDirection: 'row', gap: t.spacing.md, marginTop: 7 },
    stat: { ...t.type.caption, fontSize: 11, color: t.colors.inkMuted },

    trendRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      borderRadius: t.radius.sm,
      paddingHorizontal: 11,
      paddingVertical: 9,
      marginTop: 11,
    },
    trendOn: { backgroundColor: t.colors.fill },
    trendOff: { borderWidth: 1, borderColor: t.colors.line },
    trendOnText: { ...t.type.captionStrong, color: t.colors.ink, flex: 1 },
    trendOffText: { ...t.type.captionStrong, color: t.colors.inkMuted, flex: 1 },
    trendAction: { fontFamily: t.fonts.bold, fontSize: 11, color: t.colors.ink },
  });
