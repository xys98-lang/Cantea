import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
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

/**
 * Lưới luôn dựng đủ bảy ngày, nhưng khung nhìn chỉ rộng năm cột.
 *
 * Cột phải có bề rộng cố định tính bằng điểm ảnh chứ không phải flex: trong một
 * khung cuộn ngang, flex sẽ ép bảy cột vừa khít màn hình và chẳng còn gì để kéo.
 * Chia cho 5 để năm ngày đầu lấp đúng khung, hai ngày cuối tuần dôi ra bên phải.
 */
const VISIBLE_COLS = 5;
const SCREEN_W = Dimensions.get('window').width;
const SIDE_PAD = 16;
const COL_W = Math.floor((SCREEN_W - SIDE_PAD * 2 - PERIOD_W) / VISIBLE_COLS);

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
  /**
   * Thứ Hai của tuần đang xem, do BACKEND quyết định.
   *
   * Trước đây tính tại chỗ nên luôn là tuần hiện tại. Giờ nó là state để mũi
   * tên đổi được, và lấy từ phản hồi API để mobile với backend không bao giờ
   * bất đồng về việc "tuần này bắt đầu từ ngày nào".
   */
  const [weekAnchor, setWeekAnchor] = useState(null);
  const [week, setWeek] = useState(null);
  const [term, setTerm] = useState(null);
  const monday = useMemo(
    () => (week?.monday ? mondayOf(week.monday) : mondayOf(new Date())),
    [week]
  );

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
      const data = await fetchSchedule(weekAnchor);
      setCourses(data.courses || []);
      setWeek(data.week || null);
      setTerm(data.term || null);
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
  }, [weekAnchor]);

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

  /**
   * Mọi buổi THẬT của tuần đang xem, đã bung từ buổi lặp và bỏ ngày nghỉ.
   *
   * Bốn phép tính bên dưới đều đọc từ đây thay vì từ courses. courses chỉ còn
   * dùng để biết lịch có trống hoàn toàn hay không, và để xếp lời nhắc — thứ
   * cần cả học kỳ chứ không phải một tuần.
   */
  const weekItems = useMemo(() => {
    const out = [];
    (week?.days || []).forEach((d) =>
      (d.items || []).forEach((it) => out.push({ ...it, dayOfWeek: d.dayOfWeek, date: d.date }))
    );
    return out;
  }, [week]);

  const weekendSlots = useMemo(() => {
    const map = { 7: 0, 8: 0 };
    weekItems.forEach((m) => {
      if (m.dayOfWeek >= 7) map[m.dayOfWeek] += 1;
    });
    return map;
  }, [weekItems]);

  /**
   * Thứ 7 và Chủ nhật chỉ hiện khi tuần thực sự có buổi rơi vào đó.
   *
   * Màn hình điện thoại chia bảy cột thì mỗi cột hẹp tới mức tên môn bị cắt,
   * mà phần lớn tuần không có gì ở hai cột cuối. Cho chúng xuất hiện theo nhu
   * cầu giữ được lưới rộng rãi cho trường hợp thường gặp, và vẫn có chỗ thật
   * cho buổi học bù khi cần.
   */
  const days = useMemo(() => [...WEEKDAYS, ...WEEKEND], []);

  const visiblePeriods = useMemo(() => {
    if (!periods.length) return [];
    if (!weekItems.length) return periods.slice(0, 9);

    let min = periods.length - 1;
    let max = 0;

    weekItems.forEach((m) => {
      const st = toMinutes(m.startTime);
      const en = toMinutes(m.endTime);
      periods.forEach((p, i) => {
        if (toMinutes(p.start) <= st && st < toMinutes(p.end)) min = Math.min(min, i);
        if (toMinutes(p.start) < en && en <= toMinutes(p.end)) max = Math.max(max, i);
      });
    });

    if (min > max) return periods.slice(0, 9);
    return periods.slice(Math.max(0, min), Math.min(periods.length, max + 1));
  }, [periods, weekItems]);

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
    weekItems.forEach((m) => {
      const dayIdx = days.findIndex((d) => d.value === m.dayOfWeek);
      if (dayIdx === -1) return;

      const from = rowStart(toMinutes(m.startTime));
      const to = Math.max(from, rowEnd(toMinutes(m.endTime)));

      (byDay[dayIdx] ||= []).push({
        key: `${m.courseId}-${m.meetingId}-${m.date}`,
        courseId: m.courseId,
        /* Buổi một lần dùng tên riêng nếu có; buổi lặp dùng mã môn cho gọn cột */
        name: m.repeats === false ? m.name : m.courseName || m.name,
        room: m.room,
        row: from,
        span: to - from + 1,
        conflicted: conflictIds.has(m.courseId),
      });
    });

    Object.keys(byDay).forEach((k) => {
      byDay[k] = assignLanes(byDay[k]);
    });
    return byDay;
  }, [weekItems, days, visiblePeriods, conflictIds]);

  const campusName = useCallback(
    (code) => campuses.find((c) => c.code === code)?.name || code,
    [campuses]
  );

  const daySchedule = useMemo(() => {
    const items = weekItems
      .filter((m) => m.dayOfWeek === selectedDay)
      .map((m) => ({
        courseId: m.courseId,
        name: m.name,
        instructor: m.instructor,
        room: m.room,
        building: m.building,
        campus: m.campus,
        startTime: m.startTime,
        endTime: m.endTime,
        periods: m.periods,
      }));
    return items.sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
  }, [weekItems, selectedDay]);

  /** Chạm vào ô trống trên lưới để thêm môn ngay tại chỗ đó */
  const addAt = (dayIdx, periodIdx) => {
    const day = days[dayIdx].value;
    const period = visiblePeriods[periodIdx]?.period;
    router.push(`/course-edit?day=${day}&period=${period}`);
  };

  /**
   * Hai khung cuộn ngang phải đi cùng nhau, nếu không nhãn T2 sẽ đứng trên cột T4.
   *
   * Cờ `driver` chặn vòng lặp: khung nào đang được ngón tay kéo thì khung kia chỉ
   * nghe theo, không đẩy ngược lại. Thiếu nó thì hai bên liên tục đá nhau và lưới
   * rung khi vuốt nhanh.
   */
  const headRef = useRef(null);
  const gridRef = useRef(null);
  const driver = useRef(null);

  const syncFrom = (who) => (e) => {
    if (driver.current && driver.current !== who) return;
    driver.current = who;
    const x = e.nativeEvent.contentOffset.x;
    const target = who === 'head' ? gridRef : headRef;
    target.current?.scrollTo({ x, animated: false });
  };

  /**
   * Hôm nay là T7 hay CN thì cuộn sẵn tới đó khi mở màn. Người mở app vào cuối
   * tuần quan tâm hôm nay, mà hôm nay lại nằm ngoài khung nhìn mặc định.
   */
  useEffect(() => {
    if (today < 7) return;
    const x = (days.length - VISIBLE_COLS) * COL_W;
    const id = setTimeout(() => {
      headRef.current?.scrollTo({ x, animated: false });
      gridRef.current?.scrollTo({ x, animated: false });
    }, 0);
    return () => clearTimeout(id);
  }, [today, days.length]);

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={t.colors.ink} />
      </View>
    );
  }

  /**
   * Đổi tuần bằng cách đặt lại mốc neo rồi để load() gọi backend.
   *
   * Không tự cộng trừ ngày ở đây: phép tính tuần nằm ở backend, và mobile tính
   * lại một bản riêng là mở đường cho hai bên lệch nhau khi có thêm ngày lễ hay
   * tuần nghỉ sau này.
   */
  const shiftWeek = (dir) => {
    const x = new Date(monday);
    x.setDate(x.getDate() + dir * 7);
    const p2 = (n) => String(n).padStart(2, '0');
    setWeekAnchor(`${x.getFullYear()}-${p2(x.getMonth() + 1)}-${p2(x.getDate())}`);
  };

  const selectedDate = dateOfVnDay(monday, selectedDay);
  const empty = courses.length === 0;

  /** Hàng ngày — được ghim nhờ stickyHeaderIndices */
  const dayRow = (
    <View style={s.dayHeadWrap}>
      <View style={s.weekNav}>
        <Pressable
          onPress={() => shiftWeek(-1)}
          disabled={week ? !week.canGoPrev : false}
          hitSlop={8}
          style={week && !week.canGoPrev && s.navOff}
        >
          <Ionicons name="chevron-back" size={19} color={t.colors.ink} />
        </Pressable>

        <Pressable onPress={() => setWeekAnchor(null)} style={{ flex: 1 }}>
          {/*
            Đặt mốc học kỳ rồi thì hiện số tuần; chưa đặt thì rơi về khoảng ngày,
            vì "Tuần 3" tính từ một mốc tạm sẽ là con số không có thật.
          */}
          <Text style={s.weekLabel} numberOfLines={1}>
            {week?.index
              ? `Tuần ${week.index}`
              : `${monday.getDate()}/${monday.getMonth() + 1} – ${dateOfVnDay(monday, 8).getDate()}/${dateOfVnDay(monday, 8).getMonth() + 1}`}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => shiftWeek(1)}
          disabled={week ? !week.canGoNext : false}
          hitSlop={8}
          style={week && !week.canGoNext && s.navOff}
        >
          <Ionicons name="chevron-forward" size={19} color={t.colors.ink} />
        </Pressable>
      </View>

      {/*
        Nhắc đặt mốc học kỳ, không chặn gì. Chưa đặt thì lịch vẫn dùng được với
        khoảng tạm tính ba tháng — nhưng mũi tên sẽ dừng ở một mốc mà người dùng
        không hiểu vì sao, nên phải nói ra.
      */}
      {term && !term.isSet && (
        <Pressable onPress={() => router.push('/schedule-settings')} style={s.termHint}>
          <Text style={s.termHintText}>
            Chưa đặt mốc học kỳ — đang tạm tính 3 tháng. Đặt ngay →
          </Text>
        </Pressable>
      )}

      <View style={s.dayHeadRow}>
        <View style={{ width: PERIOD_W }} />
        <ScrollView
          ref={headRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={syncFrom('head')}
          onScrollBeginDrag={() => (driver.current = 'head')}
          onMomentumScrollEnd={() => (driver.current = null)}
          onScrollEndDrag={() => (driver.current = null)}
        >
        {days.map((d) => {
          const date = dateOfVnDay(monday, d.value);
          const isToday = d.value === today;
          const isSel = d.value === selectedDay;
          return (
            <Pressable
              key={d.value}
              onPress={() => setSelectedDay(d.value)}
              style={[s.dayHead, { width: COL_W }]}
            >
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
        </ScrollView>
      </View>
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

                <ScrollView
                  ref={gridRef}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  scrollEventThrottle={16}
                  onScroll={syncFrom('grid')}
                  onScrollBeginDrag={() => (driver.current = 'grid')}
                  onMomentumScrollEnd={() => (driver.current = null)}
                  onScrollEndDrag={() => (driver.current = null)}
                >
                <View style={[s.gridBody, { width: days.length * COL_W }]}>
                  {days.map((d, di) => (
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
                      /**
                        * Định vị bằng điểm ảnh chứ không phải phần trăm: phần trăm
                        * tính theo bề rộng khung cha, mà khung cha giờ rộng hơn màn
                        * hình. Dùng phần trăm thì khối môn trôi lệch khỏi cột.
                        */
                      const laneW = COL_W / (b.lanes || 1);
                      return (
                        <Pressable
                          key={b.key}
                          onPress={() => router.push(`/course-edit?id=${b.courseId}`)}
                          style={[
                            s.block,
                            {
                              left: Number(dayIdx) * COL_W + b.lane * laneW,
                              width: laneW,
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
                </ScrollView>
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
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.md,
    paddingBottom: t.spacing.sm,
  },
  navOff: { opacity: 0.25 },
  weekLabel: { ...t.type.label, color: t.colors.ink, textAlign: 'center' },
  termHint: {
    backgroundColor: t.colors.fill,
    borderRadius: t.radius.md,
    paddingHorizontal: t.spacing.md,
    paddingVertical: 7,
    marginBottom: t.spacing.sm,
  },
  termHintText: { ...t.type.caption, fontSize: 11.5, color: t.colors.inkBody },

  dayHeadRow: { flexDirection: 'row' },
  dayHead: { alignItems: 'center' },
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
  gridBody: { position: 'relative', flexDirection: 'row' },
  periodCell: { height: ROW_H, alignItems: 'flex-end', paddingRight: 6, paddingTop: 3 },
  periodNum: { fontFamily: t.fonts.medium, fontSize: 10, color: t.colors.icon },
  dayCol: { width: COL_W },
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
