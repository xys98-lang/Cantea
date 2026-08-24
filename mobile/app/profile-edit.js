import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Callout, Field, SectionHeader } from '../src/components/ui';
import { Screen } from '../src/components/Screen';
import { useAuth } from '../src/store/auth';
import { useTheme, useThemedStyles } from '../src/store/theme';
import { updateProfile, changePassword, YEAR_OPTIONS } from '../src/api/users';

export default function ProfileEdit() {
  const t = useTheme();
  const s = useThemedStyles(styles);
  const router = useRouter();
  const { user, refresh } = useAuth();

  const [nickname, setNickname] = useState(user?.nickname || '');
  const [major, setMajor] = useState(user?.major || '');
  const [year, setYear] = useState(user?.year || null);
  const [alumni, setAlumni] = useState(Boolean(user?.isAlumni));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [showPw, setShowPw] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState('');

  const uni = user?.university;

  /**
   * Chỉ gửi những gì thực sự đổi. Gửi cả ba trường mỗi lần sẽ ghi đè ngành học
   * bằng chuỗi rỗng khi người dùng chỉ định sửa biệt danh rồi xoá trắng ô kia
   * do bấm nhầm — và họ không có cách nào biết mình vừa mất dữ liệu.
   */
  const save = async () => {
    setError('');
    const payload = {};
    if (nickname.trim() !== (user?.nickname || '')) payload.nickname = nickname.trim();
    if (major.trim() !== (user?.major || '')) payload.major = major.trim();
    if (year !== (user?.year || null)) payload.year = year;
    if (alumni !== Boolean(user?.isAlumni)) payload.isAlumni = alumni;

    if (Object.keys(payload).length === 0) {
      router.back();
      return;
    }

    setSaving(true);
    try {
      await updateProfile(payload);
      await refresh();
      router.back();
    } catch (e) {
      setError(e.message || 'Không lưu được, thử lại sau');
    } finally {
      setSaving(false);
    }
  };

  /**
   * Đổi mật khẩu xong thì backend cấp token mới, nhưng app chưa có đường ghi
   * token đó vào kho lưu trữ — refresh() chỉ nạp lại hồ sơ. Nên ở đây đưa người
   * dùng về màn đăng nhập: phiên hiện tại đã bị chính việc đổi mật khẩu vô hiệu.
   */
  const submitPassword = async () => {
    setPwError('');
    if (newPw.length < 8) {
      setPwError('Mật khẩu mới phải có ít nhất 8 ký tự');
      return;
    }

    setPwSaving(true);
    try {
      await changePassword(currentPw, newPw);
      Alert.alert(
        'Đã đổi mật khẩu',
        'Các thiết bị khác đã bị đăng xuất. Hãy đăng nhập lại bằng mật khẩu mới.',
        [{ text: 'Đăng nhập lại', onPress: () => router.replace('/login') }]
      );
    } catch (e) {
      setPwError(e.message || 'Không đổi được mật khẩu');
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <Screen
      title="Sửa hồ sơ"
      variant="bar"
      onBack={() => router.back()}
      avoidKeyboard
    >
      <Callout>
        Ngành và Năm học giúp bảng tin ưu tiên bài hợp với bạn. Không ai thấy hai mục
        này ngoài bạn.
      </Callout>

      <Field
        label="Biệt danh"
        value={nickname}
        onChangeText={setNickname}
        placeholder="Tên hiển thị trong cộng đồng"
        maxLength={30}
        autoCapitalize="none"
      />

      {/*
        Trường hiện ra nhưng khoá. Nó chỉ đổi qua luồng xác thực email — cho sửa
        tay ở đây là mở cửa sau cho ba tầng guest → pending → verified.
      */}
      <View style={s.locked}>
        <Text style={s.lockedLabel}>Trường</Text>
        <Text style={s.lockedValue} numberOfLines={1}>
          {uni?.name || uni?.shortName || 'Chưa xác thực'}
        </Text>
        <Text style={s.lockedHint}>Đổi trường qua bước xác thực email trường</Text>
      </View>

      <Field
        label="Ngành"
        value={major}
        onChangeText={setMajor}
        placeholder="Ví dụ: Khoa học Máy tính"
        maxLength={80}
      />

      <Text style={s.yearLabel}>Năm học</Text>
      <View style={s.yearRow}>
        {YEAR_OPTIONS.map((y) => {
          const on = year === y;
          return (
            <Pressable
              key={y}
              onPress={() => {
                setYear(on ? null : y);
                if (!on) setAlumni(false);
              }}
              style={[s.yearChip, on && s.yearChipOn]}
            >
              <Text style={[s.yearText, on && s.yearTextOn]}>{y}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={s.yearHint}>Bấm lại vào số đang chọn để bỏ trống</Text>

      {/*
        Ô này nằm ngay dưới hàng năm học vì hai thứ trả lời cùng một câu hỏi.
        Chọn nó thì bỏ năm học, và ngược lại — người dùng thấy ngay hệ quả
        thay vì phát hiện sau khi bấm lưu.
      */}
      <Pressable
        onPress={() => {
          const next = !alumni;
          setAlumni(next);
          if (next) setYear(null);
        }}
        style={[s.alumniRow, alumni && s.alumniRowOn]}
      >
        <View style={[s.alumniBox, alumni && s.alumniBoxOn]}>
          {alumni && <Text style={s.alumniTick}>✓</Text>}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.alumniTitle}>Đã tốt nghiệp</Text>
          <Text style={s.alumniLine}>Bài viết của bạn sẽ hiện nhãn cựu sinh viên</Text>
        </View>
      </Pressable>

      {Boolean(error) && (
        <Callout tone="warn" style={{ marginTop: t.spacing.md }}>
          {error}
        </Callout>
      )}

      <View style={{ marginTop: t.spacing.lg }}>
        <Button title="Lưu" onPress={save} loading={saving} />
      </View>

      <SectionHeader
        title="Mật khẩu"
        actionLabel={showPw ? 'Đóng' : 'Đổi'}
        onAction={() => {
          setShowPw((v) => !v);
          setPwError('');
        }}
        style={{ marginTop: t.spacing.xl }}
      />

      {showPw && (
        <>
          <Field
            label="Mật khẩu hiện tại"
            value={currentPw}
            onChangeText={setCurrentPw}
            secureTextEntry
            autoCapitalize="none"
          />
          <Field
            label="Mật khẩu mới"
            value={newPw}
            onChangeText={setNewPw}
            secureTextEntry
            autoCapitalize="none"
            hint="Ít nhất 8 ký tự"
          />

          {Boolean(pwError) && (
            <Callout tone="warn" style={{ marginTop: t.spacing.md }}>
              {pwError}
            </Callout>
          )}

          <View style={{ marginTop: t.spacing.md }}>
            <Button
              title="Đổi mật khẩu"
              onPress={submitPassword}
              loading={pwSaving}
              disabled={!currentPw || !newPw}
              variant="ghost"
            />
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = (t) =>
  StyleSheet.create({
    locked: {
      marginTop: t.spacing.md,
      backgroundColor: t.colors.fill,
      borderRadius: t.radius.md,
      paddingHorizontal: t.spacing.md,
      paddingVertical: t.spacing.sm + 2,
    },
    lockedLabel: { ...t.type.caption, color: t.colors.inkMuted },
    lockedValue: { ...t.type.label, color: t.colors.ink, marginTop: 2 },
    lockedHint: { ...t.type.caption, fontSize: 11, color: t.colors.inkMuted, marginTop: 3 },

    yearLabel: { ...t.type.caption, color: t.colors.inkMuted, marginTop: t.spacing.md },
    yearRow: { flexDirection: 'row', gap: 8, marginTop: t.spacing.sm },
    yearChip: {
      flex: 1,
      height: 44,
      borderWidth: 1,
      borderColor: t.colors.line,
      borderRadius: t.radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    yearChipOn: { backgroundColor: t.colors.accent, borderColor: t.colors.accent },
    yearText: { ...t.type.label, color: t.colors.ink },
    yearTextOn: { color: t.colors.onAccent },
    yearHint: { ...t.type.caption, fontSize: 11, color: t.colors.inkMuted, marginTop: 6 },

    alumniRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.spacing.md,
      marginTop: t.spacing.md,
      borderWidth: 1,
      borderColor: t.colors.line,
      borderRadius: t.radius.md,
      padding: t.spacing.md,
    },
    alumniRowOn: { borderColor: t.colors.accent },
    alumniBox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: t.colors.line,
      alignItems: 'center',
      justifyContent: 'center',
    },
    alumniBoxOn: { backgroundColor: t.colors.accent, borderColor: t.colors.accent },
    alumniTick: { color: t.colors.onAccent, fontSize: 13, fontFamily: t.fonts.bold },
    alumniTitle: { ...t.type.label, color: t.colors.ink },
    alumniLine: { ...t.type.caption, fontSize: 11, color: t.colors.inkMuted, marginTop: 1 },
  });
