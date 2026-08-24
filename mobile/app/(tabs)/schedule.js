import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button, Callout, Divider, EmptyState, Rule, Segmented } from '../../src/components/ui';
import { fetchSchedule, setTimeDisplay, toMinutes } from '../../src/api/schedule';
import { loadSettings, hasPermission, rescheduleAll } from '../../src/services/notifications';
import { useTheme, useThemedStyles } from '../../src/store/theme';

const ROW_H = 46;
const PERIOD_W = 26;

const WEEKDAYS = [
  { value: 2, short: 'T2' },
  { value: 3, short: 'T3' },
  { value: 4, short: 'T4' },
  { value: 5, short: 'T5' },
  { value: 6, short: 'T6' },
];

const WEEKEND = [
  { value: 7, short: 'T7' },
  { value: 8, short: 'CN' },
];

const DAY_LABEL = {
  2: 'Thứ hai',
  3: 'Thứ ba',
  4: 'Thứ tư',
  5: 'Thứ năm',
  6: 'Thứ sáu',
  7: 'Thứ bảy',
  8: 'Chủ nhật',
};

const jsDayToVn = (d) => (d === 0 ? 8 : d + 1);

const mondayOf = (date) => {
  const x = new Date(date);
  const day = x.getDay();
  x.setDate(x.getDate() + (day === 0 ? -6 : 1 - day));
  x.setHours(0, 0, 0, 0);
  return x;
};

const dateOfVnDay = (monday, vnDay) => {
  const x = new Date(monday);
  x.setDate(x.getDate() + (vnDay - 2));
  return x;
};

const dd = (d) => String(d.getDate()).padStart(2, '0');
const ddmm = (d) => `${dd(d)}/${String(d.getMonth() + 1).padStart(2, '0')}`;

/**
 * Chia làn cho các khối đè lên nhau.
 *
 * Trước đây khối sau bị lệch xuống và đổi nền — nhưng chúng vẫn chồng
 * lên nhau nên không đọc được cái nào ra cái nào. Nay chia đôi bề ngang
 * cột: hai môn trùng giờ nằm cạnh nhau, mỗi cái một nửa. Đây là cách
 * mọi ứng dụng lịch xử lý, và nó đọc được ngay mà không cần màu.
 *
 * Chỉ nhóm nào thực sự đè nhau mới bị chia — môn đứng một mình vẫn
 * chiếm trọn cột.
 */
const assignLanes = (blocks) => {
  const sorted = [...blocks].sort((a, b) => a.row - b.row || a.span - b.span);
  const groups = [];
  let current = [];
  let groupEnd = -1;

  for (const b of sorted) {
    if (current.length && b.row >= groupEnd) {
      groups.push(current);
      current = [];
      groupEnd = -1;
    }
    current.push(b);
    groupEnd = Math.max(groupEnd, b.row + b.span);
  }
  if (current.length) groups.push(current);

  const out = [];
  for (const group of groups) {
    const laneEnds = [];
    for (const b of group) {
      let lane = laneEnds.findIndex((end) => end <= b.row);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(0);
      }
      laneEnds[lane] = b.row + b.span;
      out.push({ ...b, lane });
    }
    const total = laneEnds.length;
    for (let i = out.length - group.length; i < out.length; i += 1) {
      out[i].lanes = total;
    }
  }

  return out;
};

