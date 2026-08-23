import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button, Callout, Divider } from '../src/components/ui';
import { useTheme, useThemedStyles } from '../src/store/theme';
import { fetchSchedule } from '../src/api/schedule';
import {
  loadSettings,
  saveSettings,
  requestPermission,
  hasPermission,
  rescheduleAll,
  cancelAll,
  pendingCount,
  DEFAULT_SETTINGS,
} from '../src/services/notifications';

const LEAD_TIMES = [15, 30, 45, 60];
const MORNING_TIMES = [
  { h: 6, m: 0 },
  { h: 6, m: 30 },
  { h: 7, m: 0 },
];

export default function NotificationSettings() {
  const router = useRouter();
  const t = useTheme();
  const s = useThemedStyles(styles);
  const insets = useSafeAreaInsets();

  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [granted, setGranted] = useState(true);
  const [pending, setPending] = useState(0);
  const [courses, setCourses] = useState([]);
  const [campuses, setCampuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [cfg, ok, n] = await Promise.all([loadSettings(), hasPermission(), pendingCount()]);
    setSettings(cfg);
    setGranted(ok);
    setPending(n);
    try {
      const data = await fetchSchedule();
      setCourses(data.courses || []);
      setCampuses(data.campuses || []);
    } catch {
      setCourses([]);
    }
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const campusName = useCallback(
    (code) => campuses.find((c) => c.code === code)?.name || '',
    [campuses]
  );

  /** Mọi thay đổi đều xếp lại lịch ngay — không có nút Lưu riêng */
  const apply = async (next) => {
    setSettings(next);
    setSaving(true);
    try {
      await saveSettings(next);

      if (!next.perClass && !next.morning) {
        await cancelAll();
        setPending(0);
        return;
      }

      if (!(await hasPermission())) {
        const ok = await requestPermission();
        setGranted(ok);
        if (!ok) return;
      }

      const r = await rescheduleAll(courses, next, campusName);
      setPending(r.count);
    } finally {
      setSaving(false);
    }
  };

  const totalMeetings = courses.reduce((n, c) => n + (c.meetings?.length || 0), 0);

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={t.colors.ink} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: t.spacing.screen,
          paddingTop: insets.top + t.spacing.sm,
          paddingBottom: insets.bottom + t.spacing.xxl,
        }}
      >
        <Pressable onPress={() => router.back()} style={s.back} hitSlop={10}>
          <Text style={s.backText}>← Quay lại</Text>
        </Pressable>

        <Text style={s.title}>Nhắc lịch học</Text>
        <View style={s.rule}>
          <View style={s.ruleMain} />
          <View style={s.ruleTail} />
        </View>

        {!granted && (
          <Callout tone="warn">
            Cantea chưa được cấp quyền gửi thông báo. Mở Cài đặt máy để bật — không có
            quyền thì mọi tuỳ chọn dưới đây đều không chạy.
          </Callout>
        )}
        {!granted && (
          <Button title="Mở Cài đặt" variant="ghost" onPress={() => Linking.openSettings()} />
        )}

        {courses.length === 0 && (
          <Callout style={{ marginTop: t.spacing.md }}>
            Chưa có môn nào trong thời khoá biểu nên chưa có gì để nhắc. Thêm môn trước, rồi
            quay lại đây.
          </Callout>
        )}

        {/* ═══ Tóm tắt buổi sáng ═══ */}
        <View style={s.block}>
          <View style={s.blockHead}>
            <View style={{ flex: 1 }}>
              <Text style={s.blockTitle}>Tóm tắt buổi sáng</Text>
              <Text style={s.blockLine}>
                Một thông báo liệt kê cả ngày, gửi trước buổi học đầu tiên
              </Text>
            </View>
            <Switch
              value={settings.morning}
              onValueChange={(v) => apply({ ...settings, morning: v })}
              trackColor={{ true: t.colors.accent, false: t.colors.line }}
              thumbColor={t.colors.surface}
            />
          </View>

          {settings.morning && (
            <View style={s.chipRow}>
              {MORNING_TIMES.map(({ h, m }) => {
                const on = settings.morningHour === h && settings.morningMinute === m;
                return (
                  <Pressable
                    key={`${h}:${m}`}
                    onPress={() => apply({ ...settings, morningHour: h, morningMinute: m })}
                    style={[s.chip, on && s.chipOn]}
                  >
                    <Text style={[s.chipText, on && s.chipTextOn]}>
                      {String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        <Divider style={{ marginVertical: t.spacing.lg }} />

        {/* ═══ Nhắc từng buổi ═══ */}
        <View style={s.block}>
          <View style={s.blockHead}>
            <View style={{ flex: 1 }}>
              <Text style={s.blockTitle}>Nhắc trước mỗi buổi</Text>
              <Text style={s.blockLine}>
                Một thông báo riêng cho từng buổi học, sát giờ vào lớp
              </Text>
            </View>
            <Switch
              value={settings.perClass}
              onValueChange={(v) => apply({ ...settings, perClass: v })}
              trackColor={{ true: t.colors.accent, false: t.colors.line }}
              thumbColor={t.colors.surface}
            />
          </View>

          {settings.perClass && (
            <>
              <Text style={s.chipLabel}>Nhắc trước</Text>
              <View style={s.chipRow}>
                {LEAD_TIMES.map((n) => {
                  const on = settings.minutesBefore === n;
                  return (
                    <Pressable
                      key={n}
                      onPress={() => apply({ ...settings, minutesBefore: n })}
                      style={[s.chip, on && s.chipOn]}
                    >
                      <Text style={[s.chipText, on && s.chipTextOn]}>{n} phút</Text>
                    </Pressable>
                  );
                })}
              </View>

              {/*
                Nhắc trước 15 phút là không đủ nếu phải đổi cơ sở. Nói ra
                thay vì để sinh viên tự phát hiện lúc đã muộn.
              */}
              {settings.minutesBefore <= 15 && campuses.length > 1 && (
                <Callout tone="warn" style={{ marginTop: t.spacing.md }}>
                  Trường bạn có nhiều cơ sở. 15 phút thường không đủ để di chuyển giữa hai
                  khu — cân nhắc 45 phút trở lên.
                </Callout>
              )}
            </>
          )}
        </View>

        <Divider style={{ marginVertical: t.spacing.lg }} />

        <View style={s.summary}>
          {saving ? (
            <ActivityIndicator size="small" color={t.colors.inkMuted} />
          ) : (
            <Ionicons
              name={pending > 0 ? 'notifications' : 'notifications-off-outline'}
              size={15}
              color={t.colors.inkMuted}
            />
          )}
          <Text style={s.summaryText}>
            {pending > 0
              ? `${pending} lời nhắc đang chờ · ${totalMeetings} buổi học mỗi tuần`
              : 'Chưa có lời nhắc nào'}
          </Text>
        </View>

        <Callout style={{ marginTop: t.spacing.md }}>
          Lời nhắc được hẹn sẵn trên máy bạn, lặp lại hằng tuần. Chúng chạy cả khi app đã
          đóng, và không cần mạng. Đổi thời khoá biểu thì mở lại màn này để xếp lại lịch.
        </Callout>
      </ScrollView>
    </View>
  );
}

const styles = (t) =>
  StyleSheet.create({
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.colors.bg },
    back: { paddingVertical: 4, marginBottom: t.spacing.sm, alignSelf: 'flex-start' },
    backText: { ...t.type.label, color: t.colors.ink },
    title: { ...t.type.title, color: t.colors.ink },
    rule: { flexDirection: 'row', alignItems: 'center', marginTop: 7, marginBottom: t.spacing.lg },
    ruleMain: { width: 36, height: 3, borderRadius: 2, backgroundColor: t.colors.ink },
    ruleTail: {
      width: 11,
      height: 3,
      borderRadius: 2,
      backgroundColor: t.colors.lineStrong,
      marginLeft: 4,
    },

    block: { marginTop: t.spacing.sm },
    blockHead: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.md },
    blockTitle: { ...t.type.heading, fontSize: 16, color: t.colors.ink },
    blockLine: { ...t.type.caption, color: t.colors.inkMuted, marginTop: 3 },

    chipLabel: { ...t.type.eyebrow, color: t.colors.inkMuted, marginTop: t.spacing.md },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: t.spacing.sm },
    chip: {
      paddingHorizontal: 13,
      paddingVertical: 8,
      borderRadius: t.radius.pill,
      borderWidth: 1,
      borderColor: t.colors.lineStrong,
    },
    chipOn: { backgroundColor: t.colors.accent, borderColor: t.colors.accent },
    chipText: { fontFamily: t.fonts.semibold, fontSize: 12.5, color: t.colors.inkMuted },
    chipTextOn: { color: t.colors.onAccent },

    summary: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    summaryText: { ...t.type.caption, color: t.colors.inkMuted, flex: 1 },
  });
