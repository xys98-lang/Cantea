/**
 * QUYỀN XEM MỘT BÀI VIẾT
 *
 * Tách khỏi communityController vì tính năng báo cáo phải áp đúng luật này: ai
 * không được đọc bài thì cũng không được báo cáo nó, nếu không thì endpoint báo
 * cáo trở thành đường dò xem một mã bài có tồn tại hay không.
 */

const userUniversityId = (user) => String(user.university?._id || user.university || '');

export const isModerator = (user) =>
  (user.roles || []).some((r) => r === 'admin' || r === 'moderator');

/**
 * Bài toàn quốc: ai đăng nhập cũng đọc được, kể cả chưa xác thực.
 * Bài của trường: bắt buộc đã xác thực VÀ đúng trường đó.
 */
export const postAccessError = (post, user) => {
  if (post.communityType !== 'university') return null;

  if (user.verificationStatus !== 'verified') {
    return {
      status: 403,
      code: 'UNIVERSITY_VERIFICATION_REQUIRED',
      message: 'Bạn cần xác thực email trường để xem nội dung này',
      currentStatus: user.verificationStatus,
    };
  }

  const postUni = String(post.university?._id || post.university || '');
  if (userUniversityId(user) !== postUni) {
    return {
      status: 403,
      code: 'WRONG_UNIVERSITY',
      message: 'Nội dung này chỉ dành cho sinh viên trường khác',
    };
  }

  return null;
};

/**
 * Bài đang bị ẩn chờ xem xét sau khi có báo cáo.
 *
 * Tác giả vẫn xem được bài mình: bị ẩn oan mà không còn thấy bài đâu là trải
 * nghiệm khiến người ta nghĩ dữ liệu đã mất. Người kiểm duyệt cũng phải xem
 * được, vì họ là người sẽ quyết định.
 *
 * Cần post.author để biết ai là tác giả, mà author để select:false — truy vấn
 * nào gọi hàm này phải xin '+author'. Thiếu thì tác giả bị coi như người lạ:
 * chặn nhầm chứ không mở nhầm, đó là hướng sai an toàn hơn.
 */
export const hiddenPostError = (post, user) => {
  if (post.isApproved !== false) return null;
  if (String(post.author || '') === String(user._id)) return null;
  if (isModerator(user)) return null;

  return {
    status: 403,
    code: 'POST_UNDER_REVIEW',
    message: 'Bài viết này đang được xem xét sau khi có báo cáo',
  };
};

/**
 * Cửa duy nhất để kiểm quyền xem một bài.
 *
 * Gộp hai lần kiểm vào một hàm chứ không để controller tự gọi lần lượt: hai lời
 * gọi rời nhau thì chỗ mới viết sau rất dễ chỉ nhớ gọi một cái, và chỗ quên sẽ
 * là một lỗ hổng im lặng.
 */
export const postViewError = (post, user) => postAccessError(post, user) || hiddenPostError(post, user);
