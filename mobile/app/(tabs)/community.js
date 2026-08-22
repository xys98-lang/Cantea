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
import { Button, Notice, Rule } from '../../src/components/ui';
import { useAuth } from '../../src/store/auth';
import { fetchFeed, CATEGORIES, categoryLabel, timeAgo } from '../../src/api/community';
import { colors, radius, spacing, type } from '../../src/theme';

const PostCard = ({ post, onPress, showUni }) => (
  <Pressable onPress={onPress} style={s.card}>
    <View style={s.cardHead}>
      <Text style={s.cat}>{categoryLabel(post.category)}</Text>
      <Text style={s.time}>{timeAgo(post.createdAt)}</Text>
    </View>

    <Text style={s.cardTitle} numberOfLines={2}>
      {post.title}
    </Text>
    <Text style={s.cardBody} numberOfLines={2}>
      {post.content}
    </Text>

    <View style={s.cardFoot}>
      <Text style={s.author} numberOfLines={1}>
        {post.author?.displayName}
        {showUni && post.university?.shortName ? ` · ${post.university.shortName}` : ''}
      </Text>
      <View style={s.stats}>
        <Ionicons name="heart-outline" size={14} color={colors.inkFaint} />
        <Text style={s.statNum}>{post.likeCount}</Text>
        <Ionicons
          name="chatbubble-outline"
          size={13}
          color={colors.inkFaint}
          style={{ marginLeft: spacing.md }}
        />
        <Text style={s.statNum}>{post.commentCount}</Text>
      </View>
    </View>
  </Pressable>
);

export default function Community() {
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const verified = user?.verificationStatus === 'verified';
  const uni = user?.university;

  // Người chưa xác thực mở thẳng vào bảng tin toàn quốc,
  // để thấy nội dung thật ngay thay vì một bức tường trống
  const [scope, setScope] = useState(verified ? 'university' : 'global');
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
    async (nextPage = 1, sc = scope, cat = category) => {
      if (sc === 'university' && !verified) {
        setLoading(false);
        setPosts([]);
        return;
      }
      setError('');
      try {
        const data = await fetchFeed({ scope: sc, category: cat, page: nextPage });
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
    [scope, category, verified]
  );

  useFocusEffect(
    useCallback(() => {
      load(1);
    }, [load])
  );

  const pickScope = (sc) => {
    if (sc === scope) return;
    setScope(sc);
    setCategory(null);
    setPosts([]);
    setLoading(true);
    load(1, sc, null);
  };

  const pickCategory = (value) => {
    setCategory(value);
    setLoading(true);
    load(1, scope, value);
  };

  const header = (
    <View style={{ paddingHorizontal: spacing.lg }}>
      <Text style={s.title}>Cộng đồng</Text>
      <Rule style={{ marginBottom: spacing.md }} />

      {/* Chuyển phạm vi. Tab bị khoá vẫn hiện, để người dùng biết mình đang bỏ lỡ gì. */}
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
              color={scope === 'university' ? colors.white : colors.inkFaint}
              style={{ marginRight: 4 }}
            />
          )}
          <Text style={[s.segText, scope === 'university' && s.segTextOn]}>
            {verified && uni?.shortName ? uni.shortName : 'Trường bạn'}
          </Text>
        </Pressable>
      </View>

      <Notice>{error}</Notice>

      {!locked && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginTop: spacing.md, marginBottom: spacing.sm }}
        >
          <View style={s.chipRow}>
            <Pressable onPress={() => pickCategory(null)} style={[s.chip, !category && s.chipOn]}>
              <Text style={[s.chipText, !category && s.chipTextOn]}>Tất cả</Text>
            </Pressable>
            {CATEGORIES.map((c) => (
              <Pressable
                key={c.value}
                onPress={() => pickCategory(c.value)}
                style={[s.chip, category === c.value && s.chipOn]}
              >
                <Text style={[s.chipText, category === c.value && s.chipTextOn]}>{c.label}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );

  if (locked) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.bg }}
        contentContainerStyle={{ paddingTop: insets.top + spacing.lg, paddingBottom: spacing.xl }}
      >
        {header}
        <View style={{ paddingHorizontal: spacing.lg }}>
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

            <View style={{ marginTop: spacing.lg }}>
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
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        data={posts}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={header}
        contentContainerStyle={{
          paddingTop: insets.top + spacing.lg,
          paddingBottom: spacing.xxl + 40,
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
            }}
            tintColor={colors.brand}
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
            <ActivityIndicator color={colors.brand} style={{ marginVertical: spacing.lg }} />
          ) : null
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.brand} style={{ marginTop: spacing.xl }} />
          ) : (
            <View style={s.empty}>
              <Text style={s.emptyTitle}>Chưa có bài nào</Text>
              <Text style={s.emptyLine}>
                {scope === 'global'
                  ? 'Hỏi điều bạn đang thắc mắc — thủ tục nhập học, ký túc xá, mua giáo trình ở đâu rẻ.'
                  : 'Cộng đồng bắt đầu từ bài đầu tiên. Thử hỏi "Thầy nào dạy Kinh tế vĩ mô dễ hiểu nhất?"'}
              </Text>
              <View style={{ marginTop: spacing.lg }}>
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
          <Ionicons name="create-outline" size={24} color={colors.white} />
        </Pressable>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  title: { ...type.title, color: colors.ink },

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

  chipRow: { flexDirection: 'row', gap: 6 },
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

  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  cardHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  cat: {
    ...type.micro,
    color: colors.brandDeep,
    backgroundColor: colors.brandSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  time: { ...type.caption, color: colors.inkFaint },
  cardTitle: { ...type.label, fontSize: 16, color: colors.ink, lineHeight: 21 },
  cardBody: { ...type.caption, color: colors.inkMuted, marginTop: spacing.xs },
  cardFoot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  author: { ...type.caption, color: colors.inkFaint, flex: 1 },
  stats: { flexDirection: 'row', alignItems: 'center' },
  statNum: { ...type.caption, color: colors.inkFaint, marginLeft: 4 },

  gate: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.md,
  },
  gateTitle: { ...type.heading, color: colors.ink, marginBottom: spacing.sm },
  gateLine: { ...type.body, color: colors.inkMuted },
  points: { marginTop: spacing.lg, gap: spacing.sm },
  point: {
    ...type.caption,
    color: colors.brandDeep,
    backgroundColor: colors.brandSoft,
    borderRadius: radius.sm,
    paddingVertical: 9,
    paddingHorizontal: spacing.md,
    overflow: 'hidden',
  },

  note: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  noteText: { ...type.caption, color: colors.accentInk },
  noteCta: { ...type.label, color: colors.accentInk, marginTop: spacing.sm },

  empty: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  emptyTitle: { ...type.heading, color: colors.ink, marginBottom: spacing.sm },
  emptyLine: { ...type.body, color: colors.inkMuted },

  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.brandDeep,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
