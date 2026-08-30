import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button, Notice, Rule } from '../src/components/ui';
import {
  fetchTerm,
  saveTerm,
  fetchPeriods,
  savePeriods,
  resetPeriods,
  buildPeriods,
  inferSessions,
  isValidTime,
  toMinutes,
} from '../src/api/schedule';
import { useTheme, useThemedStyles } from '../src/store/theme';
import { shadow } from '../src/theme';

/** Ô nhập giờ dạng HH:MM, tự chèn dấu hai chấm khi gõ */
const TimeInput = ({ value, onChange, style }) => {
  const t = useTheme();
  const s = useThemedStyles(styles);

  const handle = (raw) => {
    const digits = raw.replace(/\D/g, '').slice(0, 4);
    if (digits.length <= 2) onChange(digits);
    else onChange(`${digits.slice(0, 2)}:${digits.slice(2)}`);
  };

  const bad = value.length === 5 && !isValidTime(value);

  return (
    <TextInput
      value={value}
      onChangeText={handle}
      placeholder="07:00"
      placeholderTextColor={t.colors.inkMuted}
      keyboardType="number-pad"
      maxLength={5}
      style={[s.timeInput, bad && { borderColor: t.colors.alert }, style]}
    />
  );
};

/** "07/09/2026" -> Date theo giờ địa phương, null nếu không hợp lệ */
const parseVnDate = (v) => {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v || '');
  if (!m) return null;
  const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  return d.getDate() === Number(m[1]) && d.getMonth() === Number(m[2]) - 1 ? d : null;
};

/**
 * Đổi Date sang "YYYY-MM-DD" theo giờ ĐỊA PHƯƠNG. toISOString() quy về UTC nên
 * nửa đêm giờ Việt Nam thành 17 giờ hôm trước và ngày bị lùi một.
 */
const toYmd = (d) => {
  const p2 = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
};

/** Ô nhập ngày dd/mm/yyyy, tự chèn dấu gạch khi gõ */
const DateInput = ({ value, onChange }) => {
  const t = useTheme();
  const s = useThemedStyles(styles);

  const handle = (raw) => {
    const d = raw.replace(/\D/g, '').slice(0, 8);
    if (d.length <= 2) onChange(d);
    else if (d.length <= 4) onChange(`${d.slice(0, 2)}/${d.slice(2)}`);
    else onChange(`${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`);
  };

  const bad = value.length === 10 && !parseVnDate(value);

  return (
    <TextInput
      value={value}
      onChangeText={handle}
      placeholder="07/09/2026"
      placeholderTextColor={t.colors.inkMuted}
      keyboardType="number-pad"
      maxLength={10}
      style={[s.timeInput, { width: 128 }, bad && { borderColor: t.colors.alert }]}
    />
  );
};

const NumStepper = ({ value, onChange, min = 1, max = 20, suffix = '' }) => {
  const t = useTheme();
  const s = useThemedStyles(styles);

  return (
  <View style={s.stepper}>
    <Pressable
      onPress={() => onChange(Math.max(min, value - 1))}
      style={s.stepBtn}
      hitSlop={6}
    >
      <Ionicons name="remove" size={16} color={t.colors.accentPressed} />
    </Pressable>
    <Text style={s.stepValue}>
      {value}
      {suffix}
    </Text>
    <Pressable
      onPress={() => onChange(Math.min(max, value + 1))}
      style={s.stepBtn}
      hitSlop={6}
    >
      <Ionicons name="add" size={16} color={t.colors.accentPressed} />
    </Pressable>
  </View>
);
};

