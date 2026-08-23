import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'cantea.reminders';

/**
 * NHẮC LỊCH HỌC
 *
 * Toàn bộ chạy trên máy người dùng — không cần máy chủ đẩy thông báo,
 * không cần tài khoản Firebase, không tốn gì. Lịch học lặp lại mỗi tuần
 * nên hệ điều hành tự lo phần hẹn giờ.
 *
 * Đánh đổi: máy chủ không biết ai đã nhận thông báo, và tắt app hoàn toàn
 * vẫn nhận được. Với việc nhắc giờ học thì đó là đánh đổi đúng.
 */

export const DEFAULT_SETTINGS = {
  /** Nhắc trước mỗi buổi học */
  perClass: true,
  minutesBefore: 30,

  /**
   * Tóm tắt buổi sáng: một thông báo liệt kê cả ngày.
   *
   * Bật sẵn vì nó ít làm phiền hơn — ba buổi học thành một thông báo
   * thay vì ba. Người muốn nhắc sát giờ thì bật thêm mục trên.
   */
  morning: true,
  morningHour: 6,
  morningMinute: 30,
};

/** Thứ trong hệ Việt (2=T2 … 8=CN) sang hệ của expo (1=CN, 2=T2 … 7=T7) */
const toExpoWeekday = (vnDay) => (vnDay >= 2 && vnDay <= 7 ? vnDay : 1);

const DAY_NAME = {
  2: 'Thứ hai',
  3: 'Thứ ba',
  4: 'Thứ tư',
  5: 'Thứ năm',
  6: 'Thứ sáu',
  7: 'Thứ bảy',
  8: 'Chủ nhật',
};

const toMinutes = (hhmm) => {
  const [h, m] = String(hhmm || '0:0').split(':').map(Number);
  return h * 60 + m;
};

export const loadSettings = async () => {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
};

export const saveSettings = async (settings) => {
  await AsyncStorage.setItem(KEY, JSON.stringify(settings)).catch(() => {});
};

/**
 * Xin quyền gửi thông báo.
 *
 * Chỉ gọi khi người dùng CHỦ ĐỘNG bật nhắc lịch, không gọi lúc mở app
 * lần đầu. Hộp thoại xin quyền hiện ra mà chưa hiểu để làm gì thì phần
 * lớn người ta bấm Không — và iOS không cho hỏi lại lần hai.
 */
export const requestPermission = async () => {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;

  const asked = await Notifications.requestPermissionsAsync();
  return Boolean(asked.granted);
};

export const hasPermission = async () =>
  Notifications.getPermissionsAsync().then((p) => Boolean(p.granted));

/** Android bắt buộc có kênh, không có thì thông báo im lặng biến mất */
export const setupAndroidChannel = async () => {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('schedule', {
    name: 'Nhắc lịch học',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 200, 100, 200],
    sound: 'default',
  });
};

/** Chỗ học, gộp từ phòng, toà nhà và cơ sở */
const placeOf = (m, campusName) => {
  const room = [m.building, m.room].filter(Boolean).join('-');
  return [room, campusName?.(m.campus)].filter(Boolean).join(' · ');
};

/**
 * Xếp lại toàn bộ lịch nhắc.
 *
 * XOÁ SẠCH RỒI ĐẶT LẠI, không cố cập nhật từng cái.
 *
 * Sửa từng thông báo nghe hiệu quả hơn, nhưng phải theo dõi cái nào ứng
 * với buổi nào, và chỉ cần lệch một lần là sinh viên nhận nhắc cho môn
 * đã bỏ — hoặc tệ hơn, không nhận nhắc cho môn vừa thêm. Xoá sạch thì
 * không bao giờ lệch.
 *
 * @param courses    danh sách môn từ fetchSchedule
 * @param campusName hàm tra tên cơ sở từ mã
 */
export const rescheduleAll = async (courses, settings, campusName) => {
  await Notifications.cancelAllScheduledNotificationsAsync();

  if (!settings.perClass && !settings.morning) return { count: 0 };
  if (!(await hasPermission())) return { count: 0, noPermission: true };

  await setupAndroidChannel();

  /** Gom buổi học theo thứ, để dựng tóm tắt buổi sáng */
  const byDay = {};
  courses.forEach((c) =>
    (c.meetings || []).forEach((m) => {
      (byDay[m.dayOfWeek] ||= []).push({ course: c, meeting: m });
    })
  );

  let count = 0;

  // ═══ Nhắc trước từng buổi ═══
  if (settings.perClass) {
    for (const [day, items] of Object.entries(byDay)) {
      for (const { course, meeting } of items) {
        const start = toMinutes(meeting.startTime) - settings.minutesBefore;

        /**
         * Buổi học sớm quá thì lùi nhắc sang trước nửa đêm là vô lý —
         * bỏ qua. Tiết 1 lúc 6:20 với nhắc trước 30 phút vẫn ổn (5:50).
         */
        if (start < 0) continue;

        await Notifications.scheduleNotificationAsync({
          content: {
            title: course.courseName,
            body: `Vào lúc ${meeting.startTime}${
              placeOf(meeting, campusName) ? ` · ${placeOf(meeting, campusName)}` : ''
            }`,
            sound: 'default',
            data: { courseId: String(course.id || course._id) },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
            weekday: toExpoWeekday(Number(day)),
            hour: Math.floor(start / 60),
            minute: start % 60,
            channelId: 'schedule',
          },
        });
        count += 1;
      }
    }
  }

  // ═══ Tóm tắt buổi sáng ═══
  if (settings.morning) {
    for (const [day, items] of Object.entries(byDay)) {
      const sorted = items.sort(
        (a, b) => toMinutes(a.meeting.startTime) - toMinutes(b.meeting.startTime)
      );
      const first = sorted[0];

      /**
       * Chỉ gửi khi giờ tóm tắt thực sự sớm hơn buổi đầu tiên. Lớp học
       * lúc 6:20 mà tóm tắt lúc 6:30 thì thông báo tới lúc đã muộn.
       */
      const summaryAt = settings.morningHour * 60 + settings.morningMinute;
      if (summaryAt >= toMinutes(first.meeting.startTime)) continue;

      const lines = sorted.map((x) => {
        const place = placeOf(x.meeting, campusName);
        return `${x.meeting.startTime} ${x.course.courseName}${place ? ` · ${place}` : ''}`;
      });

      await Notifications.scheduleNotificationAsync({
        content: {
          title: `${DAY_NAME[day]} · ${sorted.length} buổi học`,
          body: lines.join('\n'),
          sound: 'default',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: toExpoWeekday(Number(day)),
          hour: settings.morningHour,
          minute: settings.morningMinute,
          channelId: 'schedule',
        },
      });
      count += 1;
    }
  }

  return { count };
};

export const cancelAll = () => Notifications.cancelAllScheduledNotificationsAsync();

/** Số thông báo đang chờ — để màn cài đặt hiện cho người dùng thấy */
export const pendingCount = async () =>
  Notifications.getAllScheduledNotificationsAsync()
    .then((list) => list.length)
    .catch(() => 0);

/**
 * Cách hiện thông báo khi app đang mở.
 *
 * Mặc định của expo là KHÔNG hiện gì — người dùng đang dùng app thì coi
 * như đã biết. Nhưng nhắc giờ học thì khác: họ có thể đang mải đọc bảng
 * tin và cần bị ngắt lời.
 */
export const configureForeground = () => {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
};
