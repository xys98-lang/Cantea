import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthorName, Button, Notice, Rule } from '../src/components/ui';
import {
  fetchCollections,
  fetchSaved,
  createCollection,
  deleteCollection,
  EMOJI_CHOICES,
} from '../src/api/bookmarks';
import { categoryLabel, timeAgo } from '../src/api/community';
import { useTheme, useThemedStyles } from '../src/store/theme';

const SavedCard = ({ post, onPress }) => {
  const t = useTheme();
  const s = useThemedStyles(styles);

  return (
  <Pressable onPress={onPress} style={s.card}>
    <View style={s.cardHead}>
      <Text style={s.cat}>{categoryLabel(post.category)}</Text>
      <Text style={s.time}>Lưu {timeAgo(post.savedAt)}</Text>
    </View>

    <Text style={s.cardTitle} numberOfLines={2}>
      {post.title}
    </Text>
    <Text style={s.cardBody} numberOfLines={2}>
      {post.content}
    </Text>

    {Boolean(post.savedNote) && (
      <View style={s.note}>
        <Ionicons name="bookmark" size={11} color={t.colors.inkBody} />
        <Text style={s.noteText} numberOfLines={2}>
          {post.savedNote}
        </Text>
      </View>
    )}

    <View style={s.cardFoot}>
      <AuthorName author={post.author} />
      <View style={s.stats}>
        <Ionicons name="heart-outline" size={13} color={t.colors.inkMuted} />
        <Text style={s.statNum}>{post.likeCount}</Text>
        <Ionicons
          name="chatbubble-outline"
          size={12}
          color={t.colors.inkMuted}
          style={{ marginLeft: t.spacing.md }}
        />
        <Text style={s.statNum}>{post.commentCount}</Text>
      </View>
    </View>
  </Pressable>
);
};

