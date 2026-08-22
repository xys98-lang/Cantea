import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Rule } from '../src/components/ui';
import { useAuth } from '../src/store/auth';
import { fetchToday, meetingLabel, DAYS } from '../src/api/schedule';
import { colors, radius, spacing, type } from '../src/theme';

const STATUS = {
  guest: {
    label: 'CHƯA XÁC THỰC',
    bg: colors.accent,
    fg: colors.accentInk,
  },
  pending: {
    label: 'ĐANG CHỜ MÃ',
    bg: colors.warningSoft,
    fg: colors.warningInk,
  },
  verified: {
    label: 'ĐÃ XÁC THỰC',
    bg: colors.successSoft,
    fg: colors.successInk,
  },
};

export default function Home() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();

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

  const status = STATUS[user?.verificationStatus] || STATUS.guest;
  const uni = user?.university;
  const dayLabel = DAYS.find((d) => d.value === today.dayOfWeek)?.label || 'Hôm nay';

  const signOut = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={[
        s.scroll,
        { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xl },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
          tintColor={colors.brand}
        />
      }
    >
      <View style={s.head}>
        <View style={{ flex: 1 }}>
          <Text style={s.wordmark}>cantea</Text>
          <Rule style={{ marginBottom: 0 }} />
        </View>
        <View style={[s.badge, { backgroundColor: status.bg }]}>
          <Text style={[s.badgeLabel, { color: status.fg }]}>{status.label}</Text>
        </View>
      </View>

      <Text style={s.greeting}>Chào {user?.firstName || 'bạn'}</Text>
      {Boolean(uni?.shortName) && <Text style={s.uni}>{uni.shortName}</Text>}

      {/* ===== LỊCH HỌC HÔM NAY ===== */}
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
            <View style={[s.stripe, { backgroundColor: c.color || colors.brand }]} />
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

      {/* ===== MỜI XÁC THỰC ===== */}
      {user?.verificationStatus !== 'verified' && (
        <View style={s.inviteCard}>
          <Text style={s.inviteTitle}>Cộng đồng trường</Text>
          <Text style={s.inviteLine}>
            Xác thực email trường để đọc và đăng bài trong cộng đồng riêng của trường bạn.
            Chưa có mail trường cũng không sao — quay lại khi trường cấp.
          </Text>
        </View>
      )}

      <View style={{ marginTop: spacing.xl }}>
        <Button title="Đăng xuất" onPress={signOut} variant="ghost" />
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { paddingHorizontal: spacing.lg },
  head: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.lg },
  wordmark: { ...type.wordmark, color: colors.brandDeep },
  badge: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    marginTop: spacing.sm,
  },
  badgeLabel: { ...type.micro },

  greeting: { ...type.title, color: colors.ink },
  uni: { ...type.caption, color: colors.inkMuted, marginTop: 2 },

  sectionHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  sectionTitle: { ...type.heading, color: colors.ink },
  link: { ...type.label, color: colors.brandDeep },

  classRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  stripe: { width: 4, height: 36, borderRadius: 2, marginRight: spacing.md },
  className: { ...type.label, fontSize: 15, color: colors.ink },
  classMeta: { ...type.caption, color: colors.inkMuted, marginTop: 2 },
  classTime: { ...type.label, color: colors.brandDeep, marginLeft: spacing.sm },

  emptyCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  emptyTitle: { ...type.label, fontSize: 15, color: colors.ink, marginBottom: spacing.xs },
  emptyLine: { ...type.caption, color: colors.inkMuted },

  inviteCard: {
    backgroundColor: colors.brandSoft,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  inviteTitle: { ...type.label, fontSize: 15, color: colors.brandDeep, marginBottom: spacing.xs },
  inviteLine: { ...type.caption, color: colors.brandDeep },
});
