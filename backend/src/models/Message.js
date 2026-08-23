import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    text: { type: String, trim: true, maxlength: 1000, default: '' },

    /**
     * Ảnh đính kèm — CHỈ gửi được khi người gửi đã công khai danh tính.
     *
     * Ảnh mang theo quá nhiều dấu vết: siêu dữ liệu vị trí, khuôn mặt,
     * nét chữ, phông nền phòng trọ. Cho phép gửi ảnh khi đang ẩn danh
     * là mở một lỗ hổng mà chính người dùng không nhìn thấy.
     */
    images: {
      type: [String],
      validate: { validator: (v) => v.length <= 3, message: 'Tối đa 3 ảnh mỗi tin nhắn' },
      default: [],
    },

    /** Người gửi đang ẩn danh hay không, ghi lại tại thời điểm gửi */
    senderAnonymous: { type: Boolean, default: true },

    /** Tin hệ thống: "Tin này đã được đánh dấu đã bán" */
    kind: { type: String, enum: ['text', 'system'], default: 'text' },

    readAt: { type: Date, default: null },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

messageSchema.pre('validate', function (next) {
  if (this.kind === 'system') return next();
  if (!this.text?.trim() && !this.images?.length) {
    return next(new Error('Tin nhắn phải có nội dung hoặc ảnh'));
  }
  next();
});

messageSchema.index({ conversation: 1, createdAt: -1 });

const Message = mongoose.model('Message', messageSchema);

export default Message;
