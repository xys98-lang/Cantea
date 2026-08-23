import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Callout } from './ui';
import { useTheme, useThemedStyles } from '../store/theme';
import { fetchMyAlerts, toggleExclude } from '../api/trending';

/**
 * CẢNH BÁO BÀI ẨN DANH ĐANG LAN NHANH
 *
 * Ẩn danh thất bại hiếm khi vì hệ thống lộ tên. Nó thất bại vì chi tiết
 * trong bài đủ để bạn cùng lớp đoán ra ai viết — và càng nhiều người đọc
 * thì càng nhiều người có thể đoán.
 *
 * Người đăng lúc 2 giờ sáng không lường được bài sẽ có 1.240 lượt xem.
 * Khối này cho họ biết trước khi quá muộn, và một cách hãm lại mà không
 * phải xoá bài — thứ họ sẽ làm nếu không có lựa chọn nào khác.
 *
 * Hiện ở đầu tab Cộng đồng, không phải thông báo đẩy: đây là chuyện cần
 * đọc kỹ và cân nhắc, không phải chuyện liếc qua rồi vuốt đi.
 */
export const TrendingAlert = ({ onChange }) => {
  const router = useRouter();
  const t = useTheme();
  const s = useThemedStyles(styles);

  const [alert, setAlert] = useState(null);
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await fetchMyAlerts();
      setAlert(list.find((a) => a.shouldWarn) || null);
    } catch {
      setAlert(null);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!alert || dismissed) return null;

  const exclude = () =>
    Alert.alert(
      'Gỡ khỏi Đang nổi',
      'Bài vẫn nằm trong bảng tin và ai có liên kết vẫn đọc được — chỉ không được đẩy lên bảng xếp hạng nữa.\n\nĐổi ý lúc nào cũng được, trong Cá nhân › Bài của tôi.',
      [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'Gỡ khỏi bảng',
          onPress: async () => {
            setBusy(true);
            try {
              const r = await toggleExclude(alert.postId, true);
              setDismissed(true);
              onChange?.();
              Alert.alert('Đã gỡ', r.message);
            } catch (e) {
              Alert.alert('Lỗi', e.message);
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );

  return (
    <View style={s.wrap}>
      <View style={s.tag}>
        <Ionicons name="eye-off-outline" size={11} color={t.colors.inkBody} />
        <Text style={s.tagText}>BÀI ẨN DANH CỦA BẠN</Text>
      </View>

      {Boolean(alert.rank) && (
        <Text style={s.lead}>Bài của bạn đang ở hạng {alert.rank}</Text>
      )}

      <Pressable onPress={() => router.push(`/post-detail?id=${alert.postId}`)}>
        <Text style={s.title} numberOfLines={2}>
          “{alert.title}”
        </Text>
      </Pressable>

      <View style={s.stats}>
        <View style={s.stat}>
          <Text style={s.statNum}>{alert.viewCount.toLocaleString('vi-VN')}</Text>
          <Text style={s.statLabel}>LƯỢT XEM</Text>
        </View>
        <View style={s.stat}>
          <Text style={s.statNum}>{alert.hoursSincePost} giờ</Text>
          <Text style={s.statLabel}>TỪ LÚC ĐĂNG</Text>
        </View>
        <View style={s.stat}>
          <Text style={[s.statNum, { color: t.colors.alert }]}>×{alert.velocity.ratio}</Text>
          <Text style={s.statLabel}>SO VỚI THƯỜNG</Text>
        </View>
      </View>

      <Callout tone="warn" style={{ marginTop: t.spacing.md }}>
        Bài đang lan nhanh hơn hẳn mức bình thường. Danh tính của bạn vẫn ẩn, nhưng{' '}
        <Text style={s.strong}>chi tiết trong bài có thể đủ để người quen nhận ra</Text>. Bạn
        có thể gỡ khỏi bảng xếp hạng — bài vẫn nằm trong bảng tin, chỉ không được đẩy lên nữa.
      </Callout>

      <Button
        title="Gỡ khỏi Đang nổi"
        variant="ghost"
        onPress={exclude}
        loading={busy}
        style={{ marginTop: t.spacing.md }}
      />
      <Pressable onPress={() => setDismissed(true)} style={s.keep}>
        <Text style={s.keepText}>Để nguyên</Text>
      </Pressable>

      <Text style={s.foot}>Đổi ý lúc nào cũng được, trong Cá nhân › Bài của tôi.</Text>
    </View>
  );
};

const styles = (t) =>
  StyleSheet.create({
    wrap: {
      borderWidth: 1,
      borderColor: t.colors.lineStrong,
      borderRadius: t.radius.lg,
      padding: t.spacing.md,
      marginTop: t.spacing.md,
    },
    tag: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start' },
    tagText: { ...t.type.eyebrow, fontSize: 9, color: t.colors.inkBody },

    lead: { ...t.type.caption, color: t.colors.inkMuted, marginTop: t.spacing.md },
    title: {
      fontFamily: t.fonts.bold,
      fontSize: 16,
      lineHeight: 22,
      color: t.colors.ink,
      marginTop: 4,
    },
    strong: { fontFamily: t.fonts.bold },

    stats: { flexDirection: 'row', gap: t.spacing.md, marginTop: t.spacing.md },
    stat: { flex: 1 },
    statNum: { fontFamily: t.fonts.extrabold, fontSize: 17, color: t.colors.ink },
    statLabel: { ...t.type.eyebrow, fontSize: 8.5, color: t.colors.inkMuted, marginTop: 2 },

    keep: { alignItems: 'center', paddingVertical: t.spacing.md },
    keepText: { ...t.type.label, color: t.colors.inkMuted },

    foot: { ...t.type.caption, fontSize: 10.5, color: t.colors.inkMuted, textAlign: 'center' },
  });