export default function ScheduleScreen() {
  const t = useTheme();
  const s = useThemedStyles(styles);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const today = jsDayToVn(new Date().getDay());
  const monday = useMemo(() => mondayOf(new Date()), []);

  const [courses, setCourses] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [campuses, setCampuses] = useState([]);
  const [mode, setMode] = useState('period');
  const [selectedDay, setSelectedDay] = useState(today > 6 ? 2 : today);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await fetchSchedule();
      setCourses(data.courses || []);
      setPeriods(data.periods || []);
      setConflicts(data.conflicts || []);
      setCampuses(data.campuses || []);

      /**
       * Xếp lại lời nhắc mỗi lần tải thời khoá biểu.
       *
       * Không có bước này thì sinh viên thêm môn xong vẫn không được nhắc
       * cho tới khi họ tự vào màn cài đặt — mà phần lớn sẽ không vào, rồi
       * kết luận tính năng nhắc lịch hỏng.
       *
       * Chạy ngầm, hỏng cũng không ảnh hưởng tới việc hiện lịch.
       */
      if (await hasPermission()) {
        const cfg = await loadSettings();
        const names = data.campuses || [];
        rescheduleAll(
          data.courses || [],
          cfg,
          (code) => names.find((x) => x.code === code)?.name || ''
        ).catch(() => {});
      }
      setMode(data.timeDisplay || 'period');
    } catch (e) {
      setError(e.message || 'Không tải được thời khoá biểu');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const setDisplay = async (next) => {
    if (next === mode) return;
    setMode(next);
    try {
      await setTimeDisplay(next);
    } catch {
      // Hiển thị vẫn đổi trong phiên này dù lưu thất bại
    }
  };

  const weekendSlots = useMemo(() => {
    const map = { 7: 0, 8: 0 };
    courses.forEach((c) =>
      (c.meetings || []).forEach((m) => {
        if (m.dayOfWeek >= 7) map[m.dayOfWeek] += 1;
      })
    );
    return map;
  }, [courses]);

  const visiblePeriods = useMemo(() => {
    if (!periods.length) return [];
    if (!courses.length) return periods.slice(0, 9);

    let min = periods.length - 1;
    let max = 0;

    courses.forEach((c) =>
      (c.meetings || []).forEach((m) => {
        const st = toMinutes(m.startTime);
        const en = toMinutes(m.endTime);
        periods.forEach((p, i) => {
          if (toMinutes(p.start) <= st && st < toMinutes(p.end)) min = Math.min(min, i);
          if (toMinutes(p.start) < en && en <= toMinutes(p.end)) max = Math.max(max, i);
        });
      })
    );

    if (min > max) return periods.slice(0, 9);
    return periods.slice(Math.max(0, min), Math.min(periods.length, max + 1));
  }, [periods, courses]);

  const conflictIds = useMemo(() => {
    const set = new Set();
    conflicts.forEach((c) => (c.courseIds || []).forEach((id) => set.add(String(id))));
    return set;
  }, [conflicts]);

  /** Khối được nhóm theo ngày rồi chia làn trong từng ngày */
  const blocksByDay = useMemo(() => {
    if (!visiblePeriods.length) return {};

    const rowStart = (mins) => {
      let i = visiblePeriods.findIndex(
        (p) => toMinutes(p.start) <= mins && mins < toMinutes(p.end)
      );
      if (i === -1) {
        i = visiblePeriods.findIndex((p) => toMinutes(p.start) > mins);
        if (i === -1) i = visiblePeriods.length - 1;
      }
      return i;
    };

    const rowEnd = (mins) => {
      let i = visiblePeriods.findIndex(
        (p) => toMinutes(p.start) < mins && mins <= toMinutes(p.end)
      );
      if (i === -1) {
        for (let k = visiblePeriods.length - 1; k >= 0; k -= 1) {
          if (toMinutes(visiblePeriods[k].end) < mins) return k;
        }
        i = 0;
      }
      return i;
    };

    const byDay = {};
    courses.forEach((course) => {
      const id = String(course.id || course._id);
      (course.meetings || []).forEach((m) => {
        const dayIdx = WEEKDAYS.findIndex((d) => d.value === m.dayOfWeek);
        if (dayIdx === -1) return;

        const from = rowStart(toMinutes(m.startTime));
        const to = Math.max(from, rowEnd(toMinutes(m.endTime)));

        (byDay[dayIdx] ||= []).push({
          key: `${id}-${m._id || `${m.dayOfWeek}${m.startTime}`}`,
          courseId: id,
          name: course.courseCode || course.courseName,
          room: m.room,
          row: from,
          span: to - from + 1,
          conflicted: conflictIds.has(id),
        });
      });
    });

    Object.keys(byDay).forEach((k) => {
      byDay[k] = assignLanes(byDay[k]);
    });
    return byDay;
  }, [courses, visiblePeriods, conflictIds]);

  const campusName = useCallback(
    (code) => campuses.find((c) => c.code === code)?.name || code,
    [campuses]
  );

  const daySchedule = useMemo(() => {
    const items = [];
    courses.forEach((c) =>
      (c.meetings || []).forEach((m) => {
        if (m.dayOfWeek !== selectedDay) return;
        items.push({
          courseId: String(c.id || c._id),
          name: c.courseName,
          instructor: c.instructor,
          room: m.room,
          building: m.building,
          campus: m.campus,
          startTime: m.startTime,
          endTime: m.endTime,
          periods: m.periods,
        });
      })
    );
    return items.sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
  }, [courses, selectedDay]);

  /** Chạm vào ô trống trên lưới để thêm môn ngay tại chỗ đó */
  const addAt = (dayIdx, periodIdx) => {
    const day = WEEKDAYS[dayIdx].value;
    const period = visiblePeriods[periodIdx]?.period;
    router.push(`/course-edit?day=${day}&period=${period}`);
  };

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={t.colors.ink} />
      </View>
    );
  }

  const selectedDate = dateOfVnDay(monday, selectedDay);
  const empty = courses.length === 0;

  /** Hàng ngày — được ghim nhờ stickyHeaderIndices */
  const dayRow = (
    <View style={s.dayHeadWrap}>
      <View style={s.dayHeadRow}>
        <View style={{ width: PERIOD_W }} />
        {WEEKDAYS.map((d) => {
          const date = dateOfVnDay(monday, d.value);
          const isToday = d.value === today;
          const isSel = d.value === selectedDay;
          return (
            <Pressable key={d.value} onPress={() => setSelectedDay(d.value)} style={s.dayHead}>
              <Text style={[s.dayShort, isSel && s.dayShortOn]}>{d.short}</Text>
              <View style={[s.dayNumWrap, isToday && s.dayNumToday]}>
                <Text
                  style={[
                    s.dayNum,
                    isToday && s.dayNumTodayText,
                    isSel && !isToday && s.dayNumOn,
                  ]}
                >
                  {dd(date)}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {WEEKEND.some((d) => weekendSlots[d.value] > 0) && (
        <View style={s.weekendRow}>
          {WEEKEND.filter((d) => weekendSlots[d.value] > 0).map((d) => (
            <Pressable
              key={d.value}
              onPress={() => setSelectedDay(d.value)}
              style={[s.weekendPill, selectedDay === d.value && s.weekendPillOn]}
            >
              <Text
                style={[s.weekendText, selectedDay === d.value && { color: t.colors.inverse }]}
              >
                {d.short} · {weekendSlots[d.value]} buổi
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg }}>
      {/* ===== Thanh trên cố định ===== */}
      <View style={[s.topBar, { paddingTop: insets.top + t.spacing.sm }]}>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Lịch học</Text>
          <Rule style={{ marginBottom: 0, marginTop: 6 }} />
        </View>

        <Segmented
          options={[
            { value: 'period', label: 'Tiết' },
            { value: 'clock', label: 'Giờ' },
          ]}
          value={mode}
          onChange={setDisplay}
          style={s.modeSeg}
        />

        <Pressable
          onPress={() => router.push('/schedule-settings')}
          style={s.gear}
          hitSlop={8}
          accessibilityLabel="Cài đặt khung tiết"
        >
          <Ionicons name="options-outline" size={21} color={t.colors.ink} />
        </Pressable>
      </View>

      <ScrollView
        // Hàng ngày là phần tử đầu tiên nên nó dính lại khi cuộn
        stickyHeaderIndices={[0]}
        contentContainerStyle={{ paddingBottom: t.spacing.xxl }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={t.colors.ink}
          />
        }
      >
        {/*
          Hàng ngày hiện cả khi chưa có môn nào: người mở tab Lịch lần đầu cần
          thấy ngay đây là một tuần học, thay vì một màn hình chỉ có hai nút.
        */}
        {dayRow}

        <View style={{ paddingHorizontal: t.spacing.screen }}>
          {Boolean(error) && (
            <Callout tone="warn" style={{ marginTop: t.spacing.md }}>
              {error}
            </Callout>
          )}

          {/*
            Luôn dựng lưới, kể cả khi chưa có môn nào. Một khung tuần trống nói
            ngay cho người mới rằng đây là chỗ để xếp lịch — màn hình chỉ có hai
            nút thì không nói được điều đó, và họ phải bấm mới biết mình sắp thấy gì.
          */}
          <>
              {/* ===== Lưới ===== */}
              <View style={s.grid}>
                <View style={{ width: PERIOD_W }}>
                  {visiblePeriods.map((p) => (
                    <View key={p.period} style={s.periodCell}>
                      <Text style={s.periodNum}>
                        {mode === 'period' ? p.period : p.start.slice(0, 2)}
                      </Text>
                    </View>
                  ))}
                </View>

                <View style={s.gridBody}>
                  {WEEKDAYS.map((d, di) => (
                    <View key={d.value} style={[s.dayCol, di > 0 && s.dayColLine]}>
                      {visiblePeriods.map((p, pi) => (
                        /**
                         * Mỗi ô trống là một nút thêm môn. Trước đây phải
                         * cuộn xuống cuối trang mới thấy nút — mà lúc nhìn
                         * lưới thì người dùng đã biết chính xác mình muốn
                         * thêm vào thứ mấy tiết mấy rồi.
                         */
                        <Pressable
                          key={p.period}
                          onPress={() => addAt(di, pi)}
                          style={s.slot}
                          accessibilityLabel={`Thêm môn ${d.short} tiết ${p.period}`}
                        />
                      ))}
                    </View>
                  ))}

                  {Object.entries(blocksByDay).flatMap(([dayIdx, list]) =>
                    list.map((b) => {
                      const colPct = 100 / WEEKDAYS.length;
                      const laneW = colPct / (b.lanes || 1);
                      return (
                        <Pressable
                          key={b.key}
                          onPress={() => router.push(`/course-edit?id=${b.courseId}`)}
                          style={[
                            s.block,
                            {
                              left: `${Number(dayIdx) * colPct + b.lane * laneW}%`,
                              width: `${laneW}%`,
                              top: b.row * ROW_H + 2,
                              height: b.span * ROW_H - 5,
                            },
                            // Khối thứ hai trở đi trong cùng nhóm dùng nền
                            // sáng, để hai môn cạnh nhau tách hẳn ra
                            b.lane % 2 === 1 && s.blockAlt,
                          ]}
                        >
                          <Text
                            style={[s.blockName, b.lane % 2 === 1 && { color: t.colors.ink }]}
                            numberOfLines={b.lanes > 1 ? 3 : 2}
                          >
                            {b.name}
                          </Text>
                          {Boolean(b.room) && b.lanes === 1 && (
                            <Text style={s.blockRoom} numberOfLines={1}>
                              {b.room}
                            </Text>
                          )}
                          {b.conflicted && (
                            <View style={s.warnDot}>
                              <Text style={s.warnDotText}>!</Text>
                            </View>
                          )}
                        </Pressable>
                      );
                    })
                  )}
                </View>
              </View>

              <Text style={s.hint}>Chạm ô trống để thêm môn · Chạm môn để sửa</Text>

              {/* ===== Cảnh báo trùng lịch ===== */}
              {conflicts.map((c, i) => (
                <Pressable
                  key={i}
                  onPress={() => router.push(`/course-edit?id=${c.courseIds[1] || c.courseIds[0]}`)}
                  style={{ marginTop: t.spacing.md }}
                >
                  <Callout tone="warn">
                    {c.type === 'commute' ? (
                      <>
                        <Text style={s.conflictStrong}>
                          Khó đi kịp ở {DAY_LABEL[c.dayOfWeek]}
                        </Text>
                        {` — ${c.courses[0].name} tan lúc ${c.endTime} ở ${campusName(c.from)}, ` +
                          `${c.courses[1].name} vào lúc ${c.startTime} ở ${campusName(c.to)}. ` +
                          `Chỉ có ${c.gapMinutes} phút, cần khoảng ${c.needMinutes}. `}
                        <Text style={s.conflictLink}>Xem &amp; sửa</Text>
                      </>
                    ) : (
                      <>
                        <Text style={s.conflictStrong}>Trùng giờ ở {DAY_LABEL[c.dayOfWeek]}</Text>
                        {` — ${c.courses[0].name} và ${c.courses[1].name} chồng nhau `}
                        {c.periods
                          ? c.periods.fromPeriod === c.periods.toPeriod
                            ? `tiết ${c.periods.fromPeriod}. `
                            : `tiết ${c.periods.fromPeriod}–${c.periods.toPeriod}. `
                          : `${c.startTime}–${c.endTime}. `}
                        <Text style={s.conflictLink}>Xem &amp; sửa</Text>
                      </>
                    )}
                  </Callout>
                </Pressable>
              ))}

              {/* ===== Lịch chi tiết ngày đang chọn ===== */}
              <Divider style={{ marginTop: t.spacing.lg }} />

              <View style={s.dayDetailHead}>
                <Text style={s.dayDetailTitle}>{DAY_LABEL[selectedDay]}</Text>
                <Text style={s.dayDetailDate}>{ddmm(selectedDate)}</Text>
                <View style={{ flex: 1 }} />
                {selectedDay !== today && (
                  <Pressable onPress={() => setSelectedDay(today)} style={s.todayBtn} hitSlop={6}>
                    <Text style={s.todayBtnText}>HÔM NAY</Text>
                  </Pressable>
                )}
              </View>

              {daySchedule.length === 0 ? (
                <Text style={s.dayEmpty}>Không có buổi học nào trong ngày này.</Text>
              ) : (
                daySchedule.map((c, i) => (
                  <Pressable
                    key={`${c.courseId}-${i}`}
                    onPress={() => router.push(`/course-edit?id=${c.courseId}`)}
                    style={s.clsRow}
                  >
                    <View style={s.clsBar} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.clsName} numberOfLines={1}>
                        {c.name}
                      </Text>
                      <Text style={s.clsMeta} numberOfLines={1}>
                        {[
                          c.periods
                            ? c.periods.fromPeriod === c.periods.toPeriod
                              ? `Tiết ${c.periods.fromPeriod}`
                              : `Tiết ${c.periods.fromPeriod}–${c.periods.toPeriod}`
                            : null,
                          [c.room, c.building].filter(Boolean).join(' '),
                          c.campus ? campusName(c.campus) : null,
                          c.instructor,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={s.clsStart}>{c.startTime}</Text>
                      <Text style={s.clsEnd}>{c.endTime}</Text>
                    </View>
                  </Pressable>
                ))
              )}

              {empty ? (
                <>
                  <Divider style={{ marginTop: t.spacing.lg }} />
                  <EmptyState
                    title="Chưa có môn nào"
                    line="Nhập nhanh từ cổng trường"
                    onAction={() => router.push('/schedule-import')}
                  />
                  <Button
                    title="Thêm tay từng môn"
                    variant="ghost"
                    onPress={() => router.push('/course-edit')}
                  />
                </>
              ) : (
                <Button
                  title="Nhập từ cổng trường"
                  variant="ghost"
                  onPress={() => router.push('/schedule-import')}
                />
              )}
          </>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = (t) =>
  StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.colors.bg },

  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: t.spacing.sm,
    paddingHorizontal: t.spacing.screen,
    paddingBottom: t.spacing.sm,
    backgroundColor: t.colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.line,
  },
  title: { ...t.type.title, color: t.colors.ink },
  modeSeg: { width: 122, marginTop: 2 },
  gear: { width: 32, height: 40, alignItems: 'center', justifyContent: 'center', marginTop: 2 },

  dayHeadWrap: {
    backgroundColor: t.colors.bg,
    paddingHorizontal: t.spacing.screen,
    paddingTop: t.spacing.md,
    paddingBottom: t.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.line,
  },
  dayHeadRow: { flexDirection: 'row' },
  dayHead: { flex: 1, alignItems: 'center' },
  dayShort: { ...t.type.captionStrong, color: t.colors.inkMuted },
  dayShortOn: { fontFamily: t.fonts.bold, color: t.colors.ink },
  dayNumWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 3,
  },
  dayNumToday: { backgroundColor: t.colors.ink },
  dayNum: { fontFamily: t.fonts.bold, fontSize: 14, color: t.colors.inkBody },
  dayNumTodayText: { color: t.colors.inverse, fontSize: 13 },
  dayNumOn: { color: t.colors.ink },

  weekendRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 6, marginTop: t.spacing.sm },
  weekendPill: {
    borderWidth: 1,
    borderColor: t.colors.lineStrong,
    borderRadius: t.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  weekendPillOn: { backgroundColor: t.colors.ink, borderColor: t.colors.ink },
  weekendText: { fontFamily: t.fonts.semibold, fontSize: 11.5, color: t.colors.inkBody },

  grid: { flexDirection: 'row', marginTop: t.spacing.md },
  gridBody: { flex: 1, position: 'relative', flexDirection: 'row' },
  periodCell: { height: ROW_H, alignItems: 'flex-end', paddingRight: 6, paddingTop: 3 },
  periodNum: { fontFamily: t.fonts.medium, fontSize: 10, color: t.colors.icon },
  dayCol: { flex: 1 },
  dayColLine: { borderLeftWidth: 1, borderLeftColor: t.colors.line },
  slot: { height: ROW_H, borderTopWidth: 1, borderTopColor: t.colors.line },

  block: {
    position: 'absolute',
    backgroundColor: t.colors.ink,
    borderRadius: t.radius.sm,
    paddingHorizontal: 5,
    paddingTop: 4,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: t.colors.bg,
  },
  blockAlt: {
    backgroundColor: t.colors.fill,
    borderColor: t.colors.ink,
    borderWidth: 1.5,
  },
  blockName: { fontFamily: t.fonts.bold, fontSize: 10, color: t.colors.inverse, lineHeight: 12.5 },
  blockRoom: { fontFamily: t.fonts.regular, fontSize: 9, color: t.colors.lineStrong, marginTop: 2 },

  warnDot: {
    position: 'absolute',
    top: 3,
    right: 3,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: t.colors.alert,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warnDotText: { fontFamily: t.fonts.extrabold, fontSize: 8.5, color: t.colors.inverse, marginTop: -1 },

  hint: { ...t.type.caption, color: t.colors.inkMuted, marginTop: t.spacing.md, textAlign: 'center' },

  conflictStrong: { fontFamily: t.fonts.bold, color: t.colors.alertInk },
  conflictLink: { fontFamily: t.fonts.bold, color: t.colors.alertInk, textDecorationLine: 'underline' },

  dayDetailHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.sm,
    marginTop: t.spacing.lg,
    marginBottom: t.spacing.sm,
  },
  dayDetailTitle: { ...t.type.title, fontSize: 19, color: t.colors.ink },
  dayDetailDate: { ...t.type.body, color: t.colors.inkMuted },
  todayBtn: {
    borderWidth: 1,
    borderColor: t.colors.lineStrong,
    borderRadius: t.radius.xs,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  todayBtnText: { fontFamily: t.fonts.bold, fontSize: 10, letterSpacing: 0.8, color: t.colors.inkBody },

  dayEmpty: { ...t.type.caption, color: t.colors.inkMuted, paddingVertical: t.spacing.md },

  clsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.line,
  },
  clsBar: { width: 3, height: 34, borderRadius: 2, backgroundColor: t.colors.ink },
  clsName: { ...t.type.itemTitle, color: t.colors.ink },
  clsMeta: { ...t.type.caption, fontSize: 11.5, color: t.colors.inkMuted, marginTop: 3 },
  clsStart: { fontFamily: t.fonts.bold, fontSize: 14, color: t.colors.ink },
  clsEnd: { fontFamily: t.fonts.regular, fontSize: 12, color: t.colors.inkMuted, marginTop: 2 },
});
