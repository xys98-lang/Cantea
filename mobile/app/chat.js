import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button, Callout } from '../src/components/ui';
import { Thumb } from '../src/components/Thumb';
import {
  fetchMessages,
  sendMessage,
  startConversation,
  revealIdentity,
  blockConversation,
  reportConversation,
  archiveConversation,
  clockTime,
  QUICK_REPLIES,
} from '../src/api/messages';
import { dealLabel } from '../src/api/listings';
import { pickImages, uploadImages } from '../src/api/upload';
import { useTheme, useThemedStyles } from '../src/store/theme';

export default function Chat() {
  const t = useTheme();
  const s = useThemedStyles(styles);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const listRef = useRef(null);

  /**
   * Ba đường vào:
   *   ?id=       — mở hội thoại đã có
   *   ?listing=  — nhắn cho người bán, chưa có hội thoại
   *   ?post=     — nhắn cho tác giả bài viết, chưa có hội thoại
   */
  const [convoId, setConvoId] = useState(params.id ? String(params.id) : null);
  const ctxType = params.listing ? 'listing' : params.post ? 'post' : null;
  const ctxId = params.listing ? String(params.listing) : params.post ? String(params.post) : null;

  const [convo, setConvo] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  /** Cảnh báo trước khi gửi thông tin liên hệ */
  const [warn, setWarn] = useState(null);
  /** Bảng mời hiện danh tính khi thao tác bị chặn vì đang ẩn */
  const [gate, setGate] = useState(null);

  const load = useCallback(async () => {
    setError('');
    try {
      if (convoId) {
        const data = await fetchMessages(convoId);
        setConvo(data.conversation);
        setMessages(data.messages || []);
      } else {
        setConvo(null);
        setMessages([]);
      }
    } catch (e) {
      setError(e.message || 'Không tải được hội thoại');
    } finally {
      setLoading(false);
    }
  }, [convoId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleViolation = (e, retry) => {
    if (e.code === 'CONTACT_INFO_DETECTED') {
      setWarn({ message: e.message, detail: e.detail, retry });
      return true;
    }
    if (e.needsIdentity) {
      setGate({ message: e.message, detail: e.detail, retry });
      return true;
    }
    return false;
  };

  const doSend = async ({ body = '', images = [], confirmContact = false } = {}) => {
    if (!body.trim() && !images.length) return;

    setSending(true);
    setError('');
    try {
      if (!convoId) {
        const created = await startConversation(ctxType, ctxId, body, { confirmContact });
        setConvoId(created.id);
        setConvo(created);
        const data = await fetchMessages(created.id);
        setMessages(data.messages || []);
      } else {
        const msg = await sendMessage(convoId, { text: body, images, confirmContact });
        setMessages((ms) => [...ms, msg]);
      }
      setText('');
      setWarn(null);
      setGate(null);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 60);
    } catch (e) {
      const handled = handleViolation(e, () =>
        doSend({ body, images, confirmContact: true })
      );
      if (!handled) setError(e.message || 'Không gửi được tin nhắn');
    } finally {
      setSending(false);
    }
  };

  const attach = async () => {
    // Chặn trước ở giao diện — đỡ phải tải ảnh lên rồi mới bị từ chối
    if (convo?.iAmAnonymous) {
      setGate({
        message: 'Không gửi được ảnh khi đang nhắn ẩn danh.',
        detail:
          'Ảnh mang theo nhiều dấu vết hơn bạn nghĩ — vị trí chụp, khuôn mặt, ' +
          'nét chữ, phông nền phòng. Hiện danh tính để gửi được ảnh.',
      });
      return;
    }

    setUploading(true);
    try {
      const assets = await pickImages(3);
      if (!assets.length) return;
      const uploaded = await uploadImages(assets, 'post');
      await doSend({ body: text, images: uploaded.map((i) => i.url) });
    } catch (e) {
      setError(e.message || 'Không gửi được ảnh');
    } finally {
      setUploading(false);
    }
  };

  const reveal = () =>
    Alert.alert(
      'Hiện danh tính',
      'Đối phương sẽ thấy biệt danh, ngành và khoá của bạn. Đổi lại, bạn gửi được ảnh và đường link.\n\nKhông thu lại được — họ đã nhìn thấy thì không quên đi được.',
      [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'Hiện danh tính',
          onPress: async () => {
            try {
              const r = await revealIdentity(convoId);
              setGate(null);
              Alert.alert('Đã hiện', r.message);
              load();
            } catch (e) {
              Alert.alert('Lỗi', e.message);
            }
          },
        },
      ]
    );

  const openMenu = () =>
    Alert.alert('Tuỳ chọn', undefined, [
      {
        text: 'Báo cáo hội thoại',
        onPress: () =>
          Alert.prompt?.('Báo cáo', 'Cho biết vấn đề bạn gặp phải', async (reason) => {
            if (!reason?.trim()) return;
            try {
              const r = await reportConversation(convoId, reason.trim());
              Alert.alert('Đã gửi', r.message);
            } catch (e) {
              Alert.alert('Lỗi', e.message);
            }
          }),
      },
      {
        text: convo?.blocked ? 'Bỏ chặn' : 'Chặn người này',
        style: 'destructive',
        onPress: async () => {
          try {
            const r = await blockConversation(convoId);
            Alert.alert('Xong', r.message);
            load();
          } catch (e) {
            Alert.alert('Lỗi', e.message);
          }
        },
      },
      {
        text: 'Ẩn hội thoại',
        onPress: async () => {
          try {
            await archiveConversation(convoId);
            router.back();
          } catch (e) {
            Alert.alert('Lỗi', e.message);
          }
        },
      },
      { text: 'Đóng', style: 'cancel' },
    ]);

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={t.colors.ink} />
      </View>
    );
  }

  const ctx = convo?.context;
  const isPost = (convo?.contextType || ctxType) === 'post';
  const closed = ctx?.kind === 'listing' && ctx?.status === 'sold';
  const isFirst = !convoId;
  const quick = QUICK_REPLIES[isPost ? 'post' : 'listing'];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: t.colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* ===== Thanh trên cố định ===== */}
      <View style={[s.top, { paddingTop: insets.top + t.spacing.sm }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={23} color={t.colors.ink} />
        </Pressable>

        <View style={{ flex: 1 }}>
          <View style={s.topNameRow}>
            <Text style={s.topName} numberOfLines={1}>
              {convo?.other?.displayName || (isPost ? 'Tác giả' : 'Người bán')}
            </Text>
            {/*
              Huy hiệu xác thực hiện cả khi đối phương ẩn danh. Người sắp
              hẹn gặp người lạ cần biết đó là sinh viên thật đã xác thực —
              không có tín hiệu này thì họ không trả lời.
            */}
            {Boolean(convo?.other?.isVerified) && (
              <Ionicons name="shield-checkmark" size={13} color={t.colors.inkMuted} />
            )}
          </View>
          {Boolean(convo?.other?.major || convo?.other?.university) && (
            <Text style={s.topMeta} numberOfLines={1}>
              {[
                convo.other.major,
                convo.other.year ? `K${convo.other.year}` : null,
                convo.other.university?.shortName,
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          )}
        </View>

        {Boolean(convoId) && (
          <Pressable onPress={openMenu} hitSlop={8}>
            <Ionicons name="ellipsis-horizontal" size={20} color={t.colors.ink} />
          </Pressable>
        )}
      </View>

      {/* Thẻ nội dung gốc ghim trên đầu */}
      {Boolean(ctx) && (
        <Pressable
          onPress={() =>
            router.push(
              ctx.kind === 'listing'
                ? `/listing-detail?id=${ctx.id}`
                : `/post-detail?id=${ctx.id}`
            )
          }
          style={s.pinned}
        >
          <Thumb
            uri={ctx.image}
            size={40}
            icon={ctx.kind === 'listing' ? 'book-outline' : 'document-text-outline'}
          />
          <View style={{ flex: 1 }}>
            <Text style={s.pinTitle} numberOfLines={1}>
              {ctx.title}
            </Text>
            <Text style={s.pinSub}>
              {ctx.kind === 'listing' ? (closed ? 'Đã bán' : dealLabel(ctx)) : 'Bài viết'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={t.colors.icon} />
        </Pressable>
      )}

      {/* ===== Tin nhắn ===== */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => String(m.id)}
        contentContainerStyle={s.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        renderItem={({ item }) =>
          item.kind === 'system' ? (
            <Text style={s.system}>{item.text}</Text>
          ) : (
            <View style={[s.bubbleRow, item.fromMe && { justifyContent: 'flex-end' }]}>
              <View style={[s.bubble, item.fromMe ? s.bubbleMine : s.bubbleTheirs]}>
                {item.images?.length > 0 && (
                  <View style={s.imgRow}>
                    {item.images.map((uri, i) => (
                      <Thumb key={i} uri={uri} size={96} />
                    ))}
                  </View>
                )}
                {Boolean(item.text) && (
                  <Text style={[s.bubbleText, item.fromMe && { color: t.colors.inverse }]}>
                    {item.text}
                  </Text>
                )}
                <Text style={[s.bubbleTime, item.fromMe && { color: 'rgba(255,255,255,0.6)' }]}>
                  {clockTime(item.createdAt)}
                </Text>
              </View>
            </View>
          )
        }
        ListHeaderComponent={
          <>
            {Boolean(error) && <Callout tone="warn">{error}</Callout>}

            {convo?.iAmAnonymous && (
              <View style={s.anonBar}>
                <Ionicons name="eye-off-outline" size={14} color={t.colors.inkBody} />
                <Text style={s.anonText}>
                  Đang ẩn danh. Đối phương thấy huy hiệu đã xác thực và tên trường của
                  bạn, nhưng không thấy tên. Chỉ gửi được chữ.
                </Text>
                <Pressable onPress={reveal} hitSlop={6}>
                  <Text style={s.anonLink}>Hiện</Text>
                </Pressable>
              </View>
            )}

            {isFirst && (
              <Callout style={{ marginBottom: t.spacing.md }}>
                {isPost
                  ? 'Đây là tin nhắn riêng, không ai khác đọc được. Tác giả có thể chọn không trả lời.'
                  : 'Cantea không giữ tiền hộ — hẹn gặp ở nơi đông người trong trường, xem hàng rồi mới trả tiền.'}
              </Callout>
            )}
          </>
        }
      />

      {isFirst && (
        <View style={s.quickRow}>
          {quick.map((q) => (
            <Pressable key={q} onPress={() => doSend({ body: q })} style={s.quick}>
              <Text style={s.quickText}>{q}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* ===== Ô soạn ===== */}
      <View style={[s.composer, { paddingBottom: insets.bottom + t.spacing.sm }]}>
        <Pressable
          onPress={attach}
          disabled={uploading || closed}
          style={[s.attach, convo?.iAmAnonymous && s.attachOff]}
          hitSlop={6}
          accessibilityLabel="Gửi ảnh"
        >
          {uploading ? (
            <ActivityIndicator color={t.colors.inkMuted} size="small" />
          ) : (
            <Ionicons
              name="image-outline"
              size={20}
              color={convo?.iAmAnonymous ? t.colors.icon : t.colors.inkBody}
            />
          )}
        </Pressable>

        <TextInput
          style={s.input}
          value={text}
          onChangeText={setText}
          placeholder={closed ? 'Tin này đã bán' : 'Nhắn tin…'}
          placeholderTextColor={t.colors.icon}
          editable={!closed}
          multiline
          maxLength={1000}
        />

        <Pressable
          onPress={() => doSend({ body: text })}
          disabled={!text.trim() || sending || closed}
          style={[s.send, (!text.trim() || sending || closed) && { opacity: 0.35 }]}
          hitSlop={6}
        >
          {sending ? (
            <ActivityIndicator color={t.colors.inverse} size="small" />
          ) : (
            <Ionicons name="arrow-up" size={18} color={t.colors.inverse} />
          )}
        </Pressable>
      </View>

      {/* ===== Xác nhận gửi thông tin liên hệ ===== */}
      <Modal visible={Boolean(warn)} transparent animationType="fade">
        <Pressable style={s.backdrop} onPress={() => setWarn(null)}>
          <Pressable style={s.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={s.sheetTitle}>{warn?.message}</Text>
            <Text style={s.sheetBody}>{warn?.detail}</Text>
            <Button title="Vẫn gửi" onPress={() => warn?.retry?.()} />
            <Pressable onPress={() => setWarn(null)} style={s.cancel}>
              <Text style={s.cancelText}>Sửa lại tin nhắn</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ===== Mời hiện danh tính khi bị chặn ===== */}
      <Modal visible={Boolean(gate)} transparent animationType="fade">
        <Pressable style={s.backdrop} onPress={() => setGate(null)}>
          <Pressable style={s.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={s.sheetTitle}>{gate?.message}</Text>
            <Text style={s.sheetBody}>{gate?.detail}</Text>

            <View style={s.tradeoff}>
              <Text style={s.tradeoffTitle}>Nếu hiện danh tính</Text>
              <Text style={s.tradeoffLine}>
                Đối phương thấy biệt danh, ngành, khoá của bạn — và không thu lại được.
              </Text>
              <Text style={s.tradeoffLine}>Đổi lại, bạn gửi được ảnh và đường link.</Text>
            </View>

            <Button title="Hiện danh tính" onPress={reveal} />
            <Pressable onPress={() => setGate(null)} style={s.cancel}>
              <Text style={s.cancelText}>Giữ ẩn danh</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = (t) =>
  StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.colors.bg },

  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.md,
    paddingHorizontal: t.spacing.screen,
    paddingBottom: t.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.line,
    backgroundColor: t.colors.bg,
  },
  topNameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  topName: { ...t.type.itemTitle, color: t.colors.ink, flexShrink: 1 },
  topMeta: { ...t.type.caption, fontSize: 11, color: t.colors.inkMuted },

  pinned: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.md,
    paddingHorizontal: t.spacing.screen,
    paddingVertical: 10,
    backgroundColor: t.colors.raised,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.line,
  },
  pinTitle: { ...t.type.caption, fontFamily: t.fonts.semibold, color: t.colors.ink },
  pinSub: { ...t.type.caption, fontSize: 11.5, color: t.colors.inkMuted, marginTop: 1 },

  list: { paddingHorizontal: t.spacing.screen, paddingVertical: t.spacing.md, gap: t.spacing.sm },

  anonBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: t.colors.raised,
    borderRadius: t.radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: t.spacing.md,
  },
  anonText: { ...t.type.caption, fontSize: 11.5, color: t.colors.inkBody, flex: 1 },
  anonLink: { fontFamily: t.fonts.bold, fontSize: 11.5, color: t.colors.ink },

  system: { ...t.type.caption, fontSize: 11, color: t.colors.inkMuted, textAlign: 'center' },

  bubbleRow: { flexDirection: 'row' },
  bubble: { maxWidth: '78%', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8 },
  bubbleMine: { backgroundColor: t.colors.ink, borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: t.colors.fill, borderBottomLeftRadius: 4 },
  bubbleText: { ...t.type.body, fontSize: 14, color: t.colors.ink },
  bubbleTime: { fontFamily: t.fonts.regular, fontSize: 9.5, color: t.colors.inkMuted, marginTop: 3 },

  imgRow: { flexDirection: 'row', gap: 4, marginBottom: 6 },

  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: t.spacing.screen },
  quick: {
    borderWidth: 1,
    borderColor: t.colors.lineStrong,
    borderRadius: t.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  quickText: { fontFamily: t.fonts.medium, fontSize: 12, color: t.colors.inkBody },

  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: t.spacing.sm,
    paddingHorizontal: t.spacing.screen,
    paddingTop: t.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: t.colors.line,
    backgroundColor: t.colors.surface,
  },
  attach: { width: 36, height: 38, alignItems: 'center', justifyContent: 'center' },
  attachOff: { opacity: 0.5 },
  input: {
    flex: 1,
    ...t.type.body,
    fontSize: 14,
    color: t.colors.ink,
    backgroundColor: t.colors.raised,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxHeight: 110,
  },
  send: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: t.colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },

  backdrop: { flex: 1, backgroundColor: 'rgba(20,20,20,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: t.colors.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: t.spacing.lg,
    paddingBottom: t.spacing.xl,
  },
  sheetTitle: { ...t.type.heading, fontSize: 17, color: t.colors.ink },
  sheetBody: { ...t.type.body, color: t.colors.inkMuted, marginTop: t.spacing.sm },

  tradeoff: {
    backgroundColor: t.colors.raised,
    borderLeftWidth: 3,
    borderLeftColor: t.colors.ink,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    padding: 13,
    marginTop: t.spacing.md,
    gap: 4,
  },
  tradeoffTitle: { ...t.type.captionStrong, color: t.colors.ink },
  tradeoffLine: { ...t.type.caption, color: t.colors.inkBody },

  cancel: { alignItems: 'center', paddingVertical: t.spacing.md },
  cancelText: { ...t.type.label, color: t.colors.inkMuted },
});
