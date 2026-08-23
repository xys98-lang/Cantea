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
import { Callout, EmptyState, Rule } from '../src/components/ui';
import { Thumb } from '../src/components/Thumb';
import { fetchConversations, timeShort } from '../src/api/messages';
import { useTheme, useThemedStyles } from '../src/store/theme';

const Row = ({ item, onPress }) => {
  const t = useTheme();
  const s = useThemedStyles(styles);

  const closed = item.context?.status === 'sold';

  return (
    <Pressable onPress={onPress} style={s.row}>
      <View>
        <Thumb
          uri={item.context?.image}
          size={52}
          icon={item.contextType === 'post' ? 'document-text-outline' : 'book-outline'}
        />
        {closed && <View style={s.thumbVeil} />}
      </View>

      <View style={{ flex: 1 }}>
        <View style={s.nameRow}>
          <Text style={s.name} numberOfLines={1}>
            {item.other?.displayName}
          </Text>
          {item.iAmAnonymous && (
            <Ionicons name="eye-off-outline" size={12} color={t.colors.inkMuted} />
          )}
          <View style={{ flex: 1 }} />
          <Text style={s.time}>{timeShort(item.lastMessage?.at || item.updatedAt)}</Text>
        </View>

        <Text style={s.listing} numberOfLines={1}>
          {closed ? 'Đã bán · ' : ''}
          {item.context?.title || 'Nội dung đã xoá'}
        </Text>

        <View style={s.previewRow}>
          <Text style={[s.preview, item.unread > 0 && s.previewUnread]} numberOfLines={1}>
            {item.lastMessage
              ? `${item.lastMessage.fromMe ? 'Bạn: ' : ''}${item.lastMessage.text}`
              : 'Chưa có tin nhắn'}
          </Text>
          {item.unread > 0 && (
            <View style={s.badge}>
              <Text style={s.badgeText}>{item.unread > 9 ? '9+' : item.unread}</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
};

export default function Messages() {
  const t = useTheme();
  const s = useThemedStyles(styles);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await fetchConversations();
      setItems(data.conversations || []);
    } catch (e) {
      setError(e.message || 'Không tải được hội thoại');
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

  const header = (
    <View style={{ paddingHorizontal: t.spacing.screen }}>
      <Pressable onPress={() => router.back()} style={s.back} hitSlop={8}>
        <Text style={s.backText}>← Quay lại</Text>
      </Pressable>
      <Text style={s.title}>Tin nhắn</Text>
      <Rule style={{ marginBottom: t.spacing.sm }} />
      <Text style={s.sub}>Hội thoại từ tin đăng Canlib và bài viết cộng đồng.</Text>
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
          <Row item={item} onPress={() => router.push(`/chat?id=${item.id}`)} />
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
                title="Chưa có hội thoại nào"
                line="Bấm Nhắn ở một tin đăng hoặc bài viết để bắt đầu. Hội thoại sẽ hiện ở đây."
                actionLabel="Mở Canlib"
                onAction={() => router.replace('/canlib')}
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
  title: { ...t.type.title, color: t.colors.ink },
  sub: { ...t.type.caption, color: t.colors.inkMuted },

  row: {
    flexDirection: 'row',
    gap: t.spacing.md,
    paddingHorizontal: t.spacing.screen,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.line,
  },
  thumbVeil: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: t.radius.sm,
  },

  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  name: { ...t.type.itemTitle, color: t.colors.ink, maxWidth: '65%' },
  time: { ...t.type.caption, fontSize: 11, color: t.colors.inkMuted },

  listing: { ...t.type.caption, fontSize: 11.5, color: t.colors.inkMuted, marginTop: 2 },

  previewRow: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm, marginTop: 4 },
  preview: { ...t.type.caption, color: t.colors.inkMuted, flex: 1 },
  previewUnread: { fontFamily: t.fonts.semibold, color: t.colors.ink },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    backgroundColor: t.colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontFamily: t.fonts.bold, fontSize: 10, color: t.colors.inverse },
});
