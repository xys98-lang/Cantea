import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { useAuth } from '../../src/store/auth';
import { fetchToday, meetingLabel, DAYS } from '../../src/api/schedule';
import { useTheme, useThemedStyles } from '../../src/store/theme';

/**
 * Hàm nhận theme chứ không phải object cố định.
 *
 * Ở cấp module thì `t` chưa tồn tại — nó chỉ có bên trong component, sau
 * khi useTheme() chạy. Mọi hằng số có màu đều phải chuyển thành hàm như
 * thế này, nếu không sẽ nổ ngay lúc nạp file.
 */
const statusOf = (t) => ({
  guest: { label: 'CHƯA XÁC THỰC', bg: t.colors.fill, fg: t.colors.inkBody },
  pending: { label: 'ĐANG CHỜ MÃ', bg: t.colors.raised, fg: t.colors.inkBody },
  verified: { label: 'ĐÃ XÁC THỰC', bg: t.colors.fill, fg: t.colors.inkBody },
});

export default function Home() {
  const t = useTheme();
  const s = useThemedStyles(styles);
  const router = useRouter();
  const { user } = useAuth();

  const [today, setToday] = useState({ classes: [], dayOfWeek: null });
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchToday();
      setToday(data);
    } catch {
      // Không chặn màn hình chính vì lỗi thời khoá biểu
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const STATUS = statusOf(t);
  const status = STATUS[user?.verificationStatus] || STATUS.guest;
  const uni = user?.university;
  const dayLabel = DAYS.find((d) => d.value === today.dayOfWeek)?.label || 'Hôm nay';

  return (
    <Screen
      title="cantea"
      right={
        <View style={[s.badge, { backgroundColor: status.bg }]}>
          <Text style={[s.badgeLabel, { color: status.fg }]}>{status.label}</Text>
        </View>
      }
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        load();
      }}
    >
      <Text style={s.greeting}>Chào {user?.firstName || 'bạn'}</Text>
      {Boolean(uni?.shortName) && <Text style={s.uni}>{uni.shortName}</Text>}

      <View style={s.sectionHead}>
        <Text style={s.sectionTitle}>{dayLabel}</Text>
        <Pressable onPress={() => router.push('/schedule')} hitSlop={8}>
          <Text style={s.link}>Cả tuần →</Text>
        </Pressable>
      </View>

      {today.classes?.length ? (
        today.classes.map((c, i) => (
          <Pressable
            key={`${c.courseId}-${i}`}
            onPress={() => router.push(`/course-edit?id=${c.courseId}`)}
            style={s.classRow}
          >
            <View style={[s.stripe, { backgroundColor: c.color || t.colors.accent }]} />
            <View style={{ flex: 1 }}>
              <Text style={s.className} numberOfLines={1}>
                {c.courseName}
              </Text>
              <Text style={s.classMeta}>
                {meetingLabel(c, 'period')}
                {c.room ? ` · ${c.room}` : ''}
              </Text>
            </View>
            <Text style={s.classTime}>{c.startTime}</Text>
          </Pressable>
        ))
      ) : (
        <Pressable onPress={() => router.push('/schedule')} style={s.emptyCard}>
          <Text style={s.emptyTitle}>Hôm nay không có lịch học</Text>
          <Text style={s.emptyLine}>
            Chưa thêm môn nào? Nhập thời khoá biểu để xem lịch cả tuần trong một màn hình.
          </Text>
        </Pressable>
      )}

      {user?.verificationStatus !== 'verified' && (
        <Pressable onPress={() => router.push('/verify')} style={s.inviteCard}>
          <Text style={s.inviteTitle}>Cộng đồng trường</Text>
          <Text style={s.inviteLine}>
            Xác thực email trường để đọc và đăng bài trong cộng đồng riêng của trường bạn.
            Chưa có mail trường cũng không sao — quay lại khi trường cấp.
          </Text>
          <Text style={s.inviteCta}>Xác thực ngay →</Text>
        </Pressable>
      )}
    </Screen>
  );
}

const styles = (t) =>
  StyleSheet.create({
  badge: {
    borderRadius: t.radius.pill,
    paddingHorizontal: t.spacing.md,
    paddingVertical: 6,
    marginTop: t.spacing.sm,
  },
  badgeLabel: { ...t.type.micro },

  greeting: { ...t.type.title, color: t.colors.ink },
  uni: { ...t.type.caption, color: t.colors.inkMuted, marginTop: 2 },

  sectionHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: t.spacing.xl,
    marginBottom: t.spacing.md,
  },
  sectionTitle: { ...t.type.heading, color: t.colors.ink },
  link: { ...t.type.label, color: t.colors.accentPressed },

  classRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.line,
    borderRadius: t.radius.md,
    padding: t.spacing.md,
    marginBottom: t.spacing.sm,
  },
  stripe: { width: 4, height: 36, borderRadius: 2, marginRight: t.spacing.md },
  className: { ...t.type.label, fontSize: 15, color: t.colors.ink },
  classMeta: { ...t.type.caption, color: t.colors.inkMuted, marginTop: 2 },
  classTime: { ...t.type.label, color: t.colors.accentPressed, marginLeft: t.spacing.sm },

  emptyCard: {
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.line,
    borderRadius: t.radius.lg,
    padding: t.spacing.md,
  },
  emptyTitle: { ...t.type.label, fontSize: 15, color: t.colors.ink, marginBottom: t.spacing.xs },
  emptyLine: { ...t.type.caption, color: t.colors.inkMuted },

  inviteCard: {
    backgroundColor: t.colors.fill,
    borderRadius: t.radius.lg,
    padding: t.spacing.md,
    marginTop: t.spacing.lg,
  },
  inviteTitle: { ...t.type.label, fontSize: 15, color: t.colors.accentPressed, marginBottom: t.spacing.xs },
  inviteLine: { ...t.type.caption, color: t.colors.accentPressed },
  inviteCta: { ...t.type.label, color: t.colors.accentPressed, marginTop: t.spacing.sm },
});
