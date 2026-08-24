import { useCallback, useEffect, useRef, useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Field, Notice, Rule } from '../src/components/ui';
import {
  fetchSchedule,
  createCourse,
  updateCourse,
  deleteCourse,
  searchCourses,
  DAYS,
} from '../src/api/schedule';
import { useTheme, useThemedStyles } from '../src/store/theme';
import { shadow } from '../src/theme';

const emptyMeeting = (day = 2, period = 1, campus = '') => ({
  dayOfWeek: Number(day) || 2,
  fromPeriod: Number(period) || 1,
  // Mặc định 3 tiết — độ dài phổ biến nhất của một buổi học
  toPeriod: (Number(period) || 1) + 2,
  campus,
  room: '',
  building: '',
});

export default function CourseEdit() {
  const t = useTheme();
  const s = useThemedStyles(styles);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id, day, period } = useLocalSearchParams();
  const isEdit = Boolean(id);

  const [form, setForm] = useState({ courseName: '', courseCode: '', instructor: '' });
  /**
   * Vào từ ô trống trên lưới thì điền sẵn đúng thứ và tiết đó.
   * Người dùng đã chỉ vào chỗ họ muốn — bắt họ chọn lại từ đầu là thừa.
   */
  const [meetings, setMeetings] = useState([emptyMeeting(day, period)]);
  const [periods, setPeriods] = useState([]);
  const [campuses, setCampuses] = useState([]);

  /**
   * Gợi ý lớp học phần. Chỉ bật khi thêm mới — lúc sửa thì sinh viên
   * đang chỉnh chi tiết, gợi ý nhảy ra chỉ vướng.
   */
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [pickedFrom, setPickedFrom] = useState(null);
  const debounce = useRef(null);
  const [error, setError] = useState('');
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
          setCampuses(data.campuses || []);

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
                  campus: m.campus || '',
                  room: m.room || '',
                  building: m.building || '',
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

  /**
   * Tra gợi ý khi gõ tên môn hoặc mã môn.
   *
   * Chờ 350ms sau lần gõ cuối rồi mới gọi — gõ "Kinh tế vi mô" mà gọi
   * từng ký tự là 13 lần gọi mạng cho một lần tìm.
   */
  const lookup = (value) => {
    clearTimeout(debounce.current);
    setPickedFrom(null);

    if (isEdit || String(value).trim().length < 2) {
      setSuggestions([]);
      return;
    }

    debounce.current = setTimeout(async () => {
      setSearching(true);
      try {
        setSuggestions(await searchCourses(value.trim()));
      } catch {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 350);
  };

  useEffect(() => () => clearTimeout(debounce.current), []);

  /** Chọn một gợi ý — điền hết phần còn lại */
  const applySuggestion = (item) => {
    setForm({
      courseName: item.courseName,
      courseCode: item.classCode,
      instructor: item.instructor || '',
    });
    setMeetings(
      (item.meetings || []).map((m) => ({
        dayOfWeek: m.dayOfWeek,
        fromPeriod: m.periods?.fromPeriod || 1,
        toPeriod: m.periods?.toPeriod || 1,
        campus: m.campus || '',
        room: m.room || '',
        building: m.building || '',
        // Buổi không khớp khung tiết thì giữ giờ gốc
        startTime: m.periods ? undefined : m.startTime,
        endTime: m.periods ? undefined : m.endTime,
      }))
    );
    setPickedFrom(item);
    setSuggestions([]);
  };

  const patchMeeting = (idx, patch) =>
    setMeetings((ms) => ms.map((m, i) => (i === idx ? { ...m, ...patch } : m)));

  const removeMeeting = (idx) => setMeetings((ms) => ms.filter((_, i) => i !== idx));

  const submit = async () => {
    setError('');

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
        campus: m.campus || '',
        room: m.room.trim(),
        building: m.building.trim(),
      })),
    };

    setSaving(true);
    try {
      const data = isEdit ? await updateCourse(id, payload) : await createCourse(payload);

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
        <ActivityIndicator color={t.colors.accent} />
      </View>
    );
  }

  const periodNumbers = periods.length
    ? periods.map((p) => p.period)
    : Array.from({ length: 15 }, (_, i) => i + 1);

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

        <Text style={s.title}>{isEdit ? 'Sửa môn học' : 'Thêm môn học'}</Text>
        <Rule style={{ marginBottom: t.spacing.lg }} />

        <Notice>{error}</Notice>

        <Field
          label="TÊN MÔN"
          value={form.courseName}
          onChangeText={(v) => {
            setField('courseName')(v);
            lookup(v);
          }}
          placeholder="Kinh tế vi mô"
        />

        {/* Gợi ý từ danh mục — gom từ lịch sinh viên khác đã nhập */}
        {suggestions.length > 0 && (
          <View style={s.suggestBox}>
            <Text style={s.suggestLabel}>
              {suggestions.length} lớp khớp — chạm để điền sẵn
            </Text>
            {suggestions.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => applySuggestion(item)}
                style={s.suggestRow}
              >
                <View style={{ flex: 1 }}>
                  <Text style={s.suggestName} numberOfLines={1}>
                    {item.courseName}
                  </Text>
                  <Text style={s.suggestMeta} numberOfLines={1}>
                    {[
                      item.classCode,
                      item.instructor,
                      item.meetings
                        ?.map((m) => {
                          const day = DAYS.find((d) => d.value === m.dayOfWeek)?.short;
                          const when = m.periods
                            ? `tiết ${m.periods.fromPeriod}–${m.periods.toPeriod}`
                            : `${m.startTime}`;
                          return `${day} ${when}${m.campusName ? ` · ${m.campusName}` : ''}`;
                        })
                        .join(' | '),
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                </View>
                {item.trusted && (
                  <Ionicons name="checkmark-circle" size={15} color={t.colors.ink} />
                )}
              </Pressable>
            ))}
          </View>
        )}

        {searching && <Text style={s.searching}>Đang tìm…</Text>}

        {Boolean(pickedFrom) && (
          <View style={s.picked}>
            <Ionicons name="sparkles-outline" size={14} color={t.colors.inkBody} />
            <Text style={s.pickedText}>
              Đã điền sẵn từ lịch của {pickedFrom.seenCount} sinh viên. Kiểm tra lại rồi lưu.
            </Text>
          </View>
        )}

        <View style={{ flexDirection: 'row' }}>
          <Field
            label="MÃ MÔN"
            value={form.courseCode}
            onChangeText={(v) => {
              setField('courseCode')(v);
              lookup(v);
            }}
            placeholder="26D1TEC55006501"
            autoCapitalize="characters"
            style={{ flex: 1, marginRight: t.spacing.sm }}
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
                      patchMeeting(idx, { fromPeriod: p, toPeriod: Math.max(p, m.toPeriod) })
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

            {/*
              Chọn cơ sở chỉ hiện khi trường có nhiều hơn một. Trường một
              cơ sở thì dòng này chỉ là nhiễu.
            */}
            {campuses.length > 1 && (
              <>
                <Text style={s.chipLabel}>Cơ sở</Text>
                <View style={s.chipRow}>
                  {campuses.map((c) => (
                    <Pressable
                      key={c.code}
                      onPress={() =>
                        patchMeeting(idx, { campus: m.campus === c.code ? '' : c.code })
                      }
                      style={[s.chip, m.campus === c.code && s.chipOn]}
                    >
                      <Text style={[s.chipText, m.campus === c.code && s.chipTextOn]}>
                        {c.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}

            {/* Phòng và toà nhà đều không bắt buộc — nhiều trường chỉ có một toà */}
            <View style={{ flexDirection: 'row', marginTop: t.spacing.sm }}>
              <Field
                label="PHÒNG"
                value={m.room}
                onChangeText={(v) => patchMeeting(idx, { room: v })}
                placeholder="B201"
                style={{ flex: 1, marginRight: t.spacing.sm, marginBottom: 0 }}
              />
              <Field
                label="TOÀ NHÀ"
                value={m.building}
                onChangeText={(v) => patchMeeting(idx, { building: v })}
                placeholder="Toà A"
                style={{ flex: 1, marginBottom: 0 }}
              />
            </View>
          </View>
        ))}

        <Pressable
          onPress={() =>
            setMeetings((ms) => [...ms, emptyMeeting(day, period, ms[ms.length - 1]?.campus || '')])
          }
          style={s.addMeeting}
        >
          <Text style={s.addMeetingText}>+ Thêm buổi học</Text>
        </Pressable>

        <View style={{ marginTop: t.spacing.lg }}>
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

const styles = (t) =>
  StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.colors.bg },
  scroll: { paddingHorizontal: t.spacing.lg },
  back: { paddingVertical: t.spacing.sm, marginBottom: t.spacing.sm },
  backText: { ...t.type.label, color: t.colors.accentPressed },
  title: { ...t.type.title, color: t.colors.ink },

  sectionLabel: {
    ...t.type.micro,
    color: t.colors.inkMuted,
    marginTop: t.spacing.md,
    marginBottom: t.spacing.sm,
  },

  meeting: {
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.line,
    borderRadius: t.radius.lg,
    padding: t.spacing.md,
    marginBottom: t.spacing.md,
    ...shadow.card,
  },
  meetingHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: t.spacing.sm,
  },
  meetingTitle: { ...t.type.label, color: t.colors.ink },
  remove: { ...t.type.caption, color: t.colors.alertInk },

  suggestBox: {
    borderWidth: 1,
    borderColor: t.colors.lineStrong,
    borderRadius: t.radius.md,
    overflow: 'hidden',
    marginBottom: t.spacing.sm,
  },
  suggestLabel: {
    ...t.type.micro,
    color: t.colors.inkMuted,
    backgroundColor: t.colors.raised,
    paddingHorizontal: t.spacing.md,
    paddingVertical: 8,
  },
  suggestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.sm,
    paddingHorizontal: t.spacing.md,
    paddingVertical: 11,
    borderTopWidth: 1,
    borderTopColor: t.colors.line,
  },
  suggestName: { ...t.type.itemTitle, fontSize: 13.5, color: t.colors.ink },
  suggestMeta: { ...t.type.caption, fontSize: 11, color: t.colors.inkMuted, marginTop: 2 },
  searching: { ...t.type.caption, color: t.colors.inkMuted, marginBottom: t.spacing.sm },
  picked: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: t.colors.raised,
    borderRadius: t.radius.sm,
    paddingHorizontal: t.spacing.md,
    paddingVertical: 9,
    marginBottom: t.spacing.sm,
  },
  pickedText: { ...t.type.caption, fontSize: 11.5, color: t.colors.inkBody, flex: 1 },

  chipLabel: { ...t.type.micro, color: t.colors.inkMuted, marginTop: t.spacing.sm, marginBottom: 6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.bg,
    borderWidth: 1,
    borderColor: t.colors.line,
  },
  chipSm: {
    minWidth: 36,
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.bg,
    borderWidth: 1,
    borderColor: t.colors.line,
  },
  chipOn: { backgroundColor: t.colors.accent, borderColor: t.colors.accent },
  chipText: { ...t.type.label, color: t.colors.inkMuted },
  chipTextOn: { color: t.colors.onAccent },

  addMeeting: {
    borderWidth: 1,
    borderColor: t.colors.accent,
    borderStyle: 'dashed',
    borderRadius: t.radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  addMeetingText: { ...t.type.label, color: t.colors.accentPressed },

  deleteBtn: { marginTop: t.spacing.md, alignItems: 'center', paddingVertical: t.spacing.md },
  deleteText: { ...t.type.label, color: t.colors.alertInk },
});
