import mongoose from 'mongoose';

/**
 * Hội thoại riêng — dùng cho cả hai bối cảnh.
 *
 * Trước đây model gắn cứng cặp seller/buyer, chỉ hợp với chợ. Bài viết
 * cộng đồng không có người bán, nên cặp tên đó phải bỏ.
 *
 *   owner  — chủ nội dung: người bán tin đăng, hoặc tác giả bài viết
 *   guest  — người chủ động mở hội thoại
 *
 * Mọi hội thoại vẫn phải neo vào một nội dung cụ thể. Không có cách nào
 * nhắn cho một người bất kỳ — đây là hàng rào chống quấy rối, và nó giữ
 * Cantea không biến thành một ứng dụng nhắn tin.
 */
const conversationSchema = new mongoose.Schema(
  {
    context: {
      type: { type: String, enum: ['listing', 'post'], required: true },
      ref: { type: mongoose.Schema.Types.ObjectId, required: true },
    },

    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    guest: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    /**
     * TRẠNG THÁI ẨN DANH THEO TỪNG NGƯỜI, không theo hội thoại.
     *
     * Người này ẩn không có nghĩa người kia cũng phải ẩn. Chủ tin đăng
     * luôn công khai vì đã tự đặt danh tính lên bàn khi đăng bán; tác giả
     * bài ẩn danh thì vẫn ẩn khi có người nhắn tới.
     *
     * Hệ quả: quyền gửi ảnh và link cũng tính theo từng người. Người công
     * khai gửi được, người đang ẩn thì không — kể cả trong cùng một
     * hội thoại.
     */
    ownerAnonymous: { type: Boolean, default: false },
    guestAnonymous: { type: Boolean, default: true },
    ownerRevealedAt: { type: Date, default: null },
    guestRevealedAt: { type: Date, default: null },

    lastMessage: {
      text: { type: String, default: '' },
      sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      at: { type: Date, default: null },
      hasImages: { type: Boolean, default: false },
    },

    unreadOwner: { type: Number, default: 0 },
    unreadGuest: { type: Number, default: 0 },

    archivedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    /** Chặn một chiều và im lặng — người bị chặn không biết mình bị chặn */
    blockedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    reportedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    reportReason: { type: String, maxlength: 300, default: '' },
  },
  { timestamps: true }
);

/**
 * Một người chỉ mở được một hội thoại cho mỗi nội dung.
 * Không có ràng buộc này, bấm "Nhắn" hai lần tạo hai luồng song song
 * và người nhận trả lời vào luồng nào cũng sai.
 */
conversationSchema.index({ 'context.ref': 1, guest: 1 }, { unique: true });
conversationSchema.index({ owner: 1, 'lastMessage.at': -1 });
conversationSchema.index({ guest: 1, 'lastMessage.at': -1 });

const Conversation = mongoose.model('Conversation', conversationSchema);

export default Conversation;
