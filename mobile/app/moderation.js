import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Callout, EmptyState, Tabs } from '../src/components/ui';
import { Screen } from '../src/components/Screen';
import { fetchReports, resolveReports } from '../src/api/reports';
import { categoryLabel, timeAgo } from '../src/api/community';
import { useTheme, useThemedStyles } from '../src/store/theme';

/**
 * Ba tab, nhưng backend chỉ có ba trạng thái pending / dismissed / actioned.
 *
 * "Đã ẩn" không phải trạng thái riêng của báo cáo — nó là bài vẫn đang chờ mà
 * đã bị tạm ẩn. Lọc ở đây từ cờ isHidden thay vì thêm trạng thái thứ tư vào
 * backend: một bài có thể bị ẩn rồi mở lại nhiều lần, mà báo cáo thì vẫn nguyên
 * trạng thái chờ suốt thời gian đó.
 */
const TABS = [
  { value: 'waiting', label: 'Chờ xử lý' },
  { value: 'hidden', label: 'Đã ẩn' },
  { value: 'done', label: 'Đã xử lý' },
];

export default function Moderation() {
  const t = useTheme();
  const s = useThemedStyles(styles);
  const router = useRouter();

  const [tab, setTab] = useState('waiting');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const status = tab === 'done' ? 'actioned' : 'pending';
      const data = await fetchReports(status);
      const all = data.items || [];
      setItems(
        tab === 'waiting' ? all.filter((i) => !i.isHidden)
          : tab === 'hidden' ? all.filter((i) => i.isHidden)
            : all
      );
    } catch (e) {
      setError(e.message || 'Không tải được hàng chờ');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tab]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  /**
   * Hỏi lại trước khi xoá, không hỏi khi ẩn hay bỏ qua.
   *
   * Ẩn và bỏ qua đều đảo ngược được bằng một lần bấm; xoá thì không. Hỏi cả ba
   * sẽ khiến người kiểm duyệt bấm qua hộp thoại theo phản xạ, và đến lúc gặp
   * cái thật sự nguy hiểm thì họ cũng bấm qua nốt.
   */
  const act = (postId, action, title) => {
    const run = async () => {
      setBusy(postId);
      try {
        await resolveReports(postId, action);
        await load();
      } catch (e) {
        Alert.alert('Không xong', e.message || 'Thử lại sau');
      } finally {
        setBusy(null);
      }
    };

    if (action !== 'delete') return run();

    Alert.alert(
      'Xoá bài viết?',
      `“${(title || '').slice(0, 60)}” sẽ bị gỡ khỏi cộng đồng. Không hoàn tác được.`,
      [{ text: 'Huỷ', style: 'cancel' }, { text: 'Xoá', style: 'destructive', onPress: run }]
    );
  };

  return (
    <Screen
      title="Hàng chờ kiểm duyệt"
      variant="bar"
      onBack={() => router.back()}
      refreshing={refreshing}
      onRefresh={() => { setRefreshing(true); load(); }}
      below={
        <Tabs
          items={TABS}
          value={tab}
          onChange={setTab}
          style={{ marginTop: t.spacing.sm }}
        />
      }
    >
      {Boolean(error) && <Callout tone="warn">{error}</Callout>}

      {loading ? (
        <ActivityIndicator color={t.colors.accent} style={{ marginTop: t.spacing.xl }} />
      ) : items.length === 0 ? (
        <EmptyState
          title="Không có gì ở đây"
          line={tab === 'done' ? 'Chưa có báo cáo nào được xử lý.' : 'Chưa có bài nào bị báo cáo.'}
        />
      ) : (
        items.map((it) => {
          const p = it.post || {};
          return (
            <View key={it.postId} style={s.card}>
              <View style={s.head}>
                <Text style={s.cat}>{categoryLabel(p.category)}</Text>
                <Text style={s.meta}>
                  · {(p.author || {}).displayName || 'Ẩn danh'} · {timeAgo(it.lastAt)}
                </Text>
                <View style={{ flex: 1 }} />
                <View style={[s.badge, it.total >= 5 && s.badgeHot]}>
                  <Text style={[s.badgeText, it.total >= 5 && s.badgeTextHot]}>
                    {it.total} BÁO CÁO
                  </Text>
                </View>
              </View>

              <Pressable onPress={() => router.push(`/post-detail?id=${it.postId}`)}>
                <Text style={s.body} numberOfLines={2}>
                  {p.title || p.content}
                </Text>
              </Pressable>

              <View style={s.reasons}>
                {(it.reasons || []).map((r) => (
                  <Text key={r.code} style={s.reason}>
                    {r.label} · {r.count}
                  </Text>
                ))}
              </View>

              {tab !== 'done' && (
                <View style={s.btnRow}>
                  <Pressable
                    disabled={busy === it.postId}
                    onPress={() => act(it.postId, 'dismiss')}
                    style={s.btn}
                  >
                    <Text style={s.btnText}>Bỏ qua</Text>
                  </Pressable>
                  <Pressable
                    disabled={busy === it.postId}
                    onPress={() => act(it.postId, 'hide')}
                    style={s.btn}
                  >
                    <Text style={s.btnText}>{it.isHidden ? 'Vẫn ẩn' : 'Ẩn'}</Text>
                  </Pressable>
                  <Pressable
                    disabled={busy === it.postId}
                    onPress={() => act(it.postId, 'delete', p.title)}
                    style={[s.btn, s.btnDanger]}
                  >
                    <Text style={[s.btnText, s.btnTextDanger]}>Xoá</Text>
                  </Pressable>
                </View>
              )}
            </View>
          );
        })
      )}

      <Callout style={{ marginTop: t.spacing.lg }}>
        Bài đủ 5 báo cáo tự ẩn khỏi bảng tin và rơi khỏi Đang nổi. Máy chỉ đưa ra khỏi
        tầm mắt, quyết định là của bạn.
      </Callout>
    </Screen>
  );
}

const styles = (t) =>
  StyleSheet.create({
    card: {
      borderWidth: 1,
      borderColor: t.colors.line,
      borderRadius: t.radius.lg,
      padding: t.spacing.md,
      marginTop: t.spacing.md,
    },
    head: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    cat: { ...t.type.micro, color: t.colors.inkMuted },
    meta: { ...t.type.caption, fontSize: 11, color: t.colors.inkMuted },
    badge: {
      backgroundColor: t.colors.fill,
      borderRadius: t.radius.pill,
      paddingHorizontal: 9,
      paddingVertical: 3,
    },
    badgeHot: { backgroundColor: t.colors.alertSoft },
    badgeText: { ...t.type.micro, fontSize: 9.5, color: t.colors.inkBody },
    badgeTextHot: { color: t.colors.alertInk },
    body: { ...t.type.body, color: t.colors.ink, marginTop: t.spacing.sm },
    reasons: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: t.spacing.sm },
    reason: { ...t.type.caption, fontSize: 11, color: t.colors.inkMuted },
    btnRow: { flexDirection: 'row', gap: 8, marginTop: t.spacing.md },
    btn: {
      flex: 1,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: t.colors.line,
      borderRadius: t.radius.md,
      paddingVertical: 10,
    },
    btnDanger: { borderColor: t.colors.alert },
    btnText: { ...t.type.label, fontSize: 12.5, color: t.colors.ink },
    btnTextDanger: { color: t.colors.alert },
  });
