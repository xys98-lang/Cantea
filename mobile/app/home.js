import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Rule } from '../src/components/ui';
import { useAuth } from '../src/store/auth';
import { API_BASE_URL } from '../src/api/client';
import { colors, radius, spacing, type } from '../src/theme';

/**
 * Butter yellow cho trạng thái chưa xác thực: đây là lời mời, không phải lỗi.
 * Màu vàng bơ nói "còn việc hay đang chờ bạn", khác hẳn màu đỏ cảnh báo.
 */
const STATUS = {
  guest: {
    label: 'CHƯA XÁC THỰC',
    bg: colors.accent,
    fg: colors.accentInk,
    line: 'Xác thực email trường để vào cộng đồng riêng của trường bạn.',
  },
  pending: {
    label: 'ĐANG CHỜ MÃ',
    bg: colors.warningSoft,
    fg: colors.warningInk,
    line: 'Nhập mã 6 số đã gửi tới email trường của bạn.',
  },
  verified: {
    label: 'ĐÃ XÁC THỰC',
    bg: colors.successSoft,
    fg: colors.successInk,
    line: 'Bạn đã vào được cộng đồng riêng của trường.',
  },
};

export default function Home() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();

  const status = STATUS[user?.verificationStatus] || STATUS.guest;
  const uni = user?.university;

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
    >
      <Text style={s.wordmark}>cantea</Text>
      <Rule style={{ marginBottom: spacing.xl }} />

      <Text style={s.greeting}>Chào {user?.firstName || 'bạn'}</Text>
      <Text style={s.email}>{user?.email}</Text>

      <View style={[s.badge, { backgroundColor: status.bg }]}>
        <Text style={[s.badgeLabel, { color: status.fg }]}>{status.label}</Text>
      </View>

      <Text style={s.statusLine}>{status.line}</Text>

      {uni ? (
        <View style={s.card}>
          <Text style={s.cardLabel}>TRƯỜNG CỦA BẠN</Text>
          <Text style={s.cardValue}>{uni.name || uni.shortName}</Text>
          {Boolean(uni.shortName) && <Text style={s.cardSub}>{uni.shortName}</Text>}
        </View>
      ) : null}

      {/* Khối chẩn đoán — tiện khi phát triển, gỡ trước khi phát hành */}
      <View style={s.debug}>
        <Text style={s.debugLabel}>MÁY CHỦ</Text>
        <Text style={s.debugValue}>{API_BASE_URL}</Text>
      </View>

      <View style={{ marginTop: spacing.lg }}>
        <Button title="Đăng xuất" onPress={signOut} variant="ghost" />
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing.lg,
  },
  wordmark: {
    ...type.wordmark,
    color: colors.brandDeep,
  },
  greeting: {
    ...type.title,
    color: colors.ink,
  },
  email: {
    ...type.caption,
    color: colors.inkMuted,
    marginTop: spacing.xs,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    marginTop: spacing.lg,
  },
  badgeLabel: {
    ...type.micro,
  },
  statusLine: {
    ...type.body,
    color: colors.inkMuted,
    marginTop: spacing.md,
  },
  card: {
    backgroundColor: colors.brandSoft,
    borderWidth: 1,
    borderColor: colors.brandSoft,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  cardLabel: {
    ...type.micro,
    color: colors.brand,
    marginBottom: spacing.sm,
  },
  cardValue: {
    ...type.heading,
    color: colors.brandDeep,
  },
  cardSub: {
    ...type.caption,
    color: colors.inkMuted,
    marginTop: 2,
  },
  debug: {
    marginTop: spacing.xl,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  debugLabel: {
    ...type.micro,
    color: colors.inkFaint,
  },
  debugValue: {
    ...type.caption,
    color: colors.inkMuted,
    marginTop: spacing.xs,
  },
});
