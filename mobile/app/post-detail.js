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
import { Ionicons } from '@expo/vector-icons';
import { Notice, Rule } from '../src/components/ui';
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
import { colors, radius, spacing, type } from '../src/theme';

export default function PostDetail() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams();

  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
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
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <ScrollView
        contentContainerStyle={[
          s.scroll,
          { paddingTop: insets.top + spacing.md, paddingBottom: spacing.xl },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.topBar}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Text style={s.backText}>← Quay lại</Text>
          </Pressable>
          {post?.canDelete && (
            <Pressable onPress={removePost} hitSlop={8}>
              <Text style={s.deleteText}>Xoá bài</Text>
            </Pressable>
          )}
        </View>

        <Notice>{error}</Notice>

        {post && (
          <>
            <View style={s.postHead}>
              <Text style={s.cat}>{categoryLabel(post.category)}</Text>
              <Text style={s.time}>{timeAgo(post.createdAt)}</Text>
            </View>

            <Text style={s.title}>{post.title}</Text>
            <Rule style={{ marginBottom: spacing.md }} />

            <Text style={s.author}>{post.author?.displayName}</Text>
            <Text style={s.body}>{post.content}</Text>

            <View style={s.actions}>
              <Pressable onPress={likePost} style={s.likeBtn} hitSlop={6}>
                <Ionicons
                  name={post.likedByMe ? 'heart' : 'heart-outline'}
                  size={18}
                  color={post.likedByMe ? colors.brand : colors.inkMuted}
                />
                <Text style={[s.likeNum, post.likedByMe && { color: colors.brand }]}>
                  {post.likeCount}
                </Text>
              </Pressable>
              <Text style={s.views}>{post.views} lượt xem</Text>
            </View>
          </>
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
                      color={c.likedByMe ? colors.brand : colors.inkFaint}
                    />
                    <Text style={[s.likeNumSm, c.likedByMe && { color: colors.brand }]}>
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

      <View style={[s.composer, { paddingBottom: insets.bottom + spacing.sm }]}>
        <Pressable
          onPress={() => setAnonymous((a) => !a)}
          style={[s.anonToggle, anonymous && s.anonOn]}
          hitSlop={6}
        >
          <Ionicons
            name={anonymous ? 'eye-off' : 'eye-outline'}
            size={16}
            color={anonymous ? colors.white : colors.inkMuted}
          />
        </Pressable>

        <TextInput
          style={s.input}
          value={text}
          onChangeText={setText}
          placeholder={anonymous ? 'Bình luận ẩn danh…' : 'Bình luận công khai…'}
          placeholderTextColor={colors.inkFaint}
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
            <ActivityIndicator color={colors.white} size="small" />
          ) : (
            <Ionicons name="arrow-up" size={18} color={colors.white} />
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  scroll: { paddingHorizontal: spacing.lg },

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  backText: { ...type.label, color: colors.brandDeep },
  deleteText: { ...type.label, color: colors.dangerInk },

  postHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
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

  title: { ...type.title, fontSize: 23, color: colors.ink, marginTop: spacing.sm },
  author: { ...type.label, color: colors.inkMuted, marginBottom: spacing.md },
  body: { ...type.body, color: colors.ink },

  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  likeBtn: { flexDirection: 'row', alignItems: 'center' },
  likeNum: { ...type.label, color: colors.inkMuted, marginLeft: 6 },
  likeNumSm: { ...type.caption, color: colors.inkFaint, marginLeft: 4 },
  views: { ...type.caption, color: colors.inkFaint },

  commentsLabel: { ...type.micro, color: colors.inkFaint, marginTop: spacing.lg, marginBottom: spacing.md },
  noComment: { ...type.caption, color: colors.inkFaint },

  comment: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  commentHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  commentAuthor: { ...type.label, color: colors.inkMuted },
  // Chủ bài viết được đánh dấu khác màu để dễ theo mạch hội thoại
  commentAuthorOp: { color: colors.brandDeep },
  commentText: { ...type.body, fontSize: 15, color: colors.ink },
  commentDeleted: { color: colors.inkFaint, fontStyle: 'italic' },
  commentFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  removeSm: { ...type.caption, color: colors.dangerInk },

  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  anonToggle: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  anonOn: { backgroundColor: colors.brand, borderColor: colors.brand },
  input: {
    flex: 1,
    ...type.body,
    fontSize: 15,
    color: colors.ink,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingTop: 9,
    paddingBottom: 9,
    maxHeight: 110,
  },
  send: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
