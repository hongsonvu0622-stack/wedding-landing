// Cắt sát mã VietQR từ ảnh chụp màn hình ngân hàng, giữ nguyên điểm ảnh (không vẽ lại mã).
//   npm run qr                                   dùng source/gift/vietqr-original.jpg
//   npm run qr -- đường/dẫn/ảnh-khác.jpg
// Ra public/gift-qr.png: mã QR + viền trắng (vùng yên tĩnh) để ứng dụng ngân hàng quét được.
import fs from 'node:fs/promises'
import sharp from 'sharp'

const src = process.argv[2] ?? 'source/gift/vietqr-original.jpg'
const out = 'public/gift-qr.png'
const MARGIN = 40 // viền trắng quanh mã, tính theo điểm ảnh gốc

const { data, info } = await sharp(src).greyscale().raw().toBuffer({ resolveWithObject: true })
const { width: W, height: H } = info
// Mã QR là khối điểm ảnh tối lớn nhất nằm trong thẻ: tìm khung bao của các điểm rất tối ở nửa trên của ảnh.
let x1 = W, y1 = H, x2 = 0, y2 = 0
for (let y = Math.round(H * 0.26); y < Math.round(H * 0.58); y++) {
  for (let x = 0; x < W; x++) {
    if (data[y * W + x] < 70) { if (x < x1) x1 = x; if (x > x2) x2 = x; if (y < y1) y1 = y; if (y > y2) y2 = y }
  }
}
const w = x2 - x1 + 1, h = y2 - y1 + 1
if (w < 200 || h < 200 || Math.abs(w - h) > 6) throw new Error(`Không nhận ra mã QR trong ${src} (khung tìm được ${w}x${h})`)

const left = Math.max(0, x1 - MARGIN), top = Math.max(0, y1 - MARGIN)
const size = Math.min(Math.max(w, h) + 2 * MARGIN, W - left, H - top)
await sharp(src).extract({ left, top, width: size, height: size }).png({ palette: true, colors: 16, dither: 0, compressionLevel: 9, effort: 10 }).toFile(out)
console.log(`${out}: ${size}x${size}px (mã ${w}x${h} tại ${x1},${y1}), ${((await fs.stat(out)).size / 1024).toFixed(0)} KB`)
