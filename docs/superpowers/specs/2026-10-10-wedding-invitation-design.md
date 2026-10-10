# Thiệp cưới online Hồng Sơn & Phương Lan — Design Spec

Ngày: 2026-10-10 · Trạng thái: chờ duyệt

## 1. Mục tiêu & thông tin cố định
SPA thiệp cưới tương tác, mỗi khách một link riêng, tên khách lấy từ Google Sheet.

| Mục | Giá trị |
|---|---|
| Chú rể | Vũ Hồng Sơn |
| Cô dâu | Thái Thị Phương Lan |
| Ngày giờ | Thứ Bảy, 19/12/2026, 11:00 trưa |
| Địa điểm | Trung Tâm Hội Nghị & Tiệc Cưới Pavilion Tân Sơn Nhất (sảnh Amber), 202 Đ. Hoàng Văn Thụ, Đức Nhuận, Hồ Chí Minh, Việt Nam |
| Nhạc | `public/song.mp3` |
| Ảnh | `public/asset/**` (54 ảnh, 5–19 MB/ảnh) |

Thành công = khách mở link, thấy đúng tên mình, xem thiệp mượt trên điện thoại (mục tiêu LCP < 2.5s trên 4G), gửi được RSVP/lời chúc.

## 2. Phong cách: Minimal Luxury / Editorial
Nền sáng giấy ngà, chữ serif lớn, ảnh full-bleed, nhiều khoảng trắng (density spacious), chuyển động chậm và có chủ đích. Không dùng emoji làm icon (dùng SVG Lucide).

**Palette "Golden Hour Pine"** (suy từ ảnh; ghi đè palette hồng mặc định của UI/UX Pro Max vì không hợp ảnh):

| Token | Hex | Dùng cho |
|---|---|---|
| `--bg` | `#FAF6EF` | nền chính |
| `--bg-alt` | `#F1E9DC` | nền section phụ |
| `--ink` | `#2B2823` | chữ chính (tương phản > 12:1) |
| `--ink-muted` | `#5E584E` | chữ phụ (≥ 4.5:1 trên `--bg`) |
| `--gold` | `#B99E7B` | đường kẻ, số, chi tiết (không dùng cho chữ nhỏ) |
| `--pine` | `#4F5640` | nút CTA (chữ ngà trên pine ≥ 7:1), focus ring |
| `--blush` | `#E8CFC8` | điểm nhấn nhẹ, nền thẻ RSVP |

**Chữ:** tên & tiêu đề: *Cormorant Infant* (hỗ trợ tiếng Việt); chữ viết tay điểm nhấn: *Great Vibes* (chỉ dùng cho cụm ngắn, kiểm tra dấu tiếng Việt khi tích hợp, fallback Cormorant italic); thân bài 17–18px, line-height 1.6.

## 2b. Hướng "Cinematic Luxury" (thay thế bố cục khung dây đầu tiên)
Bản mẫu thật nằm ở scratchpad `proto/index.html` (chạy bằng `python3 -m http.server`). Các điểm tạo "wow":
- Màn mở thiệp dạng **cánh cửa/rèm xanh đêm `#1E2318`** trượt ra hai bên để lộ hero, kèm tên khách và monogram chữ viết tay vàng.
- **Hero full-viewport** với tên đôi viết tay **Great Vibes** (kiểu B, tối đa ~170px, hai dòng lệch nhau, dòng 2 có "&" màu vàng) đặt ở phần dưới ảnh để không che cô dâu chú rể, Ken Burns chậm, parallax; dùng ảnh ngang trên desktop và ảnh dọc trên mobile.
- Dải chữ chạy (marquee) kiểu tạp chí; số **19** viền vàng lớn bên cạnh khung ảnh **vòm (arch)**.
- Khoảng **ảnh điện ảnh toàn màn hình** có trích dẫn, parallax.
- Hành trình dạng so le với số thứ tự lớn; **Sự kiện trên nền xanh đêm** với đồng hồ đếm ngược cỡ lớn.
- Album là **dải ảnh kéo ngang** (so le chiều cao), RSVP đặt trên ảnh nền tối.
- Thêm màu `--night #1E2318` (mảng tối xen kẽ với nền ngà để tạo nhịp điện ảnh). Font (người dùng chọn, đã kiểm tra có đủ dấu tiếng Việt): **Cormorant Garamond** (tên, tiêu đề), **Great Vibes** (chữ viết tay, dấu "&", chữ ký), **Montserrat** (nhãn nhỏ, thân bài, giãn chữ rộng).
**Kiểu tiêu đề hai dòng:** dòng trên Cormorant Title Case màu mực, dòng dưới Great Vibes màu hồng nâu `--rose #C9A78B` cỡ ~1.5 lần, đè sát dòng trên (ví dụ "Câu Chuyện / Của Chúng Mình").

