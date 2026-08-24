import { useState, useRef } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useThemedStyles } from '../store/theme';

/* ══════════════════════════════════════════════════
   DẤU HIỆU NHẬN DIỆN
   ══════════════════════════════════════════════════ */

/**
 * Gạch dưới tiêu đề: thanh đậm dài kèm một vạch nhạt ngắn.
 * Yếu tố trang trí duy nhất trong cả hệ thống, nên phải nhất quán tuyệt đối.
 */
export const Rule = ({ style }) => {
  const s = useThemedStyles(styles);
  return (
    <View style={[s.ruleRow, style]}>
      <View style={s.ruleMain} />
      <View style={s.ruleTail} />
    </View>
  );
};

export const ScreenTitle = ({ title, subtitle, right, style }) => {
  const s = useThemedStyles(styles);
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'flex-start' }, style]}>
      <View style={{ flex: 1 }}>
        <Text style={s.screenTitle}>{title}</Text>
        <Rule style={{ marginBottom: 0 }} />
        {Boolean(subtitle) && <Text style={s.screenSub}>{subtitle}</Text>}
      </View>
      {right}
    </View>
  );
};

/* ══════════════════════════════════════════════════
   NHẬP LIỆU
   ══════════════════════════════════════════════════ */

export const Field = ({ label, hint, error, style, ...props }) => {
  const t = useTheme();
  const s = useThemedStyles(styles);
  const [focused, setFocused] = useState(false);
  const filled = Boolean(props.value);

  return (
    <View style={[{ marginTop: t.spacing.md }, style]}>
      {Boolean(label) && <Text style={s.fieldLabel}>{label}</Text>}
      <TextInput
        style={[
          s.input,
          filled && s.inputFilled,
          focused && s.inputFocused,
          Boolean(error) && s.inputError,
        ]}
        placeholderTextColor={t.colors.icon}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...props}
      />
      {Boolean(error) && <Text style={s.fieldError}>{error}</Text>}
      {!error && Boolean(hint) && <Text style={s.hint}>{hint}</Text>}
    </View>
  );
};

/**
 * Ô nhập mã 6 số. Dùng một TextInput trong suốt phủ lên trên để bàn phím
 * và chức năng tự điền mã của hệ điều hành vẫn hoạt động.
 */
export const OtpInput = ({ value = '', onChange, length = 6, autoFocus }) => {
  /**
   * Sáu ô nhìn thấy chỉ là View, ô nhập thật nằm ẩn phía sau. Không có ref thì
   * chạm vào chúng chẳng gọi được ai — người dùng phải chạm trúng vùng ẩn mới
   * mở được bàn phím, mà vùng đó thì không nhìn thấy.
   */
  const inputRef = useRef(null);
  const t = useTheme();
  const s = useThemedStyles(styles);
  const [focused, setFocused] = useState(false);
  const digits = String(value).slice(0, length).split('');

  return (
    <View style={{ marginTop: t.spacing.md }}>
      <Pressable style={s.otpRow} onPress={() => inputRef.current?.focus()}>
        {Array.from({ length }).map((_, i) => {
          const active = focused && i === digits.length;
          return (
            <View
              key={i}
              style={[s.otpCell, Boolean(digits[i]) && s.otpFilled, active && s.otpActive]}
            >
              <Text style={s.otpDigit}>{digits[i] || ''}</Text>
            </View>
          );
        })}
      </Pressable>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(v) => onChange(v.replace(/\D/g, '').slice(0, length))}
        keyboardType="number-pad"
        maxLength={length}
        autoFocus={autoFocus}
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={s.otpHidden}
      />
    </View>
  );
};

/* ══════════════════════════════════════════════════
   HÀNH ĐỘNG
   ══════════════════════════════════════════════════ */

