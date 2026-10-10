# Thiệp cưới Hồng Sơn & Phương Lan

- `npm run dev` chạy thử (có cả API đọc và ghi Google Sheet), `npm test` kiểm thử, `npm run build` đóng gói (thư mục `dist`).
- Ảnh gốc nằm trong `source/` (không đưa lên web). Sau khi thêm hoặc đổi ảnh: sửa `src/config/photo-ids.json` rồi chạy `npm run photos`.
- Nội dung (tên, giờ, địa điểm, lời mời, ảnh từng phần): `src/config/wedding.config.ts`.
- Khách mời: tab `khách mời` trong Google Sheet (cột `ID`, `Name`). Link mời có dạng `https://ten-mien/<ID>` hoặc `https://ten-mien/?to=<ID>`. Không tìm thấy ID thì hiện "Quý khách".
- RSVP ghi vào tab `Responses` (Tên khách, Tham dự, Số người, Lời nhắn, Thời gian). "Số người" là tổng số người đến (1 + số người đi cùng), 0 nếu không tham dự.
- Bí mật: copy `.env.example` thành `.env.local` và điền `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `GOOGLE_SHEET_ID`. Chia sẻ Sheet cho email tài khoản dịch vụ với quyền chỉnh sửa. Không bao giờ commit `.env.local`.

## Triển khai trên VM bằng Docker

Một ảnh Docker duy nhất chạy cả web lẫn API (Node) và mở một cổng; HTTPS, tên miền và nén dữ liệu do Kong/NAT phía trước lo.

1. VM cần Docker và Docker Compose.
2. Lấy mã và tạo tệp cấu hình:
   ```bash
   git clone git@github.com:hongsonvu0622-stack/wedding-landing.git && cd wedding-landing
   cp .env.example .env
   nano .env      # điền GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_SHEET_ID
   chmod 600 .env
   ```
   Khoá riêng tư dán trên một dòng, giữ nguyên `\n`. `APP_PORT` là cổng mở ra VM (mặc định 3000). `TRUSTED_PROXY_HOPS=1` khi có đúng một proxy (Kong) đứng trước; đặt 0 nếu truy cập thẳng.
3. Chạy: `docker compose up -d --build`
4. Kiểm tra: `docker compose ps` (trạng thái `healthy`), `docker compose logs -f app`, `curl http://localhost:3000/healthz` trả về `ok`.
5. Trỏ Kong/NAT vào `http://<IP của VM>:3000`. Kong cần chuyển tiếp các header `Host` và `X-Forwarded-For`.
6. Cập nhật phiên bản mới: `git pull && docker compose up -d --build`.

Lưu ý: tệp `.env` chứa khoá bí mật, không commit. Ứng dụng không tự nén dữ liệu và không tự có HTTPS, hãy bật nén (gzip) ở Kong nếu muốn trang tải nhanh hơn.

Chạy thử không cần Docker: `npm run build && npm run build:server && node --env-file=.env.local dist-server/main.mjs`.
