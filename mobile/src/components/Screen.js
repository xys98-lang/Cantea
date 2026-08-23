import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Rule } from './ui';
import { useTheme, useThemedStyles } from '../store/theme';

/**
 * KHUNG MÀN HÌNH DÙNG CHUNG
 *
 * Header nằm NGOÀI vùng cuộn nên luôn đứng yên. Mọi màn dùng chung một
 * component nên chúng không thể lệch nhau, và màn viết sau này chỉ cần
 * bọc vào là có sẵn hành vi đúng.
 *
 *   variant="page"  tiêu đề lớn kèm gạch nhận diện — màn chính
 *   variant="bar"   một hàng gọn, mũi tên quay lại — màn chi tiết
 */
export const ScreenHeader = ({
  title,
  subtitle,
  onBack,
  backLabel = 'Quay lại',
  right,
  variant = 'page',
  below,
  style,
}) => {
  const t = useTheme();
  const s = useThemedStyles(styles);
  const insets = useSafeAreaInsets();

  if (variant === 'bar') {
    return (
      <View style={[s.bar, { paddingTop: insets.top + t.spacing.sm }, style]}>
        {Boolean(onBack) && (
          <Pressable onPress={onBack} hitSlop={10} accessibilityLabel={backLabel}>
            <Ionicons name="chevron-back" size={23} color={t.colors.ink} />
          </Pressable>
        )}
        <View style={{ flex: 1 }}>
          <Text style={s.barTitle} numberOfLines={1}>
            {title}
          </Text>
          {Boolean(subtitle) && (
            <Text style={s.barSub} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>
        {right}
      </View>
    );
  }

  return (
    <View style={[s.page, { paddingTop: insets.top + t.spacing.sm }, style]}>
      {Boolean(onBack) && (
        <Pressable onPress={onBack} style={s.backLink} hitSlop={8}>
          <Text style={s.backText}>← {backLabel}</Text>
        </Pressable>
      )}

      <View style={s.pageRow}>
        <View style={{ flex: 1 }}>
          <Text style={s.pageTitle}>{title}</Text>
          <Rule style={{ marginTop: 6, marginBottom: 0 }} />
          {Boolean(subtitle) && <Text style={s.pageSub}>{subtitle}</Text>}
        </View>
        {right}
      </View>

      {below}
    </View>
  );
};

/**
 * @param scroll        false khi màn tự quản lý FlatList
 * @param avoidKeyboard true cho màn có biểu mẫu
 * @param padded        false khi nội dung cần chạm sát mép
 */
export const Screen = ({
  title,
  subtitle,
  onBack,
  backLabel,
  right,
  variant,
  below,
  headerStyle,

  scroll = true,
  padded = true,
  avoidKeyboard = false,
  refreshing,
  onRefresh,
  contentStyle,
  children,
}) => {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const Wrapper = avoidKeyboard ? KeyboardAvoidingView : View;
  const wrapperProps = avoidKeyboard
    ? { behavior: Platform.OS === 'ios' ? 'padding' : undefined }
    : {};

  return (
    <Wrapper style={{ flex: 1, backgroundColor: t.colors.bg }} {...wrapperProps}>
      <ScreenHeader
        title={title}
        subtitle={subtitle}
        onBack={onBack}
        backLabel={backLabel}
        right={right}
        variant={variant}
        below={below}
        style={headerStyle}
      />

      {scroll ? (
        <ScrollView
          contentContainerStyle={[
            padded && { paddingHorizontal: t.spacing.screen },
            { paddingTop: t.spacing.md, paddingBottom: insets.bottom + t.spacing.xxl },
            contentStyle,
          ]}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={Boolean(refreshing)}
                onRefresh={onRefresh}
                tintColor={t.colors.ink}
              />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
      ) : (
        children
      )}
    </Wrapper>
  );
};

const styles = (t) =>
  StyleSheet.create({
    page: {
      paddingHorizontal: t.spacing.screen,
      paddingBottom: t.spacing.md,
      backgroundColor: t.colors.bg,
      borderBottomWidth: 1,
      borderBottomColor: t.colors.line,
    },
    pageRow: { flexDirection: 'row', alignItems: 'flex-start', gap: t.spacing.sm },
    pageTitle: { ...t.type.title, color: t.colors.ink },
    pageSub: { ...t.type.caption, color: t.colors.inkMuted, marginTop: t.spacing.sm },
    backLink: { paddingVertical: 4, marginBottom: t.spacing.sm },
    backText: { ...t.type.label, color: t.colors.ink },

    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.spacing.md,
      paddingHorizontal: t.spacing.screen,
      paddingBottom: t.spacing.sm,
      backgroundColor: t.colors.bg,
      borderBottomWidth: 1,
      borderBottomColor: t.colors.line,
    },
    barTitle: { ...t.type.itemTitle, fontFamily: t.fonts.bold, color: t.colors.ink },
    barSub: { ...t.type.caption, fontSize: 11, color: t.colors.inkMuted },
  });
