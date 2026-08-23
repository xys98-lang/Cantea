import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
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
import { Button, Callout, Divider, Rule } from '../src/components/ui';
import client from '../src/api/client';
import { useTheme, useThemedStyles } from '../src/store/theme';

const DAY_LABEL = {
  2: 'Thứ 2',
  3: 'Thứ 3',
  4: 'Thứ 4',
  5: 'Thứ 5',
  6: 'Thứ 6',
  7: 'Thứ 7',
  8: 'Chủ nhật',
};

export default function ScheduleImport() {
  const t = useTheme();
  const s = useThemedStyles(styles);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [support, setSupport] = useState(null);
  const [text, setText] = useState('');
  const [preview, setPreview] = useState(null);
  const [picked, setPicked] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useFocusEffect(
    useCallback(() => {
      client
        .get('/schedule/import/support')
        .then((r) => setSupport(r.data.data))
        .catch(() => setSupport({ supported: false }));
    }, [])
  );

  const doPreview = async () => {
    setError('');
    if (!text.trim()) {
      setError('Dán nội dung từ trang tra cứu của trường vào ô bên trên');
      return;
    }

    setLoading(true);
    try {
      const { data } = await client.post('/schedule/import/preview', { text });
      setPreview(data.data);
      // Mặc định chọn hết — sinh viên bỏ chọn cái không cần
      const next = {};
      (data.data.courses || []).forEach((_, i) => {
        next[i] = true;
      });
      setPicked(next);
    } catch (e) {
      setError(e.message || 'Không đọc được nội dung');
    } finally {
      setLoading(false);
    }
  };

  const commit = async () => {
    const chosen = (preview?.courses || []).filter((_, i) => picked[i]);
    if (!chosen.length) {
      setError('Chọn ít nhất một môn');
      return;
    }

    setSaving(true);
    try {
      const { data } = await client.post('/schedule/import', { courses: chosen });
      const d = data.data;

      Alert.alert(
        'Đã nhập xong',
        [
          data.message,
          d.errors?.length ? `\nKhông thêm được:\n${d.errors.join('\n')}` : '',
        ]
          .filter(Boolean)
          .join(''),
        [{ text: 'Xem thời khoá biểu', onPress: () => router.replace('/schedule') }]
      );
    } catch (e) {
      setError(e.message || 'Không lưu được');
    } finally {
      setSaving(false);
    }
  };

  if (support === null) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={t.colors.ink} />
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
          { paddingTop: insets.top + t.spacing.sm, paddingBottom: insets.bottom + t.spacing.xl },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable onPress={() => router.back()} style={s.back} hitSlop={8}>
          <Text style={s.backText}>← Quay lại</Text>
        </Pressable>

        <Text style={s.title}>Nhập từ cổng trường</Text>
        <Rule style={{ marginBottom: t.spacing.sm }} />

        {!support.supported ? (
          <>
            <Callout>
              Cantea chưa hỗ trợ nhập nhanh cho trường của bạn. Hiện mới làm được cho UEH —
              mỗi trường trình bày lịch một kiểu nên phải viết riêng từng bộ đọc.
            </Callout>
            <Button
              title="Nhập tay từng môn"
              onPress={() => router.replace('/course-edit')}
            />
          </>
        ) : (
          <>
            <Text style={s.sub}>
              Copy bảng thời khoá biểu từ trang tra cứu của {support.shortName}, dán vào đây.
              Cantea tự tách ra thành các môn.
            </Text>

            {/* Hướng dẫn ba bước, đặt trước ô dán */}
            <View style={s.steps}>
              {[
                'Mở trang tra cứu, tìm theo tên môn hoặc mã lớp học phần',
                'Bôi đen cả bảng kết quả, gồm cả cột "Lịch học"',
                'Quay lại đây và dán vào ô bên dưới',
              ].map((line, i) => (
                <View key={i} style={s.step}>
                  <View style={s.stepNum}>
                    <Text style={s.stepNumText}>{i + 1}</Text>
                  </View>
                  <Text style={s.stepText}>{line}</Text>
                </View>
              ))}
            </View>

            <Pressable
              onPress={() => Linking.openURL(support.source)}
              style={s.linkBtn}
            >
              <Ionicons name="open-outline" size={15} color={t.colors.ink} />
              <Text style={s.linkText}>Mở trang tra cứu {support.shortName}</Text>
            </Pressable>

            {Boolean(error) && (
              <Callout tone="warn" style={{ marginTop: t.spacing.md }}>
                {error}
              </Callout>
            )}

            <Text style={s.fieldLabel}>Nội dung đã copy</Text>
            <TextInput
              style={s.textarea}
              value={text}
              onChangeText={setText}
              placeholder={
                '26D1TEC55006501  A.I. trong kinh doanh  25/03/2026 ...\n' +
                'Thứ Tư, 07g10 - 11g30, B1-409, 25/03/2026->20/05/2026 ...'
              }
              placeholderTextColor={t.colors.icon}
              multiline
              textAlignVertical="top"
            />

            <Button
              title={preview ? 'Đọc lại' : 'Đọc nội dung'}
              onPress={doPreview}
              loading={loading}
              variant={preview ? 'ghost' : 'solid'}
            />

            {/* ===== Xem trước ===== */}
            {Boolean(preview) && (
              <>
                <Divider style={{ marginVertical: t.spacing.lg }} />

                {preview.warnings?.length > 0 && (
                  <Callout tone="warn" style={{ marginBottom: t.spacing.md }}>
                    {preview.warnings.join(' ')}
                  </Callout>
                )}

                {preview.clashes?.length > 0 && (
                  <Callout tone="warn" style={{ marginBottom: t.spacing.md }}>
                    Có {preview.clashes.length} chỗ trùng giờ:{' '}
                    {preview.clashes
                      .map((c) => `${DAY_LABEL[c.dayOfWeek]} — ${c.names.join(' và ')}`)
                      .join('; ')}
                    . Vẫn thêm được, nhưng nên kiểm tra lại.
                  </Callout>
                )}

                <Text style={s.previewLabel}>
                  ĐỌC ĐƯỢC {preview.courses.length} MÔN — BỎ CHỌN MÔN KHÔNG CẦN
                </Text>

                {preview.courses.map((c, i) => (
                  <Pressable
                    key={i}
                    onPress={() => setPicked((p) => ({ ...p, [i]: !p[i] }))}
                    style={[s.card, !picked[i] && s.cardOff]}
                  >
                    <View style={s.cardHead}>
                      <View style={[s.check, picked[i] && s.checkOn]}>
                        {picked[i] && (
                          <Ionicons name="checkmark" size={13} color={t.colors.inverse} />
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.cardTitle} numberOfLines={2}>
                          {c.courseName}
                        </Text>
                        <Text style={s.cardCode}>
                          {[c.courseCode, c.campus].filter(Boolean).join(' · ')}
                        </Text>
                      </View>
                    </View>

                    {c.meetings.map((m, j) => (
                      <View key={j} style={s.meeting}>
                        <Text style={s.meetingDay}>{DAY_LABEL[m.dayOfWeek]}</Text>
                        <Text style={s.meetingTime}>
                          {m.periods
                            ? `Tiết ${m.periods.fromPeriod}–${m.periods.toPeriod}`
                            : `${m.startTime}–${m.endTime}`}
                        </Text>
                        <Text style={s.meetingRoom}>
                          {[m.building, m.room].filter(Boolean).join('-') || m.note || '—'}
                        </Text>
                      </View>
                    ))}

                    {/*
                      Buổi lẻ — đổi phòng, học online một hôm. Mô hình dữ liệu
                      hiện tại chưa lưu được theo ngày, nên hiện ra để sinh viên
                      tự ghi nhớ thay vì âm thầm bỏ qua.
                    */}
                    {c.exceptions?.length > 0 && (
                      <View style={s.exceptions}>
                        <Text style={s.exTitle}>
                          {c.exceptions.length} buổi lẻ không đưa vào lưới
                        </Text>
                        {c.exceptions.map((e, k) => (
                          <Text key={k} style={s.exLine}>
                            {e.date} · {e.time} · {e.where}
                          </Text>
                        ))}
                      </View>
                    )}
                  </Pressable>
                ))}

                <Button
                  title={`Thêm ${Object.values(picked).filter(Boolean).length} môn vào thời khoá biểu`}
                  onPress={commit}
                  loading={saving}
                />
              </>
            )}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = (t) =>
  StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.colors.bg },
  scroll: { paddingHorizontal: t.spacing.screen },
  back: { paddingVertical: t.spacing.sm, marginBottom: t.spacing.sm },
  backText: { ...t.type.label, color: t.colors.ink },
  title: { ...t.type.title, color: t.colors.ink },
  sub: { ...t.type.body, color: t.colors.inkMuted },

  steps: { marginTop: t.spacing.lg, gap: 10 },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  stepNum: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: t.colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepNumText: { fontFamily: t.fonts.bold, fontSize: 10, color: t.colors.inverse },
  stepText: { ...t.type.caption, color: t.colors.inkBody, flex: 1 },

  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderWidth: 1,
    borderColor: t.colors.lineStrong,
    borderRadius: t.radius.md,
    paddingVertical: 12,
    marginTop: t.spacing.md,
  },
  linkText: { ...t.type.label, color: t.colors.ink },

  fieldLabel: { ...t.type.label, color: t.colors.ink, marginTop: t.spacing.lg, marginBottom: t.spacing.sm },
  textarea: {
    fontFamily: t.fonts.regular,
    fontSize: 12,
    lineHeight: 18,
    color: t.colors.ink,
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.lineStrong,
    borderRadius: t.radius.md,
    padding: 13,
    minHeight: 150,
  },

  previewLabel: { ...t.type.eyebrow, color: t.colors.inkMuted, marginBottom: t.spacing.md },

  card: {
    borderWidth: 1,
    borderColor: t.colors.lineStrong,
    borderRadius: t.radius.md,
    padding: t.spacing.md,
    marginBottom: t.spacing.sm,
  },
  cardOff: { opacity: 0.45, borderColor: t.colors.line },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 11 },
  check: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: t.colors.lineStrong,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkOn: { backgroundColor: t.colors.ink, borderColor: t.colors.ink },
  cardTitle: { ...t.type.itemTitle, color: t.colors.ink },
  cardCode: { ...t.type.caption, fontSize: 11, color: t.colors.inkMuted, marginTop: 2 },

  meeting: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.md,
    marginTop: t.spacing.sm,
    paddingLeft: 31,
  },
  meetingDay: { ...t.type.captionStrong, color: t.colors.ink, width: 52 },
  meetingTime: { ...t.type.caption, fontSize: 11.5, color: t.colors.inkMuted, flex: 1 },
  meetingRoom: { ...t.type.captionStrong, color: t.colors.inkBody },

  exceptions: {
    marginTop: t.spacing.sm,
    marginLeft: 31,
    backgroundColor: t.colors.raised,
    borderLeftWidth: 3,
    borderLeftColor: t.colors.lineStrong,
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
    padding: 10,
  },
  exTitle: { ...t.type.captionStrong, fontSize: 10.5, color: t.colors.inkBody, marginBottom: 3 },
  exLine: { ...t.type.caption, fontSize: 11, color: t.colors.inkMuted },
});