**Thông tin hai lễ:**
- Lễ Vu Quy (nhà gái): Thứ Bảy 19/12/2026, 11:00, sảnh Amber, Pavilion Tân Sơn Nhất, 202 Hoàng Văn Thụ.
- Lễ Thành Hôn (nhà trai): Chủ Nhật 20/12/2026, 11:00, tại **tư gia nhà trai** (hiển thị "Tư gia nhà trai", chưa có địa chỉ nên không có nút "Chỉ đường"; thêm vào `wedding.config.ts` khi có).
- Bố mẹ nhà trai: Ông Vũ Thanh Tùng, Bà Nguyễn Thị Ngân. Nhà gái: Bà Trần Thị Tập.
- Đồng hồ đếm ngược tới 19/12/2026 11:00; mỗi lễ có nút "Thêm vào lịch" riêng.

**Section "Hai Gia Đình":** một section riêng trên nền cát `--bg-alt`, tiêu đề hai dòng "Hai Gia Đình / Hai Trái Tim", lời dẫn "Lễ thành hôn của hai con chúng tôi". Hai cột đối xứng ngăn bởi đường kẻ vàng dọc và huy hiệu "&" ở giữa (máy tính), xếp dọc trên điện thoại. Mỗi cột: ảnh chân dung khung vòm, nhãn "Chú rể/Cô dâu", tên đầy đủ cỡ lớn (Vũ Hồng Sơn · Thái Thị Phương Lan), đường kẻ trang trí hình thoi, nhãn "Nhà trai/Nhà gái" và tên bố mẹ (nhà trai: Ông Vũ Thanh Tùng, Bà Nguyễn Thị Ngân; nhà gái: Bà Trần Thị Tập).

## 3. Cấu trúc trang
1. **Cover/Mở thiệp** — ảnh nền mờ, "Trân trọng kính mời {tên khách}", nút "Mở thiệp" (bắt đầu phát nhạc; vì autoplay bị chặn).
2. **Hero** — ảnh bình minh dọc toàn màn hình, tên đôi, "19 · 12 · 2026".
3. **Lời mời** — đoạn văn ngắn + 2 ảnh xếp lệch kiểu tạp chí.
4. **Hành trình** — 4 mốc theo bối cảnh (đồi bình minh → rừng thông → cây thông & hồ → studio).
5. **Sự kiện** — ngày/giờ, địa điểm, đếm ngược, nút "Chỉ đường" (Google Maps) và "Thêm vào lịch" (.ics).
6. **Album** — masonry ~24 ảnh, lightbox có phím ←/→/Esc và vuốt, nút điều hướng hiển thị.
7. **RSVP & lời chúc** — tên điền sẵn, tham dự/không, số người, lời nhắn; nhãn luôn hiển thị, lỗi ngay dưới trường.
8. **Mừng cưới** — QR (giả lập, thay sau).
9. **Footer** — cảm ơn + chữ ký.

Nút bật/tắt nhạc cố định góc (≥ 44×44px, `aria-label`). Hỗ trợ `prefers-reduced-motion` (tắt parallax/stagger). Mobile-first; kiểm tra ở 375/768/1024/1440.

**Chuyển động:** fade-up + stagger nhẹ (300–450ms, ease-out), parallax chậm cho hero, chỉ animate `transform/opacity`.

## 3b. Responsive: điện thoại và máy tính (cùng mức ưu tiên)
Thiết kế mobile-first, mở rộng lên desktop. Breakpoint: 375 · 768 · 1024 · 1440. Nội dung chữ tối đa 65 ký tự/dòng, container tối đa 1200px, không cuộn ngang ở mọi kích thước.

| Section | Điện thoại (< 768) | Máy tính (≥ 1024) |
|---|---|---|
| Cover | Giữa màn hình, ảnh nền mờ | Bố cục chia đôi: ảnh dọc bên trái, lời mời và nút bên phải |
| Hero | Ảnh dọc full-screen | Ảnh ngang full-bleed (dùng ảnh landscape), tên đôi cỡ lớn căn trái dưới |
| Lời mời | 1 cột, 2 ảnh lệch | 2 cột: chữ trái, 2–3 ảnh xếp lệch phải |
| Hành trình | Dọc, ảnh trên chữ dưới | Zigzag: ảnh và chữ đổi bên xen kẽ, ảnh sticky khi cuộn |
| Sự kiện | 1 cột xếp chồng | 2 cột: thông tin và đếm ngược trái, bản đồ nhúng phải |
| Album | Masonry 2 cột | Masonry 4 cột, lightbox có mũi tên và thumbnail dưới |
| RSVP | Form 1 cột | Form trong thẻ căn giữa (max 560px) cạnh tường lời chúc |
| Điều hướng | Không menu; nút nhạc cố định | Thanh mục nhỏ cố định phía trên (Lời mời · Sự kiện · Album · RSVP), ẩn khi ở Cover |

