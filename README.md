# Thiệp cưới Hồng Sơn & Phương Lan

- `npm run dev` chạy thử (có cả API đọc và ghi Google Sheet), `npm test` kiểm thử, `npm run build` đóng gói (thư mục `dist`).
- Ảnh gốc nằm trong `source/` (không đưa lên web). Sau khi thêm hoặc đổi ảnh: sửa `src/config/photo-ids.json` rồi chạy `npm run photos`.
- Nội dung (tên, giờ, địa điểm, lời mời, ảnh từng phần): `src/config/wedding.config.ts`.
- Khách mời: tab `khách mời` trong Google Sheet (cột `ID`, `Name`). Link mời có dạng `https://ten-mien/<ID>` hoặc `https://ten-mien/?to=<ID>`. Không tìm thấy ID thì hiện "Quý khách".
- RSVP ghi vào tab `Responses` (Tên khách, Tham dự, Số người, Lời nhắn, Thời gian). "Số người" là tổng số người đến (1 + số người đi cùng), 0 nếu không tham dự.
- Bí mật: copy `.env.example` thành `.env.local` và điền `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `GOOGLE_SHEET_ID`. Chia sẻ Sheet cho email tài khoản dịch vụ với quyền chỉnh sửa. Không bao giờ commit `.env.local`.
- Triển khai: Vercel (thư mục `api/` chạy thành hàm serverless; nhập 3 biến môi trường ở trên trong cài đặt dự án). `vercel.json` đã có rewrite để link `/<ID>` vào đúng trang.