export const Button = ({ title, onPress, loading, disabled, variant = 'solid', style }) => {
  const t = useTheme();
  const s = useThemedStyles(styles);
  const off = disabled || loading;
  const ghost = variant === 'ghost';
  const alert = variant === 'alert';

  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(off) }}
      style={({ pressed }) => [
        s.btn,
        ghost && s.btnGhost,
        alert && s.btnAlert,
        !ghost && !alert && s.btnSolid,
        pressed && !off && !ghost && { backgroundColor: t.colors.accentPressed },
        pressed && !off && ghost && { backgroundColor: t.colors.raised },
        off && s.btnOff,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={ghost ? t.colors.ink : t.colors.onAccent} />
      ) : (
        <Text
          style={[
            s.btnText,
            ghost && { color: t.colors.ink },
            off && { color: t.colors.icon },
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
};

/* ══════════════════════════════════════════════════
   NHÃN VÀ KHỐI THÔNG BÁO
   ══════════════════════════════════════════════════ */

export const Pill = ({ children, tone = 'outline', icon, style }) => {
  const t = useTheme();
  const s = useThemedStyles(styles);
  const solid = tone === 'solid';
  const alert = tone === 'alert';

  return (
    <View style={[s.pill, solid && s.pillSolid, alert && s.pillAlert, style]}>
      {Boolean(icon) && (
        <Ionicons
          name={icon}
          size={11}
          color={solid ? t.colors.onAccent : alert ? t.colors.alert : t.colors.inkBody}
          style={{ marginRight: 4 }}
        />
      )}
      <Text
        style={[
          s.pillText,
          solid && { color: t.colors.onAccent },
          alert && { color: t.colors.alert },
        ]}
      >
        {children}
      </Text>
    </View>
  );
};

/** Khối chú thích có vạch dọc bên trái — thay cho nền màu */
export const Callout = ({ children, tone = 'default', style }) => {
  const s = useThemedStyles(styles);
  if (!children) return null;
  const warn = tone === 'warn' || tone === 'danger';

  return (
    <View style={[s.callout, warn && s.calloutWarn, style]}>
      <Text style={[s.calloutText, warn && s.calloutTextWarn]}>{children}</Text>
    </View>
  );
};

/** Giữ tên cũ để các màn chưa chuyển đổi không nổ */
export const Notice = ({ children, tone = 'danger' }) =>
  children ? <Callout tone={tone === 'danger' ? 'warn' : 'default'}>{children}</Callout> : null;

/* ══════════════════════════════════════════════════
   CHUYỂN ĐỔI TRONG MÀN
   ══════════════════════════════════════════════════ */

export const Segmented = ({ options, value, onChange, style }) => {
  const t = useTheme();
  const s = useThemedStyles(styles);

  return (
    <View style={[s.seg, style]}>
      {options.map((opt, i) => {
        const on = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[s.segItem, on && s.segItemOn, i > 0 && s.segDivider]}
          >
            {Boolean(opt.locked) && (
              <Ionicons
                name="lock-closed"
                size={11}
                color={on ? t.colors.onAccent : t.colors.icon}
                style={{ marginRight: 4 }}
              />
            )}
            <Text
              style={[
                s.segText,
                on && s.segTextOn,
                opt.locked && !on && { color: t.colors.icon },
              ]}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

/** Tab gạch chân — nhẹ hơn viên nang và không chiếm chỗ theo chiều dọc */
export const Tabs = ({ items, value, onChange, style, edgeInset }) => {
  const t = useTheme();
  const s = useThemedStyles(styles);
  const inset = edgeInset ?? t.spacing.screen;

  return (
    <View style={[s.tabsWrap, { marginHorizontal: -inset }, style]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: inset, gap: 18 }}
      >
        {items.map((it) => {
          const on = it.value === value;
          return (
            <Pressable key={it.value} onPress={() => onChange(it.value)} style={[s.tab, on && s.tabOn]}>
              {Boolean(it.locked) && (
                <Ionicons
                  name="lock-closed"
                  size={10}
                  color={on ? t.colors.ink : t.colors.icon}
                  style={{ marginRight: 5 }}
                />
              )}
              <Text style={[s.tabText, on && s.tabTextOn]}>{it.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
};

export const SectionHeader = ({ title, actionLabel, onAction, style }) => {
  const s = useThemedStyles(styles);
  return (
    <View style={[s.section, style]}>
      <Text style={s.sectionTitle}>{title}</Text>
      {Boolean(actionLabel) && (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={s.sectionAction}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
};

export const Divider = ({ style }) => {
  const s = useThemedStyles(styles);
  return <View style={[s.divider, style]} />;
};

/* ══════════════════════════════════════════════════
   HIỂN THỊ DANH TÍNH
   ══════════════════════════════════════════════════ */

/**
 * Tên người viết kèm dấu tích nếu là tài khoản chính thức.
 * Dấu tích tròn là quy ước quốc tế — đọc được ngay, không cần chú thích.
 */
export const AuthorName = ({ author, size = 12, style, suffix }) => {
  const t = useTheme();
  const s = useThemedStyles(styles);
  const official = Boolean(author?.isOfficial);

  return (
    <View style={[s.authorRow, style]}>
      <Text
        style={[
          s.authorText,
          { fontSize: size },
          official && { fontFamily: t.fonts.bold, color: t.colors.ink },
        ]}
        numberOfLines={1}
      >
        {author?.displayName}
      </Text>
      {official && (
        <Ionicons
          name="checkmark-circle"
          size={size + 1}
          color={t.colors.ink}
          style={{ marginLeft: 3 }}
        />
      )}
      {Boolean(suffix) && <Text style={[s.authorText, { fontSize: size }]}>{suffix}</Text>}
    </View>
  );
};

/* ══════════════════════════════════════════════════
   TRẠNG THÁI RỖNG
   ══════════════════════════════════════════════════ */

/** Màn hình trống là lời mời, không phải thông báo — luôn kèm hành động */
export const EmptyState = ({ title, line, actionLabel, onAction, style }) => {
  const t = useTheme();
  const s = useThemedStyles(styles);

  return (
    <View style={[s.empty, style]}>
      <Text style={s.emptyTitle}>{title}</Text>
      {Boolean(line) && <Text style={s.emptyLine}>{line}</Text>}
      {Boolean(actionLabel) && (
        <Button title={actionLabel} onPress={onAction} style={{ marginTop: t.spacing.lg }} />
      )}
    </View>
  );
};

/* ══════════════════════════════════════════════════ */

/**
 * Bảng style là một HÀM nhận theme, không phải object cố định.
 * StyleSheet.create() sao chép giá trị màu ngay lúc gọi, nên phải dựng
 * lại mỗi khi đổi chế độ — xem ghi chú trong src/store/theme.js
 */
const styles = (t) =>
  StyleSheet.create({
    // Nhận diện
    ruleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 9,
      marginBottom: t.spacing.md,
    },
    ruleMain: { width: 36, height: 3, borderRadius: 2, backgroundColor: t.colors.ink },
    ruleTail: {
      width: 11,
      height: 3,
      borderRadius: 2,
      backgroundColor: t.colors.lineStrong,
      marginLeft: 4,
    },
    screenTitle: { ...t.type.title, color: t.colors.ink },
    screenSub: { ...t.type.caption, color: t.colors.inkMuted, marginTop: -t.spacing.sm + 2 },

    // Nhập liệu
    fieldLabel: { ...t.type.label, color: t.colors.ink, marginBottom: t.spacing.sm },
    input: {
      ...t.type.body,
      color: t.colors.ink,
      backgroundColor: t.colors.surface,
      borderWidth: 1,
      borderColor: t.colors.lineStrong,
      borderRadius: t.radius.md,
      paddingHorizontal: 14,
      paddingVertical: 13,
    },
    inputFilled: { fontFamily: t.fonts.medium, borderColor: t.colors.ink },
    inputFocused: { borderColor: t.colors.ink, borderWidth: 1.5 },
    inputError: { borderColor: t.colors.alert },
    fieldError: { ...t.type.caption, color: t.colors.alertInk, marginTop: 6 },
    hint: { ...t.type.caption, fontSize: 11.5, color: t.colors.inkMuted, marginTop: 6 },

    otpRow: { flexDirection: 'row', gap: t.spacing.sm },
    otpCell: {
      flex: 1,
      height: 54,
      borderWidth: 1,
      borderColor: t.colors.lineStrong,
      borderRadius: t.radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.colors.surface,
    },
    otpFilled: { borderColor: t.colors.ink },
    otpActive: { borderColor: t.colors.ink, borderWidth: 2 },
    otpDigit: { fontFamily: t.fonts.bold, fontSize: 22, color: t.colors.ink },
    otpHidden: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 54,
      opacity: 0,
      color: 'transparent',
    },

    // Hành động
    btn: {
      borderRadius: t.radius.md,
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: t.spacing.lg,
    },
    btnSolid: { backgroundColor: t.colors.accent },
    btnGhost: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: t.colors.lineStrong,
    },
    btnAlert: { backgroundColor: t.colors.alert },
    btnOff: { backgroundColor: t.colors.fill, borderWidth: 0 },
    btnText: {
      fontFamily: t.fonts.bold,
      fontSize: 14.5,
      color: t.colors.onAccent,
      letterSpacing: -0.2,
    },

    // Nhãn
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      borderWidth: 1,
      borderColor: t.colors.lineStrong,
      borderRadius: t.radius.xs,
      paddingHorizontal: 9,
      paddingVertical: 5,
    },
    pillSolid: { backgroundColor: t.colors.accent, borderColor: t.colors.accent },
    pillAlert: { backgroundColor: t.colors.alertSoft, borderColor: 'transparent' },
    pillText: {
      fontFamily: t.fonts.bold,
      fontSize: 10,
      letterSpacing: 0.6,
      color: t.colors.inkBody,
    },

    callout: {
      backgroundColor: t.colors.raised,
      borderLeftWidth: 3,
      borderLeftColor: t.colors.ink,
      borderTopRightRadius: 8,
      borderBottomRightRadius: 8,
      paddingVertical: 13,
      paddingHorizontal: 14,
    },
    calloutWarn: { backgroundColor: t.colors.alertSoft, borderLeftColor: t.colors.alert },
    calloutText: { ...t.type.caption, fontSize: 12.5, lineHeight: 20, color: t.colors.inkBody },
    calloutTextWarn: { color: t.colors.alertInk },

    // Chuyển đổi
    seg: {
      flexDirection: 'row',
      borderWidth: 1,
      borderColor: t.colors.lineStrong,
      borderRadius: t.radius.md,
      overflow: 'hidden',
    },
    segItem: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      paddingHorizontal: 6,
    },
    segItemOn: { backgroundColor: t.colors.accent },
    segDivider: { borderLeftWidth: 1, borderLeftColor: t.colors.line },
    segText: { fontFamily: t.fonts.semibold, fontSize: 12.5, color: t.colors.inkMuted },
    segTextOn: { fontFamily: t.fonts.bold, color: t.colors.onAccent },

    tabsWrap: { borderBottomWidth: 1, borderBottomColor: t.colors.line },
    tab: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingTop: 11,
      paddingBottom: 9,
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
      marginBottom: -1,
    },
    tabOn: { borderBottomColor: t.colors.ink },
    tabText: { fontFamily: t.fonts.medium, fontSize: 13, color: t.colors.inkMuted },
    tabTextOn: { fontFamily: t.fonts.bold, color: t.colors.ink },

    section: {
      flexDirection: 'row',
      alignItems: 'baseline',
      marginTop: t.spacing.lg,
      marginBottom: 10,
    },
    sectionTitle: { ...t.type.heading, color: t.colors.ink, flex: 1 },
    sectionAction: { fontFamily: t.fonts.semibold, fontSize: 11.5, color: t.colors.inkMuted },

    divider: { height: 1, backgroundColor: t.colors.line },

    // Danh tính
    authorRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    authorText: { fontFamily: t.fonts.regular, color: t.colors.inkMuted },

    // Trạng thái rỗng
    empty: { paddingVertical: t.spacing.xl },
    emptyTitle: { ...t.type.heading, fontSize: 17, color: t.colors.ink, marginBottom: t.spacing.sm },
    emptyLine: { ...t.type.body, color: t.colors.inkMuted },
  });