export default function Saved() {
  const t = useTheme();
  const s = useThemedStyles(styles);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [collections, setCollections] = useState([]);
  const [active, setActive] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [modal, setModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmoji, setNewEmoji] = useState('📚');
  const [creating, setCreating] = useState(false);

  const load = useCallback(
    async (col = active) => {
      setError('');
      try {
        const [cols, data] = await Promise.all([
          fetchCollections(),
          fetchSaved({ collection: col }),
        ]);
        setCollections(cols);
        setPosts(data.posts || []);
      } catch (e) {
        setError(e.message || 'Không tải được bài đã lưu');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [active]
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const pick = (id) => {
    const next = active === id ? null : id;
    setActive(next);
    setLoading(true);
    load(next);
  };

  const doCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await createCollection(newName.trim(), newEmoji);
      setModal(false);
      setNewName('');
      setNewEmoji('📚');
      load();
    } catch (e) {
      Alert.alert('Không tạo được', e.message || 'Có lỗi xảy ra');
    } finally {
      setCreating(false);
    }
  };

  const confirmDelete = (col) =>
    Alert.alert(
      'Xoá bộ sưu tập',
      `Bài trong "${col.name}" sẽ chuyển về bộ mặc định, không bị mất.`,
      [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'Xoá',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCollection(col.id);
              if (active === col.id) setActive(null);
              load(active === col.id ? null : active);
            } catch (e) {
              Alert.alert('Không xoá được', e.message);
            }
          },
        },
      ]
    );

  const totalSaved = collections.reduce((n, c) => n + (c.itemCount || 0), 0);

  const header = (
    <View>
      <View style={{ paddingHorizontal: t.spacing.lg }}>
        <Pressable onPress={() => router.back()} style={s.back} hitSlop={8}>
          <Text style={s.backText}>← Quay lại</Text>
        </Pressable>

        <Text style={s.title}>Đã lưu</Text>
        <Rule style={{ marginBottom: t.spacing.sm }} />
        <Text style={s.subtitle}>
          {totalSaved > 0
            ? `${totalSaved} bài · chỉ mình bạn thấy`
            : 'Chỉ mình bạn thấy danh sách này'}
        </Text>

        <Notice>{error}</Notice>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.chipStrip}
      >
        <Pressable onPress={() => pick(null)} style={[s.chip, !active && s.chipOn]}>
          <Text style={[s.chipText, !active && s.chipTextOn]}>Tất cả</Text>
        </Pressable>

        {collections.map((c) => (
          <Pressable
            key={c.id}
            onPress={() => pick(c.id)}
            onLongPress={() => !c.isDefault && confirmDelete(c)}
            style={[s.chip, active === c.id && s.chipOn]}
          >
            <Text style={[s.chipText, active === c.id && s.chipTextOn]}>
              {c.emoji ? `${c.emoji} ` : ''}
              {c.name} · {c.itemCount}
            </Text>
          </Pressable>
        ))}

        <Pressable onPress={() => setModal(true)} style={s.chipAdd}>
          <Ionicons name="add" size={15} color={t.colors.accentPressed} />
        </Pressable>
      </ScrollView>

      {collections.length > 1 && (
        <Text style={s.tip}>Nhấn giữ một bộ sưu tập để xoá</Text>
      )}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg }}>
      <FlatList
        data={posts}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={header}
        contentContainerStyle={{
          paddingTop: insets.top + t.spacing.md,
          paddingBottom: insets.bottom + t.spacing.xl,
        }}
        renderItem={({ item }) => (
          <SavedCard post={item} onPress={() => router.push(`/post-detail?id=${item.id}`)} />
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={t.colors.accent}
          />
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={t.colors.accent} style={{ marginTop: t.spacing.xl }} />
          ) : (
            <View style={s.empty}>
              <Text style={s.emptyEmoji}>🔖</Text>
              <Text style={s.emptyTitle}>Chưa lưu bài nào</Text>
              <Text style={s.emptyLine}>
                Gặp bài hữu ích — hướng dẫn nhập học, kinh nghiệm xem trọ, gợi ý giảng viên —
                bấm biểu tượng đánh dấu để đọc lại sau.
              </Text>
            </View>
          )
        }
      />

      <Modal visible={modal} transparent animationType="fade" onRequestClose={() => setModal(false)}>
        <Pressable style={s.backdrop} onPress={() => setModal(false)}>
          <Pressable style={s.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={s.sheetTitle}>Bộ sưu tập mới</Text>

            <Text style={s.sheetLabel}>BIỂU TƯỢNG</Text>
            <View style={s.emojiRow}>
              {EMOJI_CHOICES.map((e) => (
                <Pressable
                  key={e}
                  onPress={() => setNewEmoji(e)}
                  style={[s.emojiBtn, newEmoji === e && s.emojiOn]}
                >
                  <Text style={{ fontSize: 18 }}>{e}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={s.sheetLabel}>TÊN</Text>
            <TextInput
              value={newName}
              onChangeText={setNewName}
              placeholder="Kinh nghiệm học tập"
              placeholderTextColor={t.colors.inkMuted}
              maxLength={40}
              style={s.sheetInput}
              autoFocus
            />

            <View style={{ marginTop: t.spacing.lg }}>
              <Button title="Tạo bộ sưu tập" onPress={doCreate} loading={creating} />
            </View>
            <Pressable onPress={() => setModal(false)} style={s.cancel}>
              <Text style={s.cancelText}>Huỷ</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = (t) =>
  StyleSheet.create({
  back: { paddingVertical: t.spacing.sm, marginBottom: t.spacing.sm },
  backText: { ...t.type.label, color: t.colors.accentPressed },
  title: { ...t.type.title, color: t.colors.ink },
  subtitle: { ...t.type.caption, color: t.colors.inkMuted, marginBottom: t.spacing.md },

  chipStrip: { paddingHorizontal: t.spacing.lg, gap: 6, paddingVertical: t.spacing.xs },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.line,
  },
  chipOn: { backgroundColor: t.colors.accent, borderColor: t.colors.accent },
  chipText: { ...t.type.label, color: t.colors.inkMuted },
  chipTextOn: { color: t.colors.onAccent },
  chipAdd: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: t.colors.fill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tip: {
    ...t.type.caption,
    color: t.colors.inkMuted,
    paddingHorizontal: t.spacing.lg,
    marginTop: t.spacing.sm,
  },

  card: {
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.line,
    borderRadius: t.radius.lg,
    padding: t.spacing.md,
    marginHorizontal: t.spacing.lg,
    marginTop: t.spacing.sm,
    ...shadow.card,
  },
  cardHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: t.spacing.sm,
  },
  cat: {
    ...t.type.micro,
    color: t.colors.accentPressed,
    backgroundColor: t.colors.fill,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: t.radius.sm,
    overflow: 'hidden',
  },
  time: { ...t.type.caption, color: t.colors.inkMuted },
  cardTitle: { ...t.type.label, fontSize: 16, color: t.colors.ink, lineHeight: 21 },
  cardBody: { ...t.type.caption, color: t.colors.inkMuted, marginTop: t.spacing.xs },

  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: t.colors.fill,
    borderRadius: t.radius.sm,
    padding: t.spacing.sm,
    marginTop: t.spacing.sm,
  },
  noteText: { ...t.type.caption, color: t.colors.inkBody, flex: 1 },

  cardFoot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: t.spacing.md,
  },
  stats: { flexDirection: 'row', alignItems: 'center' },
  statNum: { ...t.type.caption, color: t.colors.inkMuted, marginLeft: 4 },

  empty: {
    alignItems: 'center',
    paddingHorizontal: t.spacing.xl,
    marginTop: t.spacing.xxl,
  },
  emptyEmoji: { fontSize: 40, marginBottom: t.spacing.md },
  emptyTitle: { ...t.type.heading, color: t.colors.ink, marginBottom: t.spacing.sm },
  emptyLine: { ...t.type.body, color: t.colors.inkMuted, textAlign: 'center' },

  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(30,27,75,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: t.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: t.spacing.lg,
    paddingBottom: t.spacing.xl,
  },
  sheetTitle: { ...t.type.heading, color: t.colors.ink, marginBottom: t.spacing.lg },
  sheetLabel: { ...t.type.micro, color: t.colors.inkMuted, marginBottom: t.spacing.sm },
  emojiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: t.spacing.md },
  emojiBtn: {
    width: 40,
    height: 40,
    borderRadius: t.radius.md,
    backgroundColor: t.colors.bg,
    borderWidth: 1,
    borderColor: t.colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiOn: { borderColor: t.colors.accent, backgroundColor: t.colors.fill, borderWidth: 2 },
  sheetInput: {
    fontFamily: t.fonts.regular,
    fontSize: 16,
    color: t.colors.ink,
    backgroundColor: t.colors.bg,
    borderWidth: 1,
    borderColor: t.colors.line,
    borderRadius: t.radius.md,
    paddingHorizontal: t.spacing.md,
    paddingVertical: 13,
  },
  cancel: { alignItems: 'center', paddingVertical: t.spacing.md, marginTop: t.spacing.xs },
  cancelText: { ...t.type.label, color: t.colors.inkMuted },
});
