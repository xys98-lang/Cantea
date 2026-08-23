import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthorName, Button, Notice, Rule } from '../../src/components/ui';
import { useAuth } from '../../src/store/auth';
import {
  fetchFeed,
  fetchTopics,
  CATEGORIES,
  categoryLabel,
  timeAgo,
} from '../../src/api/community';
import { useTheme, useThemedStyles } from '../../src/store/theme';

/** Thẻ chủ đề theo mùa — mảng màu đặc để tách hẳn khỏi dòng bài trắng bên dưới */
const TopicCard = ({ topic, active, onPress }) => {
  const t = useTheme();
  const s = useThemedStyles(styles);

  return (
  <Pressable
    onPress={onPress}
    style={[
      s.topicCard,
      { backgroundColor: topic.color },
      active && { borderColor: t.colors.ink, borderWidth: 2 },
    ]}
  >
    <Text style={s.topicEmoji}>{topic.emoji || '✦'}</Text>
    <Text style={s.topicTitle} numberOfLines={2}>
      {topic.title}
    </Text>
    {Boolean(topic.subtitle) && (
      <Text style={s.topicSub} numberOfLines={2}>
        {topic.subtitle}
      </Text>
    )}
    <Text style={s.topicCount}>{topic.postCount} bài</Text>
  </Pressable>
  );
};

const PostCard = ({ post, onPress, showUni }) => {
  const t = useTheme();
  const s = useThemedStyles(styles);
  return (
  <Pressable onPress={onPress} style={s.card}>
    <View style={s.cardHead}>
      <View style={s.cardHeadLeft}>
        <Text style={s.cat}>{categoryLabel(post.category)}</Text>
        {Boolean(post.topic?.title) && (
          <Text style={[s.topicTag, { color: post.topic.color }]} numberOfLines={1}>
            {post.topic.emoji} {post.topic.title}
          </Text>
        )}
      </View>
      <Text style={s.time}>{timeAgo(post.createdAt)}</Text>
    </View>

    <Text style={s.cardTitle} numberOfLines={2}>
      {post.title}
    </Text>
    <Text style={s.cardBody} numberOfLines={2}>
      {post.content}
    </Text>

    <View style={s.cardFoot}>
      <AuthorName
        author={post.author}
        suffix={
          showUni && post.university?.shortName && !post.isOfficial
            ? ` · ${post.university.shortName}`
            : ''
        }
      />
      <View style={s.stats}>
        <Ionicons name="heart-outline" size={14} color={t.colors.inkMuted} />
        <Text style={s.statNum}>{post.likeCount}</Text>
        <Ionicons
          name="chatbubble-outline"
          size={13}
          color={t.colors.inkMuted}
          style={{ marginLeft: t.spacing.md }}
        />
        <Text style={s.statNum}>{post.commentCount}</Text>
      </View>
    </View>
  </Pressable>
  );
};

