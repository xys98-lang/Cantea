import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Rule } from '../../src/components/ui';
import { useAuth } from '../../src/store/auth';
import { colors, radius, spacing, type } from '../../src/theme';

export default function Community() {
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const verified = user?.verificationStatus === 'verified';
  const uni = user?.university;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={[
        s.scroll,
        { paddingTop: insets.top + spacing.lg, paddingBottom: spacing.xl },
      ]}
    >
      <Text style={s.title}>Cộng đồng</Text>
      <Rule style={{ marginBottom: spacing.lg }} />

      {verified ? (
        <View style={s.card}>
          <Text style={s.cardTitle}>Cộng đồng {uni?.shortName || 'trường bạn'}</Text>
          <Text style={s.cardLine}>
            Bảng tin đang được xây dựng. Sắp tới bạn sẽ đọc và đăng bài ẩn danh tại đây.
          </Text>
        </View>
      ) : (
        <>
          {/*
            Lời mời xuất hiện đúng lúc người dùng chạm vào cộng đồng,
            thay vì banner nhắc nhở thường trực ở mọi màn hình —
            ngữ cảnh thuyết phục hơn sự lặp lại.
          */}
          <View style={s.gate}>
            <Text style={s.gateTitle}>Dành riêng cho sinh viên trường bạn</Text>
            <Text style={s.gateLine}>
              Bảng tin cộng đồng chỉ mở cho sinh viên đã xác thực. Đây là điều khiến mọi
              người thoải mái nói thật — vì biết người bên kia cũng học cùng trường.
            </Text>

            <View style={s.points}>
              <Text style={s.point}>Đăng bài và bình luận ẩn danh</Text>
              <Text style={s.point}>Hỏi đáp về môn học, giảng viên, thủ tục</Text>
              <Text style={s.point}>Chỉ sinh viên cùng trường đọc được</Text>
            </View>

            <View style={{ marginTop: spacing.lg }}>
              <Button title="Xác thực email trường" onPress={() => router.push('/verify')} />
            </View>
          </View>

          <View style={s.note}>
            <Text style={s.noteText}>
              Chưa được trường cấp mail? Cứ dùng thời khoá biểu trước, quay lại đây khi có
              mail — tài khoản của bạn vẫn giữ nguyên.
            </Text>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { paddingHorizontal: spacing.lg },
  title: { ...type.title, color: colors.ink },

  gate: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  gateTitle: { ...type.heading, color: colors.ink, marginBottom: spacing.sm },
  gateLine: { ...type.body, color: colors.inkMuted },

  points: { marginTop: spacing.lg, gap: spacing.sm },
  point: {
    ...type.caption,
    color: colors.brandDeep,
    backgroundColor: colors.brandSoft,
    borderRadius: radius.sm,
    paddingVertical: 9,
    paddingHorizontal: spacing.md,
    overflow: 'hidden',
  },

  note: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  noteText: { ...type.caption, color: colors.accentInk },

  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  cardTitle: { ...type.heading, color: colors.ink, marginBottom: spacing.sm },
  cardLine: { ...type.body, color: colors.inkMuted },
});
