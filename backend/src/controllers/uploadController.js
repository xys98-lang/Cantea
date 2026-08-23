import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { logger } from '../utils/logger.js';

const MAX_FILE_MB = 8;
const MAX_FILES = 5;

/**
 * Cấu hình Cloudinary từ biến môi trường.
 * Gọi ở đây thay vì lúc khởi động server để nếu thiếu khoá thì chỉ
 * tính năng ảnh hỏng, không làm sập cả backend.
 */
const configured = () =>
  Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );

if (configured()) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

/**
 * Giữ file trong RAM rồi đẩy thẳng lên Cloudinary, không ghi xuống đĩa.
 * Máy chủ không cần thư mục tạm, và ảnh không bao giờ nằm lại trên
 * ổ cứng sau khi request kết thúc.
 */
export const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_MB * 1024 * 1024, files: MAX_FILES },
  fileFilter: (req, file, cb) => {
    // HEIC là định dạng mặc định của iPhone — bỏ sót nó là chặn nửa số người dùng
    if (!/^image\/(jpe?g|png|webp|heic|heif)$/i.test(file.mimetype)) {
      return cb(
        Object.assign(new Error('Chỉ nhận ảnh JPG, PNG, WEBP hoặc HEIC'), {
          code: 'UNSUPPORTED_TYPE',
        })
      );
    }
    cb(null, true);
  },
}).array('images', MAX_FILES);

/** Đẩy một buffer lên Cloudinary */
const uploadBuffer = (buffer, folder) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        // Ảnh sinh viên chụp bằng điện thoại thường 4000px — thu về 1600
        // là quá đủ cho màn hình, mà giảm dung lượng khoảng 8 lần
        transformation: [
          { width: 1600, height: 1600, crop: 'limit' },
          { quality: 'auto:good' },
          { fetch_format: 'auto' },
        ],
      },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });

/**
 * Chèn phép biến đổi vào URL Cloudinary để lấy ảnh thu nhỏ.
 * Một lần tải lên dùng được cho mọi kích thước — không phải sinh
 * và lưu nhiều bản.
 */
export const thumbUrl = (url, w = 400, h = 400) =>
  String(url || '').replace('/upload/', `/upload/w_${w},h_${h},c_fill,q_auto,f_auto/`);

/**
 * POST /api/uploads
 * Nhận tối đa 5 ảnh, trả về URL và publicId của từng ảnh.
 */
export const uploadImages = async (req, res) => {
  if (!configured()) {
    return res.status(503).json({
      status: 'error',
      code: 'UPLOAD_NOT_CONFIGURED',
      message: 'Máy chủ chưa cấu hình dịch vụ lưu ảnh',
    });
  }

  if (!req.files?.length) {
    return res.status(400).json({
      status: 'error',
      code: 'NO_FILE',
      message: 'Chưa chọn ảnh nào',
    });
  }

  /**
   * Thư mục riêng cho từng người dùng.
   *
   * LƯU Ý: ảnh tải lên rồi bỏ dở (soạn bài xong không đăng) sẽ nằm lại
   * ở đây. Cần một tác vụ dọn định kỳ xoá ảnh trong folder draft cũ hơn
   * 24 giờ và không được bài nào tham chiếu tới.
   */
  const folder = `cantea/${req.body.folder === 'listing' ? 'listings' : 'posts'}/${req.user._id}`;

  try {
    const results = await Promise.all(req.files.map((f) => uploadBuffer(f.buffer, folder)));

    logger.info(`Tải lên ${results.length} ảnh cho ${req.user._id}`);

    res.status(201).json({
      status: 'success',
      data: {
        images: results.map((r) => ({
          url: r.secure_url,
          thumb: thumbUrl(r.secure_url),
          publicId: r.public_id,
          width: r.width,
          height: r.height,
          bytes: r.bytes,
        })),
      },
    });
  } catch (e) {
    logger.error(`Tải ảnh thất bại: ${e.message}`);
    res.status(502).json({
      status: 'error',
      code: 'UPLOAD_FAILED',
      message: 'Không tải được ảnh lên. Kiểm tra kết nối rồi thử lại.',
    });
  }
};

/**
 * DELETE /api/uploads/:publicId
 * publicId có dấu gạch chéo nên frontend phải mã hoá URI trước khi gửi.
 */
export const deleteImage = async (req, res) => {
  if (!configured()) {
    return res.status(503).json({
      status: 'error',
      code: 'UPLOAD_NOT_CONFIGURED',
      message: 'Máy chủ chưa cấu hình dịch vụ lưu ảnh',
    });
  }

  const publicId = decodeURIComponent(req.params.publicId || '');

  // Chỉ cho xoá ảnh nằm trong thư mục của chính mình
  if (!publicId.includes(`/${req.user._id}/`)) {
    return res.status(403).json({
      status: 'error',
      code: 'FORBIDDEN',
      message: 'Không xoá được ảnh của người khác',
    });
  }

  try {
    await cloudinary.uploader.destroy(publicId);
    res.status(200).json({ status: 'success', message: 'Đã xoá ảnh' });
  } catch (e) {
    logger.error(`Xoá ảnh thất bại: ${e.message}`);
    res.status(502).json({
      status: 'error',
      code: 'DELETE_FAILED',
      message: 'Không xoá được ảnh',
    });
  }
};

/**
 * Multer ném lỗi trước khi tới controller, và mặc định Express trả về
 * trang HTML — frontend đang chờ JSON sẽ vỡ. Middleware này chuyển
 * chúng về đúng dạng.
 */
export const uploadErrorHandler = (err, req, res, next) => {
  if (!err) return next();

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      status: 'error',
      code: 'FILE_TOO_LARGE',
      message: `Ảnh không được quá ${MAX_FILE_MB}MB`,
    });
  }
  if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      status: 'error',
      code: 'TOO_MANY_FILES',
      message: `Tối đa ${MAX_FILES} ảnh mỗi lần`,
    });
  }
  if (err.code === 'UNSUPPORTED_TYPE') {
    return res.status(400).json({
      status: 'error',
      code: 'UNSUPPORTED_TYPE',
      message: err.message,
    });
  }

  next(err);
};