export default function Community() {
  const t = useTheme();
  const s = useThemedStyles(styles);
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const verified = user?.verificationStatus === 'verified';
  const uni = user?.university;

  const [scope, setScope] = useState(verified ? 'university' : 'global');
  const [sort, setSort] = useState('hot');
  const [topics, setTopics] = useState([]);
  const [activeTopic, setActiveTopic] = useState(null);
  const [posts, setPosts] = useState([]);
  const [category, setCategory] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  const locked = scope === 'university' && !verified;

  const load = useCallback(
    async (nextPage = 1, opts = {}) => {
      const sc = opts.scope ?? scope;
      const st = opts.sort ?? sort;
      const cat = opts.category !== undefined ? opts.category : category;
      const tp = opts.topic !== undefined ? opts.topic : activeTopic;

      if (sc === 'university' && !verified) {
        setLoading(false);
        setPosts([]);
        return;
      }

      setError('');
      try {
        const data = await fetchFeed({
          scope: sc,
          sort: st,
          category: cat,
          topic: tp,
          page: nextPage,
        });
        setPosts((prev) => (nextPage === 1 ? data.posts : [...prev, ...data.posts]));
        setHasMore(data.pagination?.hasMore || false);
        setPage(nextPage);
      } catch (e) {
        setError(e.message || 'Không tải được bảng tin');
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [scope, sort, category, activeTopic, verified]
  );

  const loadTopics = useCallback(
    async (sc = scope) => {
      try {
        const data = await fetchTopics(sc);
        setTopics(data.topics || []);
      } catch {
        setTopics([]);
      }
    },
    [scope]
  );

  useFocusEffect(
    useCallback(() => {
      load(1);
      loadTopics();
    }, [load, loadTopics])
  );

  const pickScope = (sc) => {
    if (sc === scope) return;
    setScope(sc);
    setCategory(null);
    setActiveTopic(null);
    setPosts([]);
    setLoading(true);
    load(1, { scope: sc, category: null, topic: null });
    loadTopics(sc);
  };

  const pickSort = (st) => {
    if (st === sort) return;
    setSort(st);
    setLoading(true);
    load(1, { sort: st });
  };

  const pickTopic = (id) => {
    const next = activeTopic === id ? null : id;
    setActiveTopic(next);
    setCategory(null);
    setLoading(true);
    load(1, { topic: next, category: null });
  };

  const pickCategory = (value) => {
    setCategory(value);
    setLoading(true);
    load(1, { category: value });
  };

  const header = (
    <View>
      <View style={{ paddingHorizontal: t.spacing.lg }}>
        <Text style={s.title}>Cộng đồng</Text>
        <Rule style={{ marginBottom: t.spacing.md }} />

        <View style={s.segment}>
          <Pressable
            onPress={() => pickScope('global')}
            style={[s.segBtn, scope === 'global' && s.segOn]}
          >
            <Text style={[s.segText, scope === 'global' && s.segTextOn]}>Toàn quốc</Text>
          </Pressable>
          <Pressable
            onPress={() => pickScope('university')}
            style={[s.segBtn, scope === 'university' && s.segOn]}
          >
            {!verified && (
              <Ionicons
                name="lock-closed"
                size={11}
                color={scope === 'university' ? t.colors.onAccent : t.colors.inkMuted}
                style={{ marginRight: 4 }}
              />
            )}
            <Text style={[s.segText, scope === 'university' && s.segTextOn]}>
              {verified && uni?.shortName ? uni.shortName : 'Trường bạn'}
            </Text>
          </Pressable>
        </View>

        {/*
          Cảnh báo đặt TRƯỚC bảng tin. Nếu để lẫn vào danh sách bài thì
          người dùng cuộn qua mà không đọc — mà đây là thứ cần đọc kỹ.
        */}
        <TrendingAlert onChange={() => load(1)} />

        <Pressable onPress={() => router.push('/trending')} style={s.trendingRow}>
          <Ionicons name="trending-up" size={17} color={t.colors.ink} />
          <Text style={s.trendingText}>Đang nổi</Text>
          <Text style={s.trendingSub}>6 giờ qua</Text>
          <Ionicons name="chevron-forward" size={15} color={t.colors.icon} />
        </Pressable>

        <Notice>{error}</Notice>
      </View>

      {/* Chủ đề theo mùa — nằm trên cùng vì đúng lúc này chúng quan trọng nhất */}
      {!locked && topics.length > 0 && (
        <>
          <Text style={s.stripLabel}>ĐANG DIỄN RA</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.topicStrip}
          >
            {topics.map((t) => (
              <TopicCard
                key={t.id}
                topic={t}
                active={activeTopic === t.id}
                onPress={() => pickTopic(t.id)}
              />
            ))}
          </ScrollView>
        </>
      )}

      {!locked && (
        <View style={{ paddingHorizontal: t.spacing.lg, marginTop: t.spacing.md }}>
          <View style={s.sortRow}>
            <View style={s.sortToggle}>
              <Pressable
                onPress={() => pickSort('hot')}
                style={[s.sortBtn, sort === 'hot' && s.sortOn]}
              >
                <Text style={[s.sortText, sort === 'hot' && s.sortTextOn]}>Nổi bật</Text>
              </Pressable>
              <Pressable
                onPress={() => pickSort('new')}
                style={[s.sortBtn, sort === 'new' && s.sortOn]}
              >
                <Text style={[s.sortText, sort === 'new' && s.sortTextOn]}>Mới nhất</Text>
              </Pressable>
            </View>

            {Boolean(activeTopic) && (
              <Pressable onPress={() => pickTopic(activeTopic)} hitSlop={8}>
                <Text style={s.clearFilter}>Bỏ lọc chủ đề ✕</Text>
              </Pressable>
            )}
          </View>

          {!activeTopic && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginTop: t.spacing.md, marginBottom: t.spacing.sm }}
            >
              <View style={s.chipRow}>
                <Pressable
                  onPress={() => pickCategory(null)}
                  style={[s.chip, !category && s.chipOn]}
                >
                  <Text style={[s.chipText, !category && s.chipTextOn]}>Tất cả</Text>
                </Pressable>
                {CATEGORIES.map((c) => (
                  <Pressable
                    key={c.value}
                    onPress={() => pickCategory(c.value)}
                    style={[s.chip, category === c.value && s.chipOn]}
                  >
                    <Text style={[s.chipText, category === c.value && s.chipTextOn]}>
                      {c.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          )}
        </View>
      )}
    </View>
  );

  if (locked) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: t.colors.bg }}
        contentContainerStyle={{ paddingTop: insets.top + t.spacing.lg, paddingBottom: t.spacing.xl }}
      >
        {header}
        <View style={{ paddingHorizontal: t.spacing.lg }}>
          <View style={s.gate}>
            <Text style={s.gateTitle}>Dành riêng cho sinh viên trường bạn</Text>
            <Text style={s.gateLine}>
              Đây là nơi hỏi về giảng viên, môn học, thủ tục của chính trường mình — những
              chuyện chỉ người trong trường mới trả lời được.
            </Text>

            <View style={s.points}>
              <Text style={s.point}>Chỉ sinh viên cùng trường đọc được</Text>
              <Text style={s.point}>Đăng bài và bình luận ẩn danh</Text>
              <Text style={s.point}>Bỏ giới hạn đăng bài của tài khoản mới</Text>
            </View>

            <View style={{ marginTop: t.spacing.lg }}>
              <Button title="Xác thực email trường" onPress={() => router.push('/verify')} />
            </View>
          </View>

          <Pressable onPress={() => pickScope('global')} style={s.note}>
            <Text style={s.noteText}>
              Chưa được trường cấp mail? Bảng tin Toàn quốc vẫn mở — hỏi về nhập học, ký túc
              xá, mua giáo trình đều được.
            </Text>
            <Text style={s.noteCta}>Xem bảng tin Toàn quốc →</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg }}>
      <FlatList
        data={posts}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={header}
        contentContainerStyle={{
          paddingTop: insets.top + t.spacing.lg,
          paddingBottom: t.spacing.xxl + 40,
        }}
        renderItem={({ item }) => (
          <PostCard
            post={item}
            showUni={scope === 'global'}
            onPress={() => router.push(`/post-detail?id=${item.id}`)}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load(1);
              loadTopics();
            }}
            tintColor={t.colors.accent}
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
            <ActivityIndicator color={t.colors.accent} style={{ marginVertical: t.spacing.lg }} />
          ) : null
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={t.colors.accent} style={{ marginTop: t.spacing.xl }} />
          ) : (
            <View style={s.empty}>
              <Text style={s.emptyTitle}>Chưa có bài nào</Text>
              <Text style={s.emptyLine}>
                {scope === 'global'
                  ? 'Hỏi điều bạn đang thắc mắc — thủ tục nhập học, ký túc xá, mua giáo trình ở đâu rẻ.'
                  : 'Cộng đồng bắt đầu từ bài đầu tiên. Thử hỏi "Thầy nào dạy Kinh tế vĩ mô dễ hiểu nhất?"'}
              </Text>
              <View style={{ marginTop: t.spacing.lg }}>
                <Button
                  title="Viết bài đầu tiên"
                  onPress={() => router.push(`/post-new?scope=${scope}`)}
                />
              </View>
            </View>
          )
        }
      />

      {posts.length > 0 && (
        <Pressable
          onPress={() => router.push(`/post-new?scope=${scope}`)}
          style={s.fab}
          accessibilityRole="button"
          accessibilityLabel="Viết bài"
        >
          <Ionicons name="create-outline" size={23} color={t.colors.onAccent} />
        </Pressable>
      )}
    </View>
  );
}

