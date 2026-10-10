# Thiệp cưới Hồng Sơn & Phương Lan

- `npm run dev` chạy thử (có cả API đọc và ghi Google Sheet), `npm test` kiểm thử, `npm run build` đóng gói (thư mục `dist`).
- Ảnh gốc nằm trong `source/` (không đưa lên web). Sau khi thêm hoặc đổi ảnh: sửa `src/config/photo-ids.json` rồi chạy `npm run photos`.
- Nội dung (tên, giờ, địa điểm, lời mời, ảnh từng phần): `src/config/wedding.config.ts`.
- Khách mời: tab `khách mời` trong Google Sheet (cột `ID`, `Name`). Link mời có dạng `https://ten-mien/<ID>` hoặc `https://ten-mien/?to=<ID>`. Không tìm thấy ID thì hiện "Quý khách".
- RSVP ghi vào tab `Responses` (Tên khách, Tham dự, Số người, Lời nhắn, Thời gian). "Số người" là tổng số người đến (1 + số người đi cùng), 0 nếu không tham dự.
- Bí mật: copy `.env.example` thành `.env.local` và điền `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `GOOGLE_SHEET_ID`. Chia sẻ Sheet cho email tài khoản dịch vụ với quyền chỉnh sửa. Không bao giờ commit `.env.local`.

## Triển khai trên VM bằng Docker

Một ảnh Docker duy nhất chạy cả web lẫn API (Node), phía trước là Caddy lo HTTPS tự động và nén dữ liệu.

1. VM cần Docker và Docker Compose; mở cổng 80 và 443 trên tường lửa. Muốn có HTTPS thì trỏ bản ghi DNS `A` của tên miền về IP của VM.
2. Lấy mã và tạo tệp cấu hình:
   ```bash
   git clone git@github.com:hongsonvu0622-stack/wedding-landing.git && cd wedding-landing
   cp .env.example .env
   nano .env      # điền GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_SHEET_ID, DOMAIN
   ```
   `DOMAIN` ví dụ `thiep.example.com`; để trống thì chạy HTTP qua IP của VM. Khoá riêng tư dán trên một dòng, giữ nguyên `\n`.
3. Chạy: `docker compose up -d --build`
4. Kiểm tra: `docker compose ps` (cả hai dịch vụ `healthy`/`running`), `docker compose logs -f app`.
5. Cập nhật phiên bản mới: `git pull && docker compose up -d --build`.

Lưu ý: tệp `.env` chứa khoá bí mật, không commit và chỉ để quyền đọc cho người dùng triển khai (`chmod 600 .env`). Cổng 3000 của ứng dụng không mở ra ngoài, chỉ Caddy truy cập được.

Chạy thử không cần Docker: `npm run build && npm run build:server && node --env-file=.env.local dist-server/main.mjs`.
