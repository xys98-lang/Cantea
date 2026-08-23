import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  pickImages,
  takePhoto,
  uploadImages,
  deleteImage,
  MAX_IMAGES,
} from '../api/upload';
import { Thumb } from './Thumb';
import { useTheme, useThemedStyles } from '../store/theme';

const TILE = 92;

/**
 * Chọn, xem trước và sắp xếp ảnh.
 *
 * @param value     [{ url, thumb, publicId }]
 * @param onChange  nhận mảng mới
 * @param folder    'post' | 'listing'
 * @param coverHint hiện nhãn "ẢNH BÌA" trên ảnh đầu tiên
 */
export const ImageUploader = ({
  value = [],
  onChange,
  folder = 'post',
  max = MAX_IMAGES,
  coverHint = false,
  hint,
  style,
}) => {
  const [busy, setBusy] = useState(false);
  const remaining = max - value.length;

  const handle = async (getter) => {
    if (remaining <= 0) return;
    setBusy(true);
    try {
      const assets = await getter();
      if (!assets.length) return;

      const uploaded = await uploadImages(assets.slice(0, remaining), folder);
      onChange([...value, ...uploaded]);
    } catch (e) {
      Alert.alert('Không tải được ảnh', e.message || 'Có lỗi xảy ra, thử lại sau.');
    } finally {
      setBusy(false);
    }
  };

  const add = () => {
    if (remaining <= 0) return;
    Alert.alert('Thêm ảnh', undefined, [
      { text: 'Chọn từ thư viện', onPress: () => handle(() => pickImages(remaining)) },
      { text: 'Chụp ảnh', onPress: () => handle(takePhoto) },
      { text: 'Huỷ', style: 'cancel' },
    ]);
  };

  const remove = (idx) => {
    const img = value[idx];
    onChange(value.filter((_, i) => i !== idx));
    // Xoá trên máy chủ luôn, để ảnh bỏ đi không nằm lại tốn dung lượng
    if (img?.publicId) deleteImage(img.publicId).catch(() => {});
  };

  /** Đưa một ảnh lên đầu để làm ảnh bìa */
  const makeCover = (idx) => {
    if (idx === 0) return;
    const next = [...value];
    const [picked] = next.splice(idx, 1);
    onChange([picked, ...next]);
  };

  return (
    <View style={style}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.row}>
        {value.map((img, i) => (
          <Pressable
            key={img.publicId || img.url || i}
            onPress={() => makeCover(i)}
            style={s.tile}
          >
            <Thumb uri={img.url} size={TILE} round={t.radius.md} />

            {coverHint && i === 0 && (
              <View style={s.coverTag}>
                <Text style={s.coverText}>ẢNH BÌA</Text>
              </View>
            )}

            <Pressable onPress={() => remove(i)} style={s.removeBtn} hitSlop={8}>
              <Ionicons name="close" size={13} color={t.colors.inverse} />
            </Pressable>
          </Pressable>
        ))}

        {remaining > 0 && (
          <Pressable onPress={add} disabled={busy} style={[s.tile, s.addTile]}>
            {busy ? (
              <ActivityIndicator color={t.colors.ink} />
            ) : (
              <>
                <Ionicons name="add" size={22} color={t.colors.inkBody} />
                <Text style={s.addText}>
                  {value.length}/{max}
                </Text>
              </>
            )}
          </Pressable>
        )}
      </ScrollView>

      {Boolean(hint) && <Text style={s.hint}>{hint}</Text>}
      {coverHint && value.length > 1 && (
        <Text style={s.hint}>Chạm vào một ảnh để đặt làm ảnh bìa</Text>
      )}
    </View>
  );
};

const styles = (t) =>
  StyleSheet.create({
  row: { gap: t.spacing.sm, paddingVertical: 2 },
  tile: { width: TILE, height: TILE, borderRadius: t.radius.md, overflow: 'hidden' },

  addTile: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.lineStrong,
    borderStyle: 'dashed',
  },
  addText: { fontFamily: t.fonts.semibold, fontSize: 11, color: t.colors.inkMuted, marginTop: 2 },

  coverTag: {
    position: 'absolute',
    left: 5,
    bottom: 5,
    backgroundColor: t.colors.ink,
    borderRadius: t.radius.xs,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  coverText: { fontFamily: t.fonts.bold, fontSize: 8, letterSpacing: 0.6, color: t.colors.inverse },

  removeBtn: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(20,20,20,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  hint: { ...t.type.caption, fontSize: 11.5, color: t.colors.inkMuted, marginTop: t.spacing.sm },
});
