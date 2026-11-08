# Thiệp cưới Hồng Sơn & Phương Lan

- `npm run dev` chạy thử (có cả API đọc và ghi Google Sheet), `npm test` kiểm thử, `npm run build` đóng gói (thư mục `dist`).
- Ảnh gốc nằm trong `source/` (không đưa lên web). Sau khi thêm hoặc đổi ảnh: sửa `src/config/photo-ids.json` rồi chạy `npm run photos`.
- Nội dung (tên, giờ, địa điểm, lời mời, ảnh từng phần): `src/config/wedding.config.ts`.
- **Khách mời** lấy từ tab `Thiệp online (tổng hợp)` của file Sheet (đã gộp ba bên, bỏ khách "Huỷ mời"): cột `Mã thiệp` và `Tên hiển thị trên thiệp`. Link mời có dạng `https://ten-mien/?khach=<Mã thiệp>` (tham số `khach` là mặc định của file), hoặc `https://ten-mien/<Mã thiệp>`, hoặc `?to=<Mã thiệp>`. Không tìm thấy mã thì hiện "Quý khách". Mã chấp nhận lệch chữ hoa/thường nếu không bị trùng. Máy chủ nạp sẵn danh sách khi khởi động và làm mới ngầm mỗi 20 giây, nên sửa Sheet xong thì thiệp cập nhật sau khoảng 20 giây; nếu Google lỗi thoáng qua, máy chủ vẫn dùng danh sách tốt gần nhất.
- **RSVP** ghi theo mã thiệp (Sheet không lưu tên) vào hai tab, không đụng tới tiêu đề hay thứ tự cột:
  - `RSVP web` (`Mã thiệp | Xác nhận | Số người | Lời nhắn | Thời gian cập nhật | Số lần gửi`): mỗi khách một dòng. Gửi lại thì cập nhật dòng đó và tăng `Số lần gửi`.
  - `RSVP log` (`Thời gian | Mã thiệp | Xác nhận | Số người | Lời nhắn`): ghi nối tiếp mọi lần gửi.
  - `Xác nhận` là đúng chữ `Tham dự` hoặc `Không tham dự` (công thức của file so sánh đúng chữ này). `Số người` là tổng số người đến, kể cả khách (1 + số người đi cùng), 0 nếu không tham dự. Thời gian dạng `dd/MM/yyyy HH:mm:ss` giờ Việt Nam.
  - Khách mở thiệp **không qua link riêng** thì chưa gửi được RSVP (không biết là ai); form hiện lời nhắc dùng link riêng.
