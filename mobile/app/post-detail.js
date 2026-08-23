import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
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
import { Ionicons } from '@expo/vector-icons';
import { AuthorName, Notice, Rule } from '../src/components/ui';
import {
  savePost as apiSavePost,
  unsavePost as apiUnsavePost,
  fetchCollections,
} from '../src/api/bookmarks';
import {
  fetchPost,
  fetchComments,
  createComment,
  deleteComment,
  togglePostLike,
  toggleCommentLike,
  deletePost,
  categoryLabel,
  timeAgo,
} from '../src/api/community';
import { useTheme, useThemedStyles } from '../src/store/theme';

export default function PostDetail() {
  const t = useTheme();
  const s = useThemedStyles(styles);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams();

  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [collections, setCollections] = useState([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [anonymous, setAnonymous] = useState(true);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const [p, c] = await Promise.all([fetchPost(id), fetchComments(id)]);
      setPost(p);
      setComments(c.comments || []);
      fetchCollections().then(setCollections).catch(() => {});
    } catch (e) {
      setError(e.message || 'Không tải được bài viết');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const likePost = async () => {
    if (!post) return;
    // Cập nhật ngay trên giao diện, không đợi máy chủ
    setPost((p) => ({
      ...p,
      likedByMe: !p.likedByMe,
      likeCount: p.likeCount + (p.likedByMe ? -1 : 1),
    }));
    try {
      const data = await togglePostLike(id);
      setPost((p) => ({ ...p, likedByMe: data.liked, likeCount: data.likeCount }));
    } catch {
      load();
    }
  };

  /** Bấm nhanh = lưu vào bộ mặc định. Nhấn giữ = chọn bộ sưu tập. */
  const toggleSave = async () => {
    if (!post) return;
    const next = !post.savedByMe;
    setPost((p) => ({ ...p, savedByMe: next }));

    try {
      if (next) await apiSavePost(id);
      else await apiUnsavePost(id);
    } catch (e) {
      setPost((p) => ({ ...p, savedByMe: !next }));
      setError(e.message || 'Không lưu được');
    }
  };

  const saveTo = async (collectionId) => {
    setPickerOpen(false);
    try {
      const res = await apiSavePost(id, collectionId);
      setPost((p) => ({ ...p, savedByMe: true }));
      fetchCollections().then(setCollections).catch(() => {});
      if (res?.message) Alert.alert('Đã lưu', res.message);
    } catch (e) {
      setError(e.message || 'Không lưu được');
    }
  };

  const likeComment = async (cid) => {
    setComments((cs) =>
      cs.map((c) =>
        c.id === cid
          ? { ...c, likedByMe: !c.likedByMe, likeCount: c.likeCount + (c.likedByMe ? -1 : 1) }
          : c
      )
    );
    try {
      const data = await toggleCommentLike(cid);
      setComments((cs) =>
        cs.map((c) => (c.id === cid ? { ...c, likedByMe: data.liked, likeCount: data.likeCount } : c))
      );
    } catch {
      load();
    }
  };

  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      const comment = await createComment(id, { text: text.trim(), isAnonymous: anonymous });
      setComments((cs) => [...cs, comment]);
      setText('');
      setPost((p) => (p ? { ...p, commentCount: p.commentCount + 1 } : p));
    } catch (e) {
      setError(e.message || 'Không gửi được bình luận');
    } finally {
      setSending(false);
    }
  };

  const removeComment = (cid) =>
    Alert.alert('Xoá bình luận', 'Bình luận sẽ bị xoá khỏi bài viết.', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xoá',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteComment(cid);
            setComments((cs) => cs.filter((c) => c.id !== cid));
          } catch (e) {
            setError(e.message);
          }
        },
      },
    ]);

  const removePost = () =>
    Alert.alert('Xoá bài viết', 'Bài viết và toàn bộ bình luận sẽ bị ẩn đi.', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xoá',
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePost(id);
            router.back();
          } catch (e) {
            setError(e.message);
          }
        },
      },
    ]);

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={t.colors.accent} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: t.colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <ScrollView
        contentContainerStyle={[
          s.scroll,
          { paddingTop: insets.top + t.spacing.md, paddingBottom: t.spacing.xl },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.topBar}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Text style={s.backText}>← Quay lại</Text>
          </Pressable>
          <View style={s.topActions}>
            <Pressable
              onPress={toggleSave}
              onLongPress={() => setPickerOpen(true)}
              hitSlop={8}
              accessibilityLabel="Lưu bài viết"
            >
              <Ionicons
                name={post?.savedByMe ? 'bookmark' : 'bookmark-outline'}
                size={21}
                color={post?.savedByMe ? t.colors.accent : t.colors.inkMuted}
              />
            </Pressable>
            {post?.canDelete && (
              <Pressable onPress={removePost} hitSlop={8}>
                <Text style={s.deleteText}>Xoá bài</Text>
              </Pressable>
            )}
          </View>
        </View>

        <Notice>{error}</Notice>

        {post && (
          <>
            <View style={s.postHead}>
              <Text style={s.cat}>{categoryLabel(post.category)}</Text>
              <Text style={s.time}>{timeAgo(post.createdAt)}</Text>
            </View>

            <Text style={s.title}>{post.title}</Text>
            <Rule style={{ marginBottom: t.spacing.md }} />

            <AuthorName author={post.author} size={14} style={s.authorLine} />
            <Text style={s.body}>{post.content}</Text>

            <View style={s.actions}>
              <Pressable onPress={likePost} style={s.likeBtn} hitSlop={6}>
                <Ionicons
                  name={post.likedByMe ? 'heart' : 'heart-outline'}
                  size={18}
                  color={post.likedByMe ? t.colors.accent : t.colors.inkMuted}
                />
                <Text style={[s.likeNum, post.likedByMe && { color: t.colors.accent }]}>
                  {post.likeCount}
                </Text>
              </Pressable>
              <View style={s.rightActions}>
                <Text style={s.views}>{post.views} lượt xem</Text>
                <Pressable onPress={() => setPickerOpen(true)} hitSlop={6}>
                  <Text style={s.saveTo}>
                    {post.savedByMe ? 'Đổi bộ sưu tập' : 'Lưu vào…'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </>
        )}

        {!post?.isMine && !post?.isOfficial && (
          <Pressable onPress={() => router.push(`/chat?post=${id}`)} style={s.dmRow}>
            <Ionicons name="chatbubble-outline" size={16} color={t.colors.ink} />
            <Text style={s.dmText}>Nhắn riêng cho tác giả</Text>
            <Ionicons name="chevron-forward" size={15} color={t.colors.icon} />
          </Pressable>
        )}

        <Text style={s.commentsLabel}>
          BÌNH LUẬN {comments.length > 0 ? `(${comments.length})` : ''}
        </Text>

        {comments.length === 0 ? (
          <Text style={s.noComment}>Chưa có bình luận. Bạn là người đầu tiên.</Text>
        ) : (
          comments.map((c) => (
            <View key={c.id} style={s.comment}>
              <View style={s.commentHead}>
                <Text
                  style={[
                    s.commentAuthor,
                    c.author?.displayName?.startsWith('Tác giả') && s.commentAuthorOp,
                  ]}
                >
                  {c.author?.displayName}
                </Text>
                <Text style={s.time}>{timeAgo(c.createdAt)}</Text>
              </View>

              <Text style={[s.commentText, c.isDeleted && s.commentDeleted]}>{c.text}</Text>

              {!c.isDeleted && (
                <View style={s.commentFoot}>
                  <Pressable onPress={() => likeComment(c.id)} style={s.likeBtn} hitSlop={6}>
                    <Ionicons
                      name={c.likedByMe ? 'heart' : 'heart-outline'}
                      size={14}
                      color={c.likedByMe ? t.colors.accent : t.colors.inkMuted}
                    />
                    <Text style={[s.likeNumSm, c.likedByMe && { color: t.colors.accent }]}>
                      {c.likeCount}
                    </Text>
                  </Pressable>
                  {c.canDelete && (
                    <Pressable onPress={() => removeComment(c.id)} hitSlop={6}>
                      <Text style={s.removeSm}>Xoá</Text>
                    </Pressable>
                  )}
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>

      <Modal
        visible={pickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerOpen(false)}
      >
        <Pressable style={s.backdrop} onPress={() => setPickerOpen(false)}>
          <Pressable style={s.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={s.sheetTitle}>Lưu vào bộ sưu tập</Text>
            {collections.map((c) => (
              <Pressable key={c.id} onPress={() => saveTo(c.id)} style={s.colRow}>
                <Text style={s.colName}>
                  {c.emoji ? `${c.emoji}  ` : ''}
                  {c.name}
                </Text>
                <Text style={s.colCount}>{c.itemCount}</Text>
              </Pressable>
            ))}
            <Pressable
              onPress={() => {
                setPickerOpen(false);
                router.push('/saved');
              }}
              style={s.colRow}
            >
              <Text style={[s.colName, { color: t.colors.accentPressed }]}>+  Tạo bộ sưu tập mới</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <View style={[s.composer, { paddingBottom: insets.bottom + t.spacing.sm }]}>
        <Pressable
          onPress={() => setAnonymous((a) => !a)}
          style={[s.anonToggle, anonymous && s.anonOn]}
          hitSlop={6}
        >
          <Ionicons
            name={anonymous ? 'eye-off' : 'eye-outline'}
            size={16}
            color={anonymous ? t.colors.onAccent : t.colors.inkMuted}
          />
        </Pressable>

        <TextInput
          style={s.input}
          value={text}
          onChangeText={setText}
          placeholder={anonymous ? 'Bình luận ẩn danh…' : 'Bình luận công khai…'}
          placeholderTextColor={t.colors.inkMuted}
          multiline
          maxLength={1000}
        />

        <Pressable
          onPress={send}
          disabled={!text.trim() || sending}
          style={[s.send, (!text.trim() || sending) && { opacity: 0.4 }]}
          hitSlop={6}
        >
          {sending ? (
            <ActivityIndicator color={t.colors.onAccent} size="small" />
          ) : (
            <Ionicons name="arrow-up" size={18} color={t.colors.onAccent} />
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = (t) =>
  StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.colors.bg },
  scroll: { paddingHorizontal: t.spacing.lg },

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: t.spacing.sm,
    marginBottom: t.spacing.sm,
  },
  backText: { ...t.type.label, color: t.colors.accentPressed },
  deleteText: { ...t.type.label, color: t.colors.alertInk },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.md },
  rightActions: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.md },
  saveTo: { ...t.type.caption, color: t.colors.accentPressed },
  dmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.sm,
    borderWidth: 1,
    borderColor: t.colors.lineStrong,
    borderRadius: t.radius.md,
    paddingHorizontal: t.spacing.md,
    paddingVertical: 13,
    marginTop: t.spacing.md,
  },
  dmText: { ...t.type.label, color: t.colors.ink, flex: 1 },

  backdrop: { flex: 1, backgroundColor: 'rgba(30,27,75,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: t.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: t.spacing.lg,
    paddingBottom: t.spacing.xl,
  },
  sheetTitle: { ...t.type.heading, color: t.colors.ink, marginBottom: t.spacing.md },
  colRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.line,
  },
  colName: { ...t.type.body, fontSize: 15, color: t.colors.ink },
  colCount: { ...t.type.caption, color: t.colors.inkMuted },

  postHead: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm },
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

  title: { ...t.type.title, fontSize: 23, color: t.colors.ink, marginTop: t.spacing.sm },
  authorLine: { marginBottom: t.spacing.md },
  body: { ...t.type.body, color: t.colors.ink },

  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: t.spacing.lg,
    paddingBottom: t.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.line,
  },
  likeBtn: { flexDirection: 'row', alignItems: 'center' },
  likeNum: { ...t.type.label, color: t.colors.inkMuted, marginLeft: 6 },
  likeNumSm: { ...t.type.caption, color: t.colors.inkMuted, marginLeft: 4 },
  views: { ...t.type.caption, color: t.colors.inkMuted },

  commentsLabel: { ...t.type.micro, color: t.colors.inkMuted, marginTop: t.spacing.lg, marginBottom: t.spacing.md },
  noComment: { ...t.type.caption, color: t.colors.inkMuted },

  comment: {
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.line,
    borderRadius: t.radius.md,
    padding: t.spacing.md,
    marginBottom: t.spacing.sm,
  },
  commentHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  commentAuthor: { ...t.type.label, color: t.colors.inkMuted },
  // Chủ bài viết được đánh dấu khác màu để dễ theo mạch hội thoại
  commentAuthorOp: { color: t.colors.accentPressed },
  commentText: { ...t.type.body, fontSize: 15, color: t.colors.ink },
  commentDeleted: { color: t.colors.inkMuted, fontStyle: 'italic' },
  commentFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: t.spacing.sm,
  },
  removeSm: { ...t.type.caption, color: t.colors.alertInk },

  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: t.spacing.sm,
    paddingHorizontal: t.spacing.md,
    paddingTop: t.spacing.sm,
    backgroundColor: t.colors.surface,
    borderTopWidth: 1,
    borderTopColor: t.colors.line,
  },
  anonToggle: {
    width: 38,
    height: 38,
    borderRadius: t.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.bg,
    borderWidth: 1,
    borderColor: t.colors.line,
  },
  anonOn: { backgroundColor: t.colors.accent, borderColor: t.colors.accent },
  input: {
    flex: 1,
    ...t.type.body,
    fontSize: 15,
    color: t.colors.ink,
    backgroundColor: t.colors.bg,
    borderWidth: 1,
    borderColor: t.colors.line,
    borderRadius: t.radius.md,
    paddingHorizontal: t.spacing.md,
    paddingTop: 9,
    paddingBottom: 9,
    maxHeight: 110,
  },
  send: {
    width: 38,
    height: 38,
    borderRadius: t.radius.md,
    backgroundColor: t.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
