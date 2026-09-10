# Quy tắc phát triển & Cập nhật giao diện (UI Workflow)

Dự án này áp dụng **Quy trình Code trực tiếp + Git Checkpoint (Cách 1)** đối với mọi yêu cầu thêm tính năng mới hoặc cập nhật giao diện (UI):

## 1. Tạo điểm lưu an toàn (Git Checkpoint)
- Trước khi chỉnh sửa code, luôn kiểm tra trạng thái Git và tạo một checkpoint/commit an toàn để sẵn sàng khôi phục khi cần.

## 2. Code trực tiếp lên Dev Server
- Triển khai code tính năng trực tiếp vào các component của dự án để hiển thị ngay trên `http://localhost:5173/`.
- Không bắt buộc làm ảnh mockup tĩnh hay trang demo phụ rườm rà.
- Đảm bảo code chạy mượt mà, đúng chuẩn thẩm mỹ và kiểm tra không có lỗi build/TypeScript.

## 3. Để người dùng tương tác thử trên web thật
- Báo người dùng mở trình duyệt kiểm tra, tự tay click thao tác và đánh giá độ tiện dụng ngay trong ngữ cảnh thực tế của quán.

## 4. Chốt tính năng hoặc Rollback ngay tức thì
- **Nếu người dùng hài lòng**: Lưu chính thức (commit) và ghi nhận hoàn thành.
- **Nếu người dùng không ưng ý**: Thực hiện rollback ngay lập tức bằng lệnh Git (`git restore .` hoặc khôi phục về checkpoint trước đó) để codebase trở lại nguyên trạng ban đầu 100% trong 1 giây.