- Tên tab có thể đổi bằng biến `GUEST_SHEET_NAME`, `RSVP_WEB_SHEET_NAME`, `RSVP_LOG_SHEET_NAME` (xem `.env.example`).
- Bí mật: copy `.env.example` thành `.env.local` và điền `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `GOOGLE_SHEET_ID`. Chia sẻ Sheet cho email tài khoản dịch vụ với quyền chỉnh sửa. Không bao giờ commit `.env.local`.

## Giữ công thức của Sheet không bị lệch

Công thức ở các tab khách đọc `'RSVP web'` qua vùng cố định. Hai quy tắc để không làm hỏng chúng:

- **Máy chủ không bao giờ chèn hay xoá dòng**: mọi lần thêm RSVP dùng `OVERWRITE` (ghi vào dòng trống kế tiếp). Chèn dòng (`INSERT_ROWS`) làm cả vùng công thức trượt xuống và các câu trả lời rơi ra ngoài vùng. Có kiểm thử cấm điều này. Cột `Số người` và `Số lần gửi` được ghi bằng **số thật** (không phải chữ) để `SUM`/`COUNT` trong Sheet tính đúng.
- **Vùng tham chiếu bắt đầu từ dòng tiêu đề** (`'RSVP web'!$A$1:$A$3000`, không phải `$A$2`). Nếu ai đó chèn dòng dưới tiêu đề thì vùng chỉ giãn ra chứ không trượt. Lệnh dưới đây sửa sẵn cho file hiện tại và có thể chạy lại bất cứ lúc nào (không đổi gì nếu đã sửa):

```bash
npm run fix:formulas             # XEM TRƯỚC: chỉ in ra sẽ sửa gì, chưa ghi
npm run fix:formulas -- --apply  # ghi thật: sao lưu công thức và giá trị vào data/, ghi từng ô, rồi so sánh giá trị trước và sau
```

Lệnh chỉ đổi dòng bắt đầu của các vùng `'RSVP web'` từ 2 thành 1, không đụng ô tĩnh hay công thức khác, và dừng nếu ô vừa bị người khác sửa giữa chừng. Cần tài khoản dịch vụ có quyền sửa file (không còn vùng khoá cho nó).

## Tạo ID và link mời cho khách (lệnh cũ, chỉ dành cho Sheet có cột `ID` và `Name`)

> File Sheet hiện tại tự quản lý `Mã thiệp` nên **không cần lệnh này**; nếu chạy với file hiện tại, lệnh sẽ dừng và báo không thấy cột `ID`/`Name`, chưa ghi gì. Giữ lại cho trường hợp dùng Sheet đơn giản kiểu cũ (đặt `GUEST_SHEET_NAME` trỏ tới tab đó hoặc dùng `--tab=`).

Lệnh đọc một tab (mặc định theo `GUEST_SHEET_NAME`) qua `.env.local`, cấp ID cho những khách chưa có và điền ô Link:

```bash
npm run guests                    # XEM TRƯỚC: chỉ in ra sẽ làm gì, chưa ghi gì vào Sheet
npm run guests -- --apply         # ghi thật
npm run guests -- --apply --clean-names   # ghi thật và sửa cột Name: "A Thành" -> "Anh Thành"
```

- ID có dạng `anh-thanh-83h8f`: tên không dấu, nối bằng `-`, thêm 5 ký tự ngẫu nhiên (bỏ `i`, `l`, `o`, `0`, `1`).
- **Không bao giờ đổi một ID hợp lệ đã có** (link có thể đã gửi). Chỉ điền ô ID trống, thay ID không hợp lệ (có dấu cách, có dấu) và ID bị trùng. Chạy lại nhiều lần vẫn an toàn.
- **Không bao giờ ghi đè ô đang là công thức** (ví dụ cột "Link mời" là `="https://.../"&A2`). Ô ID là công thức thì bị bỏ qua và báo lại.
- Khi `--apply`: lưu bản sao lưu vào `data/backup-*.json` trước, dừng nếu Sheet vừa bị người khác sửa, ghi từng lô 100 ô, rồi đọc lại kiểm tra từng ô.
- `--clean-names` đổi `A`/`C` đầu tên thành `Anh`/`Chị` và bỏ `(*)` (để vào cột "Ghi chú" nếu tab có cột này). Tên gốc còn trong tệp sao lưu.
- Tuỳ chọn: `--tab="khách mời"`, `--base=https://...`, `--suffix=5` (3 đến 9), `--no-expand`.
- Sau khi ghi, máy chủ cập nhật danh sách khách sau khoảng 20 giây.

Có một chế độ phụ không cần Sheet: `npm run guests:file -- data/names.txt --copy` đọc danh sách tên từ tệp, xuất bảng ID, Name, Link để dán vào Sheet.

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
   Khoá riêng tư dán trên một dòng, giữ nguyên `\n`. `SITE_URL` là tên miền chính thức (`https://wedding.hson.io.vn`), dùng cho ảnh chia sẻ mạng xã hội. `APP_PORT` là cổng mở ra VM (mặc định 3000). `TRUSTED_PROXY_HOPS=1` khi có đúng một proxy (Kong) đứng trước; đặt 0 nếu truy cập thẳng.
3. Chạy: `docker compose up -d --build`
4. Kiểm tra: `docker compose ps` (trạng thái `healthy`), `docker compose logs -f app`, `curl http://localhost:3000/healthz` trả về `ok`.
5. Trỏ Kong/NAT vào `http://<IP của VM>:3000`. Kong cần chuyển tiếp các header `Host` và `X-Forwarded-For`.
6. Cập nhật phiên bản mới: `git pull && docker compose up -d --build`.

Lưu ý: tệp `.env` chứa khoá bí mật, không commit. Ứng dụng không tự nén dữ liệu và không tự có HTTPS, hãy bật nén (gzip) ở Kong nếu muốn trang tải nhanh hơn.

Chạy thử không cần Docker: `npm run build && npm run build:server && node --env-file=.env.local dist-server/main.mjs`.

## Ảnh chia sẻ và biểu tượng

- Favicon, biểu tượng ứng dụng và ảnh chia sẻ 1200×630 (`public/og-image.jpg`) được tạo bằng `npm run brand` (cần ảnh gốc trong `source/`). Sửa tên, ngày hoặc ảnh nền thì sửa trong `scripts/make-brand-assets.mjs` rồi chạy lại.
- Thẻ metadata nằm trong `index.html`. Địa chỉ tuyệt đối của ảnh được máy chủ điền theo `SITE_URL`.
- Sau khi triển khai, nếu Zalo hoặc Facebook còn hiện bản xem trước cũ thì làm mới bộ nhớ đệm: Facebook dùng công cụ Sharing Debugger (`developers.facebook.com/tools/debug`), Zalo dùng công cụ làm mới link của Zalo Developers.