const styles = (t) =>
  StyleSheet.create({
  title: { ...t.type.title, color: t.colors.ink },

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

  stripLabel: {
    ...t.type.micro,
    color: t.colors.inkMuted,
    paddingHorizontal: t.spacing.lg,
    marginTop: t.spacing.lg,
    marginBottom: t.spacing.sm,
  },
  trendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.sm,
    borderWidth: 1,
    borderColor: t.colors.line,
    borderRadius: t.radius.md,
    paddingHorizontal: t.spacing.md,
    paddingVertical: 12,
    marginTop: t.spacing.md,
  },
  trendingText: { ...t.type.label, color: t.colors.ink, flex: 1 },
  trendingSub: { ...t.type.caption, fontSize: 11, color: t.colors.inkMuted },

  topicStrip: { paddingHorizontal: t.spacing.lg, gap: t.spacing.sm },
  topicCard: {
    width: 176,
    borderRadius: t.radius.lg,
    padding: t.spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
    ...shadow.card,
  },
  topicEmoji: { fontSize: 22, marginBottom: t.spacing.sm },
  topicTitle: { fontFamily: t.fonts.bold, fontSize: 15, color: t.colors.onAccent, lineHeight: 19 },
  topicSub: {
    fontFamily: t.fonts.regular,
    fontSize: 11,
    color: 'rgba(255,255,255,0.88)',
    lineHeight: 15,
    marginTop: 3,
  },
  topicCount: {
    fontFamily: t.fonts.semibold,
    fontSize: 10,
    color: 'rgba(255,255,255,0.75)',
    marginTop: t.spacing.sm,
  },

  sortRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sortToggle: {
    flexDirection: 'row',
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.pill,
    borderWidth: 1,
    borderColor: t.colors.line,
    padding: 3,
  },
  sortBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: t.radius.pill },
  sortOn: { backgroundColor: t.colors.accent },
  sortText: { ...t.type.micro, color: t.colors.inkMuted },
  sortTextOn: { color: t.colors.onAccent },
  clearFilter: { ...t.type.caption, color: t.colors.accentPressed },

  chipRow: { flexDirection: 'row', gap: 6 },
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

  card: {
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.line,
    borderRadius: t.radius.lg,
    padding: t.spacing.md,
    marginHorizontal: t.spacing.lg,
    marginBottom: t.spacing.sm,
    ...shadow.card,
  },
  cardHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: t.spacing.sm,
  },
  cardHeadLeft: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm, flex: 1 },
  cat: {
    ...t.type.micro,
    color: t.colors.accentPressed,
    backgroundColor: t.colors.fill,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: t.radius.sm,
    overflow: 'hidden',
  },
  topicTag: { fontFamily: t.fonts.semibold, fontSize: 11, flex: 1 },
  time: { ...t.type.caption, color: t.colors.inkMuted },
  cardTitle: { ...t.type.label, fontSize: 16, color: t.colors.ink, lineHeight: 21 },
  cardBody: { ...t.type.caption, color: t.colors.inkMuted, marginTop: t.spacing.xs },
  cardFoot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: t.spacing.md,
  },
  stats: { flexDirection: 'row', alignItems: 'center' },
  statNum: { ...t.type.caption, color: t.colors.inkMuted, marginLeft: 4 },

  gate: {
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.line,
    borderRadius: t.radius.lg,
    padding: t.spacing.lg,
    marginTop: t.spacing.md,
    ...shadow.card,
  },
  gateTitle: { ...t.type.heading, color: t.colors.ink, marginBottom: t.spacing.sm },
  gateLine: { ...t.type.body, color: t.colors.inkMuted },
  points: { marginTop: t.spacing.lg, gap: t.spacing.sm },
  point: {
    ...t.type.caption,
    color: t.colors.accentPressed,
    backgroundColor: t.colors.fill,
    borderRadius: t.radius.sm,
    paddingVertical: 9,
    paddingHorizontal: t.spacing.md,
    overflow: 'hidden',
  },

  note: {
    backgroundColor: t.colors.fill,
    borderRadius: t.radius.md,
    padding: t.spacing.md,
    marginTop: t.spacing.lg,
  },
  noteText: { ...t.type.caption, color: t.colors.inkBody },
  noteCta: { ...t.type.label, color: t.colors.inkBody, marginTop: t.spacing.sm },

  empty: {
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.line,
    borderRadius: t.radius.lg,
    padding: t.spacing.lg,
    marginHorizontal: t.spacing.lg,
    marginTop: t.spacing.md,
    ...shadow.card,
  },
  emptyTitle: { ...t.type.heading, color: t.colors.ink, marginBottom: t.spacing.sm },
  emptyLine: { ...t.type.body, color: t.colors.inkMuted },

  fab: {
    position: 'absolute',
    right: t.spacing.lg,
    bottom: t.spacing.lg,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: t.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.float,
  },
});