export default function ScheduleSettings() {
  const t = useTheme();
  const s = useThemedStyles(styles);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [tab, setTab] = useState('quick');

  const [termStart, setTermStart] = useState('');
  const [termWeeks, setTermWeeks] = useState(15);
  const [termSet, setTermSet] = useState(false);
  const [termSaving, setTermSaving] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [isCustom, setIsCustom] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await fetchPeriods();
      setPeriods(data.periods || []);
      setSessions(inferSessions(data.periods));
      setIsCustom(data.isCustom);
    } catch (e) {
      setError(e.message || 'Không tải được khung tiết');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const patchSession = (idx, patch) =>
    setSessions((ss) => ss.map((x, i) => (i === idx ? { ...x, ...patch } : x)));

  const patchPeriod = (idx, patch) =>
    setPeriods((ps) => ps.map((p, i) => (i === idx ? { ...p, ...patch } : p)));

  /** Dựng lại toàn bộ khung từ thông số ca học */
  const applyQuick = () => {
    setError('');

    // Đặt tên sess chứ không phải s — s đã là bảng style trong file này
    for (const sess of sessions) {
      if (sess.enabled && !isValidTime(sess.start)) {
        setError(`${sess.label}: giờ bắt đầu không hợp lệ`);
        return;
      }
    }
    if (!sessions.some((x) => x.enabled)) {
      setError('Bật ít nhất một ca học');
      return;
    }

    const next = buildPeriods(sessions);
    setPeriods(next);
    setTab('detail');
  };

  const validate = () => {
    if (!periods.length) return 'Khung tiết đang trống';

    for (const p of periods) {
      if (!isValidTime(p.start) || !isValidTime(p.end)) {
        return `Tiết ${p.period}: giờ không hợp lệ`;
      }
      if (toMinutes(p.end) <= toMinutes(p.start)) {
        return `Tiết ${p.period}: giờ kết thúc phải sau giờ bắt đầu`;
      }
    }
    return null;
  };

  const save = () => {
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    setError('');

    /**
     * Database lưu giờ chứ không lưu tiết, nên đổi khung không mất dữ liệu.
     * Nhưng môn nhập theo tiết cũ sẽ không còn khớp tiết nào và hiện ra
     * dưới dạng giờ. Hỏi trước để sinh viên tự chọn.
     */
    Alert.alert(
      'Cập nhật môn đã nhập?',
      'Các môn bạn đã thêm đang lưu theo giờ. Có tính lại giờ của chúng theo khung tiết mới không?',
      [
        { text: 'Huỷ', style: 'cancel' },
        { text: 'Giữ nguyên giờ cũ', onPress: () => doSave(false) },
        { text: 'Tính lại theo tiết', onPress: () => doSave(true) },
      ]
    );
  };

  const doSave = async (remap) => {
    setSaving(true);
    try {
      const clean = periods.map((p, i) => ({
        period: i + 1,
        start: p.start,
        end: p.end,
        session: p.session || 'morning',
      }));
      const res = await savePeriods(clean, remap);
      Alert.alert('Đã lưu', res.message || 'Đã lưu khung tiết', [
        { text: 'Xong', onPress: () => router.back() },
      ]);
    } catch (e) {
      setError(e.message || 'Không lưu được');
    } finally {
      setSaving(false);
    }
  };

  const confirmReset = () =>
    Alert.alert('Khôi phục mặc định', 'Xoá khung tiết riêng và quay về khung mặc định?', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Khôi phục',
        style: 'destructive',
        onPress: async () => {
          try {
            const data = await resetPeriods();
            setPeriods(data.periods);
            setSessions(inferSessions(data.periods));
            setIsCustom(false);
          } catch (e) {
            setError(e.message);
          }
        },
      },
    ]);

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={t.colors.accent} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: t.colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          s.scroll,
          { paddingTop: insets.top + t.spacing.md, paddingBottom: insets.bottom + t.spacing.xl },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable onPress={() => router.back()} style={s.back} hitSlop={8}>
          <Text style={s.backText}>← Quay lại</Text>
        </Pressable>

        <Text style={s.title}>Khung tiết học</Text>
        <Rule style={{ marginBottom: t.spacing.md }} />

        <Text style={s.intro}>
          Mỗi trường có giờ vào tiết khác nhau. Chỉnh ở đây để lịch của bạn hiện đúng.
        </Text>

        <View style={s.segment}>
          <Pressable
            onPress={() => setTab('quick')}
            style={[s.segBtn, tab === 'quick' && s.segOn]}
          >
            <Text style={[s.segText, tab === 'quick' && s.segTextOn]}>Chỉnh cả bảng</Text>
          </Pressable>
          <Pressable
            onPress={() => setTab('detail')}
            style={[s.segBtn, tab === 'detail' && s.segOn]}
          >
            <Text style={[s.segText, tab === 'detail' && s.segTextOn]}>Từng tiết</Text>
          </Pressable>
        </View>

        <Notice>{error}</Notice>

        {tab === 'quick' ? (
          <>
            <Text style={s.hint}>
              Khai báo vài thông số, app tự dựng cả khung. Nhanh hơn gõ tay từng tiết.
            </Text>

            {sessions.map((sess, idx) => (
              <View key={sess.key} style={[s.card, !sess.enabled && { opacity: 0.55 }]}>
                <Pressable
                  onPress={() => patchSession(idx, { enabled: !sess.enabled })}
                  style={s.cardHead}
                >
                  <Text style={s.cardTitle}>{sess.label}</Text>
                  <View style={[s.check, sess.enabled && s.checkOn]}>
                    {sess.enabled && <Ionicons name="checkmark" size={14} color={t.colors.onAccent} />}
                  </View>
                </Pressable>

                {sess.enabled && (
                  <>
                    <View style={s.row}>
                      <Text style={s.rowLabel}>Bắt đầu lúc</Text>
                      <TimeInput
                        value={sess.start}
                        onChange={(v) => patchSession(idx, { start: v })}
                      />
                    </View>

                    <View style={s.row}>
                      <Text style={s.rowLabel}>Số tiết</Text>
                      <NumStepper
                        value={sess.count}
                        onChange={(v) => patchSession(idx, { count: v })}
                        min={1}
                        max={10}
                      />
                    </View>

                    <View style={s.row}>
                      <Text style={s.rowLabel}>Mỗi tiết</Text>
                      <NumStepper
                        value={sess.duration}
                        onChange={(v) => patchSession(idx, { duration: v })}
                        min={30}
                        max={120}
                        suffix=" phút"
                      />
                    </View>

                    <View style={s.row}>
                      <Text style={s.rowLabel}>Nghỉ sau tiết</Text>
                      <NumStepper
                        value={sess.breakAfter}
                        onChange={(v) => patchSession(idx, { breakAfter: v })}
                        min={0}
                        max={sess.count}
                      />
                    </View>

                    {sess.breakAfter > 0 && (
                      <View style={[s.row, s.rowLast]}>
                        <Text style={s.rowLabel}>Nghỉ bao lâu</Text>
                        <NumStepper
                          value={sess.breakMinutes}
                          onChange={(v) => patchSession(idx, { breakMinutes: v })}
                          min={5}
                          max={60}
                          suffix=" phút"
                        />
                      </View>
                    )}
                  </>
                )}
              </View>
            ))}

            <Button title="Dựng khung tiết" onPress={applyQuick} />
            <Text style={s.afterHint}>
              Xem lại ở tab “Từng tiết” rồi mới lưu. Chỉnh tay được từng tiết một.
            </Text>
          </>
        ) : (
          <>
            <Text style={s.hint}>
              Sửa trực tiếp giờ của từng tiết. Dùng khi trường bạn có tiết dài ngắn khác nhau.
            </Text>

            <View style={s.list}>
              {periods.map((p, idx) => (
                <View key={`${p.period}-${idx}`} style={[s.periodRow, idx === periods.length - 1 && s.rowLast]}>
                  <View style={s.periodBadge}>
                    <Text style={s.periodNum}>{idx + 1}</Text>
                  </View>
                  <TimeInput
                    value={p.start}
                    onChange={(v) => patchPeriod(idx, { start: v })}
                    style={{ flex: 1 }}
                  />
                  <Text style={s.dash}>–</Text>
                  <TimeInput
                    value={p.end}
                    onChange={(v) => patchPeriod(idx, { end: v })}
                    style={{ flex: 1 }}
                  />
                  <Pressable
                    onPress={() => setPeriods((ps) => ps.filter((_, i) => i !== idx))}
                    hitSlop={8}
                    style={{ marginLeft: t.spacing.sm }}
                  >
                    <Ionicons name="close" size={17} color={t.colors.inkMuted} />
                  </Pressable>
                </View>
              ))}
            </View>

            <Pressable
              onPress={() =>
                setPeriods((ps) => [
                  ...ps,
                  {
                    period: ps.length + 1,
                    start: ps.length ? ps[ps.length - 1].end : '07:00',
                    end: '',
                    session: ps.length ? ps[ps.length - 1].session : 'morning',
                  },
                ])
              }
              style={s.addRow}
            >
              <Text style={s.addRowText}>+ Thêm tiết</Text>
            </Pressable>

            <View style={{ marginTop: t.spacing.lg }}>
              <Button title="Lưu khung tiết" onPress={save} loading={saving} />
            </View>
          </>
        )}

        {isCustom && (
          <Pressable onPress={confirmReset} style={s.reset}>
            <Text style={s.resetText}>Khôi phục khung mặc định</Text>
          </Pressable>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = (t) =>
  StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.colors.bg },
  scroll: { paddingHorizontal: t.spacing.lg },
  back: { paddingVertical: t.spacing.sm, marginBottom: t.spacing.sm },
  backText: { ...t.type.label, color: t.colors.accentPressed },
  title: { ...t.type.title, color: t.colors.ink },
  intro: { ...t.type.caption, color: t.colors.inkMuted, marginBottom: t.spacing.md },

  segment: {
    flexDirection: 'row',
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.md,
    borderWidth: 1,
    borderColor: t.colors.line,
    padding: 3,
    gap: 3,
    marginBottom: t.spacing.md,
  },
  segBtn: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: t.radius.sm },
  segOn: { backgroundColor: t.colors.accent },
  segText: { ...t.type.label, color: t.colors.inkMuted },
  segTextOn: { color: t.colors.onAccent },

  hint: { ...t.type.caption, color: t.colors.inkMuted, marginBottom: t.spacing.md },
  afterHint: { ...t.type.caption, color: t.colors.inkMuted, marginTop: t.spacing.sm, textAlign: 'center' },

  card: {
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.line,
    borderRadius: t.radius.lg,
    paddingHorizontal: t.spacing.md,
    paddingBottom: t.spacing.xs,
    marginBottom: t.spacing.md,
    ...shadow.card,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: t.spacing.md,
  },
  cardTitle: { ...t.type.heading, fontSize: 16, color: t.colors.ink },
  check: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: t.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: t.colors.accent },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    borderTopWidth: 1,
    borderTopColor: t.colors.line,
  },
  rowLast: { borderBottomWidth: 0 },
  rowLabel: { ...t.type.caption, color: t.colors.inkMuted },

  timeInput: {
    fontFamily: t.fonts.medium,
    fontSize: 15,
    color: t.colors.ink,
    backgroundColor: t.colors.bg,
    borderWidth: 1,
    borderColor: t.colors.line,
    borderRadius: t.radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 7,
    minWidth: 76,
    textAlign: 'center',
  },

  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.colors.bg,
    borderRadius: t.radius.sm,
    borderWidth: 1,
    borderColor: t.colors.line,
  },
  stepBtn: { paddingHorizontal: 11, paddingVertical: 7 },
  stepValue: {
    fontFamily: t.fonts.semibold,
    fontSize: 14,
    color: t.colors.ink,
    minWidth: 62,
    textAlign: 'center',
  },

  list: {
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.line,
    borderRadius: t.radius.lg,
    paddingHorizontal: t.spacing.md,
    ...shadow.card,
  },
  periodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.line,
    gap: t.spacing.sm,
  },
  periodBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: t.colors.fill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodNum: { fontFamily: t.fonts.semibold, fontSize: 12, color: t.colors.accentPressed },
  dash: { ...t.type.caption, color: t.colors.inkMuted },

  addRow: {
    borderWidth: 1,
    borderColor: t.colors.accent,
    borderStyle: 'dashed',
    borderRadius: t.radius.md,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: t.spacing.md,
  },
  addRowText: { ...t.type.label, color: t.colors.accentPressed },

  reset: { marginTop: t.spacing.lg, alignItems: 'center', paddingVertical: t.spacing.md },
  resetText: { ...t.type.label, color: t.colors.alertInk },
});
