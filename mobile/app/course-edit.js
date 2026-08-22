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
  View,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Field, Notice, Rule } from '../src/components/ui';
import {
  fetchSchedule,
  createCourse,
  updateCourse,
  deleteCourse,
  DAYS,
} from '../src/api/schedule';
import { colors, radius, spacing, type } from '../src/theme';

const emptyMeeting = () => ({
  dayOfWeek: 2,
  fromPeriod: 1,
  toPeriod: 3,
  room: '',
});

export default function CourseEdit() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams();
  const isEdit = Boolean(id);

  const [form, setForm] = useState({ courseName: '', courseCode: '', instructor: '' });
  const [meetings, setMeetings] = useState([emptyMeeting()]);
  const [periods, setPeriods] = useState([]);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        try {
          const data = await fetchSchedule();
          if (!alive) return;
          setPeriods(data.periods || []);

          if (isEdit) {
            const found = (data.courses || []).find((c) => String(c.id || c._id) === String(id));
            if (found) {
              setForm({
                courseName: found.courseName || '',
                courseCode: found.courseCode || '',
                instructor: found.instructor || '',
              });
              setMeetings(
                (found.meetings || []).map((m) => ({
                  dayOfWeek: m.dayOfWeek,
                  fromPeriod: m.periods?.fromPeriod || 1,
                  toPeriod: m.periods?.toPeriod || 1,
                  room: m.room || '',
                }))
              );
            }
          }
        } catch (e) {
          if (alive) setError(e.message || 'Không tải được dữ liệu');
        } finally {
          if (alive) setLoading(false);
        }
      })();
      return () => {
        alive = false;
      };
    }, [id, isEdit])
  );

  const setField = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const patchMeeting = (idx, patch) =>
    setMeetings((ms) => ms.map((m, i) => (i === idx ? { ...m, ...patch } : m)));

  const removeMeeting = (idx) => setMeetings((ms) => ms.filter((_, i) => i !== idx));

  const submit = async () => {
    setError('');
    setWarning('');

    if (!form.courseName.trim()) {
      setError('Nhập tên môn học');
      return;
    }

    const payload = {
      courseName: form.courseName.trim(),
      courseCode: form.courseCode.trim(),
      instructor: form.instructor.trim(),
      meetings: meetings.map((m) => ({
        dayOfWeek: m.dayOfWeek,
        fromPeriod: m.fromPeriod,
        toPeriod: Math.max(m.fromPeriod, m.toPeriod),
        room: m.room.trim(),
      })),
    };

    setSaving(true);
    try {
      const data = isEdit ? await updateCourse(id, payload) : await createCourse(payload);

      // Trùng lịch chỉ là cảnh báo — sinh viên đôi khi cố ý đăng ký chồng
      if (data.conflicts?.length) {
        const names = [...new Set(data.conflicts.map((c) => c.with))].join(', ');
        Alert.alert('Đã lưu, nhưng trùng lịch', `Môn này đè lên: ${names}`, [
          { text: 'Đã hiểu', onPress: () => router.back() },
        ]);
        return;
      }
      router.back();
    } catch (e) {
      setError(e.message || 'Không lưu được');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    Alert.alert('Xoá môn học', `Xoá "${form.courseName}" khỏi thời khoá biểu?`, [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xoá',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteCourse(id);
            router.back();
          } catch (e) {
            setError(e.message || 'Không xoá được');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  const periodNumbers = periods.length
    ? periods.map((p) => p.period)
    : Array.from({ length: 15 }, (_, i) => i + 1);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          s.scroll,
          { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xl },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable onPress={() => router.back()} style={s.back}>
          <Text style={s.backText}>← Quay lại</Text>
        </Pressable>

        <Text style={s.title}>{isEdit ? 'Sửa môn học' : 'Thêm môn học'}</Text>
        <Rule style={{ marginBottom: spacing.lg }} />

        <Notice>{error}</Notice>
        <Notice tone="warning">{warning}</Notice>

        <Field
          label="TÊN MÔN"
          value={form.courseName}
          onChangeText={setField('courseName')}
          placeholder="Kinh tế vi mô"
        />

        <View style={{ flexDirection: 'row' }}>
          <Field
            label="MÃ MÔN"
            value={form.courseCode}
            onChangeText={setField('courseCode')}
            placeholder="ECO101"
            autoCapitalize="characters"
            style={{ flex: 1, marginRight: spacing.sm }}
          />
          <Field
            label="GIẢNG VIÊN"
            value={form.instructor}
            onChangeText={setField('instructor')}
            placeholder="Thầy Nam"
            style={{ flex: 1.4 }}
          />
        </View>

        <Text style={s.sectionLabel}>BUỔI HỌC TRONG TUẦN</Text>

        {meetings.map((m, idx) => (
          <View key={idx} style={s.meeting}>
            <View style={s.meetingHead}>
              <Text style={s.meetingTitle}>Buổi {idx + 1}</Text>
              {meetings.length > 1 && (
                <Pressable onPress={() => removeMeeting(idx)} hitSlop={8}>
                  <Text style={s.remove}>Xoá</Text>
                </Pressable>
              )}
            </View>

            <Text style={s.chipLabel}>Thứ</Text>
            <View style={s.chipRow}>
              {DAYS.map((d) => (
                <Pressable
                  key={d.value}
                  onPress={() => patchMeeting(idx, { dayOfWeek: d.value })}
                  style={[s.chip, m.dayOfWeek === d.value && s.chipOn]}
                >
                  <Text style={[s.chipText, m.dayOfWeek === d.value && s.chipTextOn]}>
                    {d.short}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={s.chipLabel}>Từ tiết</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={s.chipRow}>
                {periodNumbers.map((p) => (
                  <Pressable
                    key={p}
                    onPress={() =>
                      patchMeeting(idx, {
                        fromPeriod: p,
                        toPeriod: Math.max(p, m.toPeriod),
                      })
                    }
                    style={[s.chipSm, m.fromPeriod === p && s.chipOn]}
                  >
                    <Text style={[s.chipText, m.fromPeriod === p && s.chipTextOn]}>{p}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            <Text style={s.chipLabel}>Đến tiết</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={s.chipRow}>
                {periodNumbers
                  .filter((p) => p >= m.fromPeriod)
                  .map((p) => (
                    <Pressable
                      key={p}
                      onPress={() => patchMeeting(idx, { toPeriod: p })}
                      style={[s.chipSm, m.toPeriod === p && s.chipOn]}
                    >
                      <Text style={[s.chipText, m.toPeriod === p && s.chipTextOn]}>{p}</Text>
                    </Pressable>
                  ))}
              </View>
            </ScrollView>

            <Field
              label="PHÒNG"
              value={m.room}
              onChangeText={(v) => patchMeeting(idx, { room: v })}
              placeholder="B201"
              style={{ marginTop: spacing.sm, marginBottom: 0 }}
            />
          </View>
        ))}

        <Pressable
          onPress={() => setMeetings((ms) => [...ms, emptyMeeting()])}
          style={s.addMeeting}
        >
          <Text style={s.addMeetingText}>+ Thêm buổi học</Text>
        </Pressable>

        <View style={{ marginTop: spacing.lg }}>
          <Button
            title={isEdit ? 'Lưu thay đổi' : 'Thêm môn học'}
            onPress={submit}
            loading={saving}
          />
        </View>

        {isEdit && (
          <Pressable onPress={confirmDelete} style={s.deleteBtn}>
            <Text style={s.deleteText}>Xoá môn học</Text>
          </Pressable>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  scroll: { paddingHorizontal: spacing.lg },
  back: { paddingVertical: spacing.sm, marginBottom: spacing.sm },
  backText: { ...type.label, color: colors.brandDeep },
  title: { ...type.title, color: colors.ink },

  sectionLabel: {
    ...type.micro,
    color: colors.inkFaint,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },

  meeting: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  meetingHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  meetingTitle: { ...type.label, color: colors.ink },
  remove: { ...type.caption, color: colors.dangerInk, fontWeight: '600' },

  chipLabel: { ...type.micro, color: colors.inkFaint, marginTop: spacing.sm, marginBottom: 6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSm: {
    minWidth: 36,
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipOn: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { ...type.label, color: colors.inkMuted },
  chipTextOn: { color: colors.white },

  addMeeting: {
    borderWidth: 1,
    borderColor: colors.brand,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  addMeetingText: { ...type.label, color: colors.brandDeep },

  deleteBtn: { marginTop: spacing.md, alignItems: 'center', paddingVertical: spacing.md },
  deleteText: { ...type.label, color: colors.dangerInk },
});
