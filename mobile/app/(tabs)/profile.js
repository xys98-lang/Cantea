import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Rule } from '../../src/components/ui';
import { useAuth } from '../../src/store/auth';
import { API_BASE_URL } from '../../src/api/client';
import { colors, radius, spacing, type } from '../../src/theme';

const STATUS = {
  guest: { label: 'CHƯA XÁC THỰC', bg: colors.accent, fg: colors.accentInk },
  pending: { label: 'ĐANG CHỜ MÃ', bg: colors.warningSoft, fg: colors.warningInk },
  verified: { label: 'ĐÃ XÁC THỰC', bg: colors.successSoft, fg: colors.successInk },
};

const Row = ({ label, value }) => (
  <View style={s.row}>
    <Text style={s.rowLabel}>{label}</Text>
    <Text style={s.rowValue} numberOfLines={1}>
      {value || '—'}
    </Text>
  </View>
);

export default function Profile() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();

  const status = STATUS[user?.verificationStatus] || STATUS.guest;
  const uni = user?.university;
  const initials = (user?.firstName || '?').charAt(0).toUpperCase();

  const signOut = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={[
        s.scroll,
        { paddingTop: insets.top + spacing.lg, paddingBottom: spacing.xl },
      ]}
    >
      <Text style={s.title}>Cá nhân</Text>
      <Rule style={{ marginBottom: spacing.lg }} />

      <View style={s.identity}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{initials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.name}>
            {user?.lastName} {user?.firstName}
          </Text>
          <Text style={s.email} numberOfLines={1}>
            {user?.email}
          </Text>
        </View>
      </View>

      <View style={[s.badge, { backgroundColor: status.bg }]}>
        <Text style={[s.badgeLabel, { color: status.fg }]}>{status.label}</Text>
      </View>

      {user?.verificationStatus !== 'verified' && (
        <Pressable onPress={() => router.push('/verify')} style={s.verifyCta}>
          <Text style={s.verifyCtaText}>Xác thực email trường →</Text>
        </Pressable>
      )}

      <View style={s.card}>
        <Row label="Biệt danh" value={user?.nickname} />
        <Row label="Trường" value={uni?.name || uni?.shortName} />
        <Row label="Ngành" value={user?.major} />
        <Row label="Năm học" value={user?.year ? `Năm ${user.year}` : null} />
      </View>

      {/* Khối chẩn đoán — gỡ trước khi phát hành */}
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
  scroll: { paddingHorizontal: spacing.lg },
  title: { ...type.title, color: colors.ink },

  identity: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: { fontSize: 24, fontWeight: '700', color: colors.white },
  name: { ...type.heading, color: colors.ink },
  email: { ...type.caption, color: colors.inkMuted, marginTop: 2 },

  badge: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    marginTop: spacing.lg,
  },
  badgeLabel: { ...type.micro },

  verifyCta: {
    backgroundColor: colors.brandSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  verifyCtaText: { ...type.label, color: colors.brandDeep },

  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    marginTop: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLabel: { ...type.caption, color: colors.inkMuted },
  rowValue: { ...type.label, color: colors.ink, flex: 1, textAlign: 'right', marginLeft: spacing.md },

  debug: { marginTop: spacing.xl },
  debugLabel: { ...type.micro, color: colors.inkFaint },
  debugValue: { ...type.caption, color: colors.inkMuted, marginTop: spacing.xs },
});
