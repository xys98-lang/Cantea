import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { colors, radius, spacing, type } from '../theme';

/**
 * Gạch nhận diện dưới tiêu đề: thanh indigo dài kèm một đoạn vàng bơ ngắn.
 * Xuất hiện ở mọi màn hình, là dấu hiệu thị giác của Cantea.
 */
export const Rule = ({ style }) => (
  <View style={[s.ruleRow, style]}>
    <View style={s.ruleMain} />
    <View style={s.ruleAccent} />
  </View>
);

export const Field = ({ label, hint, error, style, ...props }) => {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[{ marginBottom: spacing.md }, style]}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        style={[s.input, focused && s.inputFocused, Boolean(error) && s.inputError]}
        placeholderTextColor={colors.inkFaint}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...props}
      />
      {Boolean(error) && <Text style={s.fieldError}>{error}</Text>}
      {!error && Boolean(hint) && <Text style={s.hint}>{hint}</Text>}
    </View>
  );
};

export const Button = ({ title, onPress, loading, disabled, variant = 'solid' }) => {
  const isSolid = variant === 'solid';
  const off = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      style={({ pressed }) => [
        s.btn,
        isSolid ? s.btnSolid : s.btnGhost,
        // Deep Indigo cho trạng thái đang nhấn
        pressed && !off && isSolid && { backgroundColor: colors.brandDeep },
        pressed && !off && !isSolid && { backgroundColor: colors.brandSoft },
        off && { opacity: 0.45 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isSolid ? colors.white : colors.brand} />
      ) : (
        <Text style={[s.btnText, isSolid ? s.btnTextSolid : s.btnTextGhost]}>{title}</Text>
      )}
    </Pressable>
  );
};

export const Notice = ({ children, tone = 'danger' }) => {
  if (!children) return null;

  const palette = {
    danger: { bg: colors.dangerSoft, fg: colors.dangerInk },
    warning: { bg: colors.warningSoft, fg: colors.warningInk },
    success: { bg: colors.successSoft, fg: colors.successInk },
  }[tone];

  return (
    <View style={[s.notice, { backgroundColor: palette.bg }]}>
      <Text style={[s.noticeText, { color: palette.fg }]}>{children}</Text>
    </View>
  );
};

const s = StyleSheet.create({
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  ruleMain: {
    width: 40,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.brand,
  },
  ruleAccent: {
    width: 12,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.accent,
    marginLeft: 4,
  },
  label: {
    ...type.label,
    color: colors.inkMuted,
    marginBottom: spacing.xs + 2,
  },
  input: {
    ...type.body,
    color: colors.ink,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
  },
  inputFocused: {
    borderColor: colors.brand,
    backgroundColor: colors.brandSoft,
  },
  inputError: {
    borderColor: colors.danger,
  },
  fieldError: {
    ...type.caption,
    color: colors.dangerInk,
    marginTop: spacing.xs + 2,
  },
  hint: {
    ...type.caption,
    color: colors.inkFaint,
    marginTop: spacing.xs + 2,
  },
  btn: {
    height: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSolid: {
    backgroundColor: colors.brand,
  },
  btnGhost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  btnTextSolid: { color: colors.white },
  btnTextGhost: { color: colors.brandDeep },
  notice: {
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  noticeText: {
    ...type.caption,
  },
});
