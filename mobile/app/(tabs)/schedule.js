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
import { Button, Notice, Rule } from '../../src/components/ui';
import { fetchSchedule, setTimeDisplay, DAYS, toMinutes } from '../../src/api/schedule';
import { colors, radius, spacing, type } from '../../src/theme';

const ROW_H = 52;
const COL_W = 78;
const PERIOD_W = 42;

export default function ScheduleScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [courses, setCourses] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [mode, setMode] = useState('period');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await fetchSchedule();
      setCourses(data.courses || []);
      setPeriods(data.periods || []);
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

  const toggleMode = async () => {
    const next = mode === 'period' ? 'clock' : 'period';
    setMode(next);
    try {
      await setTimeDisplay(next);
    } catch {
      // Hiển thị vẫn đổi trong phiên này dù lưu thất bại
    }
  };

  const visibleDays = useMemo(() => {
    const hasSunday = courses.some((c) => c.meetings?.some((m) => m.dayOfWeek === 8));
    return hasSunday ? DAYS : DAYS.filter((d) => d.value !== 8);
  }, [courses]);

  const visiblePeriods = useMemo(() => {
    if (!periods.length) return [];
    if (!courses.length) return periods.slice(0, 10);

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

    if (min > max) return periods.slice(0, 10);
    return periods.slice(Math.max(0, min - 1), Math.min(periods.length, max + 2));
  }, [periods, courses]);

  const blocks = useMemo(() => {
    const out = [];
    if (!visiblePeriods.length) return out;

    const rowStart = (mins) => {
      let idx = visiblePeriods.findIndex(
        (p) => toMinutes(p.start) <= mins && mins < toMinutes(p.end)
      );
      if (idx === -1) {
        idx = visiblePeriods.findIndex((p) => toMinutes(p.start) > mins);
        if (idx === -1) idx = visiblePeriods.length - 1;
      }
      return idx;
    };

    const rowEnd = (mins) => {
      let idx = visiblePeriods.findIndex(
        (p) => toMinutes(p.start) < mins && mins <= toMinutes(p.end)
      );
      if (idx === -1) {
        for (let i = visiblePeriods.length - 1; i >= 0; i -= 1) {
          if (toMinutes(visiblePeriods[i].end) < mins) return i;
        }
        idx = 0;
      }
      return idx;
    };

    courses.forEach((course) => {
      (course.meetings || []).forEach((m) => {
        const dayIdx = visibleDays.findIndex((d) => d.value === m.dayOfWeek);
        if (dayIdx === -1) return;

        const from = rowStart(toMinutes(m.startTime));
        const to = Math.max(from, rowEnd(toMinutes(m.endTime)));

        out.push({
          key: `${course.id || course._id}-${m._id || `${m.dayOfWeek}${m.startTime}`}`,
          courseId: course.id || course._id,
          name: course.courseName,
          room: m.room,
          color: course.color || colors.brand,
          dayIdx,
          top: from * ROW_H,
          height: (to - from + 1) * ROW_H - 3,
        });
      });
    });

    return out;
  }, [courses, visiblePeriods, visibleDays]);

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={[
          s.scroll,
          { paddingTop: insets.top + spacing.md, paddingBottom: spacing.xxl },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={colors.brand}
          />
        }
      >
        <View style={s.head}>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>Thời khoá biểu</Text>
            <Rule style={{ marginBottom: 0 }} />
          </View>
          <Pressable onPress={toggleMode} style={s.modeBtn} accessibilityRole="button">
            <Text style={s.modeText}>{mode === 'period' ? 'Tiết' : 'Giờ'}</Text>
          </Pressable>
        </View>

        <Notice>{error}</Notice>

        {courses.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyTitle}>Chưa có môn nào</Text>
            <Text style={s.emptyLine}>
              Thêm các môn trong học kỳ này để xem lịch học cả tuần trong một màn hình.
            </Text>
            <View style={{ marginTop: spacing.lg }}>
              <Button title="Thêm môn đầu tiên" onPress={() => router.push('/course-edit')} />
            </View>
          </View>
        ) : (
          <>
            <View style={s.grid}>
              <View style={{ width: PERIOD_W }}>
                <View style={s.corner} />
                {visiblePeriods.map((p) => (
                  <View key={p.period} style={s.periodCell}>
                    <Text style={s.periodNum}>{mode === 'period' ? p.period : p.start}</Text>
                  </View>
                ))}
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View>
                  <View style={{ flexDirection: 'row' }}>
                    {visibleDays.map((d) => (
                      <View key={d.value} style={s.dayHead}>
                        <Text style={s.dayHeadText}>{d.short}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={{ flexDirection: 'row', position: 'relative' }}>
                    {visibleDays.map((d) => (
                      <View key={d.value} style={s.dayCol}>
                        {visiblePeriods.map((p) => (
                          <View key={p.period} style={s.slot} />
                        ))}
                      </View>
                    ))}

                    {blocks.map((b) => (
                      <Pressable
                        key={b.key}
                        onPress={() => router.push(`/course-edit?id=${b.courseId}`)}
                        style={[
                          s.block,
                          {
                            left: b.dayIdx * COL_W + 3,
                            top: b.top + 2,
                            height: b.height,
                            backgroundColor: b.color,
                          },
                        ]}
                      >
                        <Text style={s.blockName} numberOfLines={3}>
                          {b.name}
                        </Text>
                        {Boolean(b.room) && (
                          <Text style={s.blockRoom} numberOfLines={1}>
                            {b.room}
                          </Text>
                        )}
                      </Pressable>
                    ))}
                  </View>
                </View>
              </ScrollView>
            </View>

            <Text style={s.hint}>Chạm vào một môn để sửa. Kéo ngang để xem hết các ngày.</Text>
          </>
        )}
      </ScrollView>

      {courses.length > 0 && (
        <Pressable
          onPress={() => router.push('/course-edit')}
          style={s.fab}
          accessibilityRole="button"
          accessibilityLabel="Thêm môn học"
        >
          <Text style={s.fabPlus}>+</Text>
        </Pressable>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  scroll: { paddingHorizontal: spacing.md },
  head: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.lg },
  title: { ...type.title, color: colors.ink },
  modeBtn: {
    backgroundColor: colors.brandSoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    marginTop: spacing.xs,
  },
  modeText: { ...type.label, color: colors.brandDeep },

  grid: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    paddingBottom: spacing.xs,
  },
  corner: { height: 34, borderBottomWidth: 1, borderBottomColor: colors.border },
  periodCell: {
    height: ROW_H,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  periodNum: { ...type.micro, color: colors.inkFaint },
  dayHead: {
    width: COL_W,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dayHeadText: { ...type.label, color: colors.inkMuted },
  dayCol: { width: COL_W },
  slot: { height: ROW_H, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },

  block: {
    position: 'absolute',
    width: COL_W - 6,
    borderRadius: radius.sm,
    padding: 6,
    overflow: 'hidden',
  },
  blockName: { fontSize: 11, fontWeight: '700', color: colors.white, lineHeight: 14 },
  blockRoom: { fontSize: 10, color: 'rgba(255,255,255,0.85)', marginTop: 2 },

  hint: { ...type.caption, color: colors.inkFaint, marginTop: spacing.md, textAlign: 'center' },

  empty: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginTop: spacing.md,
  },
  emptyTitle: { ...type.heading, color: colors.ink, marginBottom: spacing.sm },
  emptyLine: { ...type.body, color: colors.inkMuted },

  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.brandDeep,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabPlus: { fontSize: 30, color: colors.white, marginTop: -3, fontWeight: '300' },
});
