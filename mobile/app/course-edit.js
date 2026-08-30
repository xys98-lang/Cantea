import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Switch,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  TextInput,
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
import { useAuth } from '../src/store/auth';
import { useTheme, useThemedStyles } from '../src/store/theme';
import { shadow } from '../src/theme';

/** "07/09/2026" -> Date theo giờ địa phương, null nếu không hợp lệ */
const parseVnDate = (v) => {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v || '');
  if (!m) return null;
  const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  return d.getDate() === Number(m[1]) && d.getMonth() === Number(m[2]) - 1 ? d : null;
};

/**
 * Đổi Date sang "YYYY-MM-DD" theo giờ ĐỊA PHƯƠNG.
 *
 * toISOString() quy về UTC nên nửa đêm giờ Việt Nam thành 17 giờ hôm trước và
 * ngày lùi một. Buổi thi ngày 12 gửi lên thành ngày 11 mà không ai thấy sai.
 */
const toYmd = (d) => {
  const p2 = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
};

const DAY_NAME = { 2: 'Thứ 2', 3: 'Thứ 3', 4: 'Thứ 4', 5: 'Thứ 5', 6: 'Thứ 6', 7: 'Thứ 7', 8: 'Chủ nhật' };

const emptyMeeting = (day = 2, period = 1, campus = '') => ({
  repeats: true,
  date: '',
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
  const { user } = useAuth();
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
   * Bảng chọn cơ sở mở cho MỘT buổi, nên phải nhớ đang sửa buổi nào. Dùng null
   * làm trạng thái đóng thay vì cờ boolean riêng — một biến thì không có cách
   * nào rơi vào trạng thái mở mà không biết mở cho ai.
   */
  const [campusFor, setCampusFor] = useState(null);

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

  /**
   * Tra mã trong danh sách cơ sở của trường; không thấy thì trả về chính chuỗi đó.
   * Nhờ vậy tên sinh viên tự gõ hiện đúng mà không cần trường dữ liệu riêng.
   */
  const campusLabel = (value) =>
    campuses.find((c) => c.code === value)?.name || value || '';

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
        /* Buổi một lần gửi ngày; backend suy thứ từ đó nên không gửi dayOfWeek */
        ...(m.repeats === false
          ? { repeats: false, date: toYmd(parseVnDate(m.date)) }
          : { repeats: true, dayOfWeek: m.dayOfWeek }),
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

            {/*
              Công tắc ở cấp BUỔI chứ không phải cấp môn: kỳ thi thường là buổi
              thứ tư của một môn đã có ba buổi lặp — chung tên, chung giảng viên,
              chỉ khác chỗ nó diễn ra đúng một lần.
            */}
            <View style={s.repeatRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.repeatTitle}>Lặp hàng tuần</Text>
                <Text style={s.repeatLine}>
                  {m.repeats
                    ? 'Buổi này diễn ra mỗi tuần trong học kỳ.'
                    : 'Tắt rồi — đây là buổi thi hoặc học bù, chỉ diễn ra một lần.'}
                </Text>
              </View>
              <Switch
                value={m.repeats !== false}
                onValueChange={(v) => patchMeeting(idx, { repeats: v })}
                trackColor={{ true: t.colors.accent, false: t.colors.line }}
              />
            </View>

            {m.repeats === false ? (
              <>
                <Text style={s.chipLabel}>Ngày</Text>
                <TextInput
                  value={m.date}
                  onChangeText={(raw) => {
                    const d = raw.replace(/\D/g, '').slice(0, 8);
                    const out =
                      d.length <= 2 ? d
                        : d.length <= 4 ? `${d.slice(0, 2)}/${d.slice(2)}`
                          : `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
                    patchMeeting(idx, { date: out });
                  }}
                  placeholder="12/04/2026"
                  placeholderTextColor={t.colors.icon}
                  keyboardType="number-pad"
                  maxLength={10}
                  style={[
                    s.dateInput,
                    m.date.length === 10 && !parseVnDate(m.date) && { borderColor: t.colors.alert },
                  ]}
                />
              </>
            ) : (
              <>
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
              Ô cơ sở luôn hiện, kể cả trường chỉ có một cơ sở hoặc chưa xác thực:
              sinh viên vẫn có thể tự đặt tên nơi học. Trước đây là hàng chip cứng
              nên ai không thuộc danh sách thì không có cách nào ghi lại.
            */}
              </>
            )}

            {/*
              Nói ngay ngày đó là thứ mấy và rơi vào tiết nào.
              Thông báo thi ghi "13:15 ngày 12/04"; bắt sinh viên tự tra xem đó là
              thứ mấy và tiết mấy là bắt họ làm việc mà app làm được. Nói luôn khi
              giờ lệch đầu tiết, thay vì lặng lẽ làm tròn rồi để họ tưởng vào trễ.
            */}
            {m.repeats === false && Boolean(parseVnDate(m.date)) && (
              <View style={s.convert}>
                {(() => {
                  const d = parseVnDate(m.date);
                  const vnDay = d.getDay() === 0 ? 8 : d.getDay() + 1;
                  const st = periods.find((p) => p.period === m.fromPeriod);
                  return (
                    <>
                      <Text style={s.convertHead}>
                        {DAY_NAME[vnDay]} · Tiết {m.fromPeriod}
                        {m.toPeriod > m.fromPeriod ? ` – ${m.toPeriod}` : ''}
                      </Text>
                      <Text style={s.convertLine}>
                        Theo khung tiết của bạn.
                        {st ? ` Buổi bắt đầu lúc ${st.start}.` : ''}
                      </Text>
                    </>
                  );
                })()}
              </View>
            )}

            <View style={s.campusHead}>
              <Text style={s.chipLabel}>Cơ sở</Text>
              <Text style={s.optional}>— không bắt buộc</Text>
            </View>
            <TextInput
              value={campusLabel(m.campus)}
              onChangeText={(v) => {
                patchMeeting(idx, { campus: v });
                setCampusFor(idx);
              }}
              onFocus={() => setCampusFor(idx)}
              placeholder="Chọn hoặc gõ tên cơ sở"
              placeholderTextColor={t.colors.icon}
              maxLength={60}
              style={s.campusInput}
            />

            {/*
              Gợi ý nằm ngay dưới ô, không phải bảng trượt lên từ đáy màn hình —
              bảng đó bị bàn phím che mất đúng ô đang gõ.

              Chỉ hiện khi ô đang được gõ VÀ có mục khớp. Không khớp gì thì im lặng:
              chữ trong ô đã là tên tự đặt rồi, không cần thêm nút xác nhận.
            */}
            {campusFor === idx &&
              Boolean((m.campus || '').trim()) &&
              (() => {
                const q = (m.campus || '').trim().toLowerCase();
                const hits = campuses.filter(
                  (c) =>
                    c.name.toLowerCase().includes(q) ||
                    (c.address || '').toLowerCase().includes(q) ||
                    (c.code || '').toLowerCase().includes(q)
                );
                if (!hits.length) return null;
                return (
                  <View style={s.suggestBox}>
                    {hits.map((c) => (
                      <Pressable
                        key={c.code}
                        onPress={() => {
                          patchMeeting(idx, { campus: c.code });
                          setCampusFor(null);
                        }}
                        style={s.suggestRow}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={s.suggestName}>{c.name}</Text>
                          {Boolean(c.address) && (
                            <Text style={s.suggestAddr} numberOfLines={1}>
                              {c.address}
                            </Text>
                          )}
                        </View>
                      </Pressable>
                    ))}
                  </View>
                );
              })()}

            {campuses.length === 0 && (
              <Text style={s.campusHint}>
                Xác thực email trường để thấy danh sách cơ sở có sẵn.
              </Text>
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

  repeatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.md,
    paddingVertical: t.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.line,
    marginBottom: t.spacing.sm,
  },
  repeatTitle: { ...t.type.label, color: t.colors.ink },
  repeatLine: { ...t.type.caption, fontSize: 11.5, color: t.colors.inkMuted, marginTop: 2 },
  dateInput: {
    ...t.type.label,
    color: t.colors.ink,
    borderWidth: 1,
    borderColor: t.colors.line,
    borderRadius: t.radius.md,
    paddingHorizontal: t.spacing.md,
    height: 44,
    width: 140,
  },
  convert: {
    backgroundColor: t.colors.fill,
    borderRadius: t.radius.md,
    padding: t.spacing.md,
    marginTop: t.spacing.md,
  },
  convertHead: { ...t.type.heading, fontSize: 16, color: t.colors.ink },
  convertLine: { ...t.type.caption, color: t.colors.inkBody, marginTop: 3 },

  campusHead: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  optional: { ...t.type.caption, fontSize: 11, color: t.colors.inkMuted },
  campusInput: {
    ...t.type.label,
    color: t.colors.ink,
    borderWidth: 1,
    borderColor: t.colors.line,
    borderRadius: t.radius.md,
    paddingHorizontal: t.spacing.md,
    height: 44,
  },
  campusHint: { ...t.type.caption, fontSize: 11, color: t.colors.inkMuted, marginTop: 5 },
  suggestBox: {
    borderWidth: 1,
    borderColor: t.colors.line,
    borderTopWidth: 0,
    borderBottomLeftRadius: t.radius.md,
    borderBottomRightRadius: t.radius.md,
    backgroundColor: t.colors.surface,
    marginTop: -1,
    overflow: 'hidden',
  },
  suggestRow: {
    paddingHorizontal: t.spacing.md,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: t.colors.line,
  },
  suggestName: { ...t.type.label, color: t.colors.ink },
  suggestAddr: { ...t.type.caption, fontSize: 11, color: t.colors.inkMuted, marginTop: 1 },
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
