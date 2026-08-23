import * as ImagePicker from 'expo-image-picker';
import client from './client';

export const MAX_IMAGES = 5;

/**
 * Mở thư viện ảnh và trả về các ảnh người dùng chọn.
 *
 * quality 0.8 nén ngay trên máy trước khi gửi — ảnh iPhone gốc thường
 * 3–5MB, sau khi nén còn khoảng 600KB. Với mạng 4G ở Việt Nam, khác
 * biệt này là giữa "tải xong trong 2 giây" và "chờ nửa phút".
 */
export const pickImages = async (limit = MAX_IMAGES) => {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    throw {
      code: 'PERMISSION_DENIED',
      message: 'Cantea cần quyền truy cập ảnh. Bật trong Cài đặt để tiếp tục.',
    };
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: limit > 1,
    selectionLimit: limit,
    quality: 0.8,
  });

  if (result.canceled) return [];
  return result.assets || [];
};

/** Chụp ảnh trực tiếp — tiện khi bán sách, không phải chụp trước rồi vào app */
export const takePhoto = async () => {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) {
    throw {
      code: 'PERMISSION_DENIED',
      message: 'Cantea cần quyền dùng camera. Bật trong Cài đặt để tiếp tục.',
    };
  }

  const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
  if (result.canceled) return [];
  return result.assets || [];
};

const guessName = (asset, i) => {
  if (asset.fileName) return asset.fileName;
  const ext = (asset.uri.split('.').pop() || 'jpg').split('?')[0];
  return `image_${Date.now()}_${i}.${ext}`;
};

const guessType = (asset) => {
  if (asset.mimeType) return asset.mimeType;
  const ext = (asset.uri.split('.').pop() || 'jpg').toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'heic' || ext === 'heif') return 'image/heic';
  return 'image/jpeg';
};

/**
 * @param assets  mảng trả về từ pickImages / takePhoto
 * @param folder  'post' | 'listing'
 */
export const uploadImages = async (assets, folder = 'post') => {
  if (!assets?.length) return [];

  const form = new FormData();
  assets.forEach((a, i) => {
    form.append('images', {
      uri: a.uri,
      name: guessName(a, i),
      type: guessType(a),
    });
  });
  form.append('folder', folder);

  /**
   * Phải ghi đè Content-Type: client mặc định 'application/json', mà
   * multipart cần một chuỗi boundary do chính thư viện sinh ra.
   * Đặt undefined để axios tự điền.
   */
  const { data } = await client.post('/uploads', form, {
    headers: { 'Content-Type': undefined },
    timeout: 60000, // ảnh lớn trên mạng chậm cần lâu hơn 15 giây mặc định
  });

  return data.data.images;
};

export const deleteImage = (publicId) =>
  client.delete(`/uploads/${encodeURIComponent(publicId)}`).then((r) => r.data);

/**
 * Dựng URL ảnh thu nhỏ từ URL gốc — không cần gọi máy chủ.
 *
 * Mặc định hạ từ 400 xuống 200px: ô lưới Canlib chỉ rộng chừng 170pt,
 * tải 400px là thừa hơn gấp đôi bề mặt hiển thị mà mắt không phân biệt
 * được. Riêng việc này đã giảm băng thông hơn ba lần.
 *
 * Phần lớn nơi hiển thị nên dùng <Thumb> thay vì gọi hàm này — nó tự
 * tính kích thước theo khung và có sẵn bộ nhớ đệm trên đĩa.
 */
export const thumb = (url, w = 200, h = 200) =>
  String(url || '').replace('/upload/', `/upload/w_${w},h_${h},c_fill,q_auto,f_auto/`);