Ảnh dùng `srcset`/`sizes` để điện thoại không tải ảnh 2000px; pointer thô (cảm ứng) dùng vuốt, pointer chuột có hover nhẹ và phím mũi tên. Vùng chạm tối thiểu 44×44px, hover chỉ là phần thêm, không phải cách duy nhất để thao tác. Kiểm tra thực tế ở 375, 768, 1024, 1440.

## 4. Kiến trúc kỹ thuật
Vite + React + TypeScript + Tailwind CSS + Framer Motion. Static build, deploy Vercel/Netlify/Cloudflare Pages.

```
src/
  config/wedding.config.ts   # thông tin cặp đôi, sự kiện, danh sách ảnh đã chọn
  lib/guests.ts              # GuestProvider: lấy tên khách (xem §5)
  lib/rsvp.ts                # RsvpClient: gửi RSVP (xem §6)
  components/ sections/      # mỗi section 1 file
  styles/tokens.css          # CSS variables ở §2
scripts/optimize-images.mjs  # sharp: WebP 640/1280/2000 + blur placeholder
public/img/, public/audio/   # đầu ra đã tối ưu (ảnh gốc không bị sửa)
```

**Pipeline ảnh:** script đọc `public/asset/**`, chọn ~28 ảnh theo danh sách trong config, xuất WebP nhiều kích thước + `srcset`, lazy-load, giữ aspect-ratio để CLS < 0.1. Hero preload. Nhạc nén còn ~1–1.5MB, chỉ tải sau khi bấm "Mở thiệp".

## 5. Khách mời ↔ Google Sheet
- Link: `https://<domain>/?to=<slug>` (slug do cột `slug` trong Sheet).
- Sheet (Publish to web → CSV) có cột: `slug`, `name` (hiển thị), `title` (Anh/Chị/Gia đình…), `group` (tuỳ chọn).
- `GuestProvider` tải CSV khi mở trang (cache ngắn), tra theo slug. Không tìm thấy hoặc lỗi mạng → fallback: nếu có `?to=` thì hiển thị giải mã an toàn (React escape, giới hạn 60 ký tự), không thì "Quý khách".
- **Giai đoạn giả lập:** dùng `src/mocks/guests.json` cùng interface; khi bạn gửi link Sheet chỉ đổi 1 hằng URL.
- Script tiện ích sinh danh sách link từ Sheet (cột `link` = `base + slug`).

## 6. RSVP
Interface `RsvpClient.submit({slug, name, attending, count, message})`.
- **Giả lập (hiện tại):** lưu `localStorage`, trả thành công sau độ trễ giả, hiển thị tường lời chúc mẫu.
- **Thật (sau):** Google Apps Script Web App ghi vào Google Sheets (tab riêng), gọi bằng `fetch` POST.
- Chống gửi lặp (disable khi đang gửi), trạng thái loading/thành công/lỗi có thể thử lại.

## 7. Ngoài phạm vi (YAGNI)
Đa ngôn ngữ, CMS, đăng nhập, backend riêng, dark mode.

## 8. Kiểm thử & chấp nhận
- Unit: parse CSV khách, fallback tên, sinh .ics, đếm ngược (múi giờ Asia/Ho_Chi_Minh).
- Thủ công/trình duyệt: ?to= hợp lệ/không hợp lệ/rỗng, mở thiệp + nhạc, lightbox bàn phím, RSVP giả lập, reduced-motion, 4 breakpoint, không cuộn ngang, tab bằng bàn phím thấy focus.
- Lighthouse mobile: Performance ≥ 85, Accessibility ≥ 95.

## 9. Giả định cần xác nhận
1. Liên kết "Chỉ đường" dùng tìm kiếm Google Maps theo tên và địa chỉ ở trên (không cần toạ độ); sảnh "Amber" hiển thị như bạn nêu.
2. Ảnh: mình tự chọn ~28 ảnh đẹp nhất, ảnh bìa là ảnh bình minh dọc; bạn có thể đổi sau.
3. Nhạc `song.mp3` phát lặp, âm lượng 60%, mặc định tắt cho tới khi khách bấm "Mở thiệp".
