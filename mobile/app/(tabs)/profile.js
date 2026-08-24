import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../src/components/ui';
import { Screen } from '../../src/components/Screen';
import { useAuth } from '../../src/store/auth';
import { useTheme, useThemedStyles, THEME_OPTIONS } from '../../src/store/theme';
import { shadow } from '../../src/theme';

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

const Row = ({ label, value, last }) => {
  const s = useThemedStyles(styles);
  return (
  <View style={[s.row, last && { borderBottomWidth: 0 }]}>
    <Text style={s.rowLabel}>{label}</Text>
    <Text style={s.rowValue} numberOfLines={1}>
      {value || '—'}
    </Text>
  </View>
  );
};

export default function Profile() {
  const t = useTheme();
  const s = useThemedStyles(styles);
  const router = useRouter();
  const { user, logout } = useAuth();

  const STATUS = statusOf(t);
  const status = STATUS[user?.verificationStatus] || STATUS.guest;
  const uni = user?.university;
  const initials = (user?.firstName || '?').charAt(0).toUpperCase();

  const signOut = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <Screen title="Cá nhân">
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
          <View style={[s.badge, { backgroundColor: status.bg }]}>
            <Text style={[s.badgeLabel, { color: status.fg }]}>{status.label}</Text>
          </View>
        </View>
      </View>

      {user?.verificationStatus !== 'verified' && (
        <Pressable onPress={() => router.push('/verify')} style={s.verifyCta}>
          <View style={{ flex: 1 }}>
            <Text style={s.verifyTitle}>Xác thực email trường</Text>
            <Text style={s.verifyLine}>Mở khoá cộng đồng riêng của trường bạn</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={t.colors.accentPressed} />
        </Pressable>
      )}

      <Pressable onPress={() => router.push('/notification-settings')} style={s.savedRow}>
        <View style={s.savedIcon}>
          <Ionicons name="notifications-outline" size={17} color={t.colors.ink} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.savedTitle}>Nhắc lịch học</Text>
          <Text style={s.savedLine}>Thông báo trước giờ vào lớp</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={t.colors.icon} />
      </Pressable>

      <Pressable onPress={() => router.push('/my-posts')} style={s.savedRow}>
        <View style={s.savedIcon}>
          <Ionicons name="document-text-outline" size={17} color={t.colors.ink} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.savedTitle}>Bài của tôi</Text>
          <Text style={s.savedLine}>Số liệu và trạng thái trên bảng Đang nổi</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={t.colors.icon} />
      </Pressable>

      <Pressable onPress={() => router.push('/saved')} style={s.savedRow}>
        <View style={s.savedIcon}>
          <Ionicons name="bookmark" size={17} color={t.colors.accentPressed} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.savedTitle}>Bài đã lưu</Text>
          <Text style={s.savedLine}>Chỉ mình bạn thấy</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={t.colors.inkMuted} />
      </Pressable>

      {/*
        Ba lựa chọn chứ không phải công tắc hai trạng thái. "Theo hệ thống"
        là mặc định và đúng cho phần lớn người dùng — điện thoại đã tự
        chuyển sáng tối theo giờ, app nên đi theo thay vì bắt họ chỉnh tay
        hai lần mỗi ngày.
      */}
      {/*
        Ô xem trước thay vì chỉ tên chủ đề. "Khuya" hay "Phố" không nói
        được gì — ba vệt màu thì thấy ngay nó ra sao, và người dùng chọn
        đúng ngay lần đầu thay vì bấm thử từng cái.
      */}
      <Text style={s.sectionLabel}>GIAO DIỆN</Text>
      <View style={s.themeGrid}>
        {THEME_OPTIONS.map((opt) => {
          const on = t.choice === opt.key;
          return (
            <Pressable
              key={opt.key}
              onPress={() => t.setTheme(opt.key)}
              style={[s.themeTile, on && s.themeTileOn]}
            >
              <View style={s.swatch}>
                {opt.key === 'system' ? (
                  <>
                    <View style={[s.swatchBit, { backgroundColor: '#FFFFFF' }]} />
                    <View style={[s.swatchBit, { backgroundColor: '#8F8F8F' }]} />
                    <View style={[s.swatchBit, { backgroundColor: '#141414' }]} />
                  </>
                ) : (
                  opt.swatch.map((c, i) => (
                    <View key={i} style={[s.swatchBit, { backgroundColor: c }]} />
                  ))
                )}
              </View>
              <View style={s.themeLabel}>
                <Text style={s.themeName} numberOfLines={1}>
                  {opt.name}
                </Text>
                <Text style={s.themeDesc} numberOfLines={1}>
                  {opt.desc}
                </Text>
              </View>
              {on && (
                <View style={s.themeCheck}>
                  <Ionicons name="checkmark" size={11} color={t.colors.onAccent} />
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      <View style={s.card}>
        <Row label="Biệt danh" value={user?.nickname} />
        <Row label="Trường" value={uni?.name || uni?.shortName} />
        <Row label="Ngành" value={user?.major} />
        <Row label="Năm học" value={user?.year ? `Năm ${user.year}` : null} last />
      </View>

      <View style={{ marginTop: t.spacing.xl }}>
        <Button title="Đăng xuất" onPress={signOut} variant="ghost" />
      </View>
    </Screen>
  );
}

const styles = (t) =>
  StyleSheet.create({

  identity: { flexDirection: 'row', alignItems: 'flex-start' },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: t.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: t.spacing.md,
  },
  avatarText: { fontFamily: t.fonts.bold, fontSize: 22, color: t.colors.onAccent },
  name: { ...t.type.heading, color: t.colors.ink },
  email: { ...t.type.caption, color: t.colors.inkMuted, marginTop: 1 },

  badge: {
    alignSelf: 'flex-start',
    borderRadius: t.radius.pill,
    paddingHorizontal: 11,
    paddingVertical: 4,
    marginTop: t.spacing.sm,
  },
  badgeLabel: { ...t.type.micro },

  verifyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.colors.fill,
    borderRadius: t.radius.lg,
    padding: t.spacing.md,
    marginTop: t.spacing.lg,
  },
  verifyTitle: { ...t.type.label, color: t.colors.accentPressed },
  verifyLine: { ...t.type.caption, color: t.colors.accentPressed, marginTop: 1, opacity: 0.8 },

  sectionLabel: {
    ...t.type.eyebrow,
    color: t.colors.inkMuted,
    marginTop: t.spacing.lg,
    marginBottom: t.spacing.sm,
  },
  themeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  themeTile: {
    width: '48%',
    borderWidth: 1,
    borderColor: t.colors.line,
    borderRadius: t.radius.md,
    overflow: 'hidden',
  },
  themeTileOn: { borderColor: t.colors.accent, borderWidth: 2 },
  swatch: { flexDirection: 'row', height: 26 },
  swatchBit: { flex: 1 },
  themeLabel: { paddingHorizontal: 9, paddingVertical: 7 },
  themeName: { fontFamily: t.fonts.bold, fontSize: 12, color: t.colors.ink },
  themeDesc: { fontFamily: t.fonts.medium, fontSize: 9.5, color: t.colors.inkMuted, marginTop: 1 },
  themeCheck: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: t.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },

  savedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.md,
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.line,
    borderRadius: t.radius.lg,
    padding: t.spacing.md,
    marginTop: t.spacing.lg,
    ...shadow.card,
  },
  savedIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: t.colors.fill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedTitle: { ...t.type.label, fontSize: 15, color: t.colors.ink },
  savedLine: { ...t.type.caption, color: t.colors.inkMuted, marginTop: 1 },

  card: {
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.line,
    borderRadius: t.radius.lg,
    paddingHorizontal: t.spacing.md,
    marginTop: t.spacing.lg,
    ...shadow.card,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.line,
  },
  rowLabel: { ...t.type.caption, color: t.colors.inkMuted },
  rowValue: {
    ...t.type.label,
    color: t.colors.ink,
    flex: 1,
    textAlign: 'right',
    marginLeft: t.spacing.md,
  },
});
