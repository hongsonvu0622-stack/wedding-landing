// Cắt sát mã VietQR từ ảnh chụp màn hình ngân hàng, giữ nguyên điểm ảnh (không vẽ lại mã).
//   npm run qr                                                                    chú rể: source/gift/vietqr-original.jpg -> public/gift-qr.png
//   npm run qr -- source/gift/co-dau.jpg --out=public/gift-qr-bride.png          mã của cô dâu
// Vị trí mã được tìm bằng chính bộ đọc mã QR (như điện thoại), nên ảnh bố cục thế nào cũng được.
// Ra ảnh PNG vuông: mã + viền trắng rộng 4 mô-đun (vùng yên tĩnh để ứng dụng ngân hàng quét được).
import fs from 'node:fs/promises'
import jsQR from 'jsqr'
import sharp from 'sharp'

const args = process.argv.slice(2)
const src = args.find((a) => !a.startsWith('--')) ?? 'source/gift/vietqr-original.jpg'
const out = args.find((a) => a.startsWith('--out='))?.slice(6) ?? 'public/gift-qr.png'

const { data, info } = await sharp(src).rotate().ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const code = jsQR(new Uint8ClampedArray(data), info.width, info.height)
if (!code) throw new Error(`Không đọc được mã QR trong ${src}. Hãy dùng ảnh chụp màn hình rõ nét, đủ cả mã.`)

const c = [code.location.topLeftCorner, code.location.topRightCorner, code.location.bottomLeftCorner, code.location.bottomRightCorner]
const PAD = 3 // lấy rộng thêm vài điểm ảnh (nền thẻ trắng) để không cắt mất rìa mã
const x1 = Math.max(0, Math.floor(Math.min(...c.map((p) => p.x))) - PAD)
const y1 = Math.max(0, Math.floor(Math.min(...c.map((p) => p.y))) - PAD)
const x2 = Math.min(info.width, Math.ceil(Math.max(...c.map((p) => p.x))) + PAD)
const y2 = Math.min(info.height, Math.ceil(Math.max(...c.map((p) => p.y))) + PAD)
const side = Math.max(x2 - x1, y2 - y1)
const quiet = Math.round(side * 0.1) // ~4 mô-đun

await sharp(src).rotate()
  .extract({ left: x1, top: y1, width: Math.min(side, info.width - x1), height: Math.min(side, info.height - y1) })
  .extend({ top: quiet, bottom: quiet, left: quiet, right: quiet, background: '#ffffff' })
  .png({ palette: true, colors: 16, dither: 0, compressionLevel: 9, effort: 10 })
  .toFile(out)

const meta = await sharp(out).metadata()
console.log(`${out}: ${meta.width}x${meta.height}px (mã ${x2 - x1}x${y2 - y1} tại ${x1},${y1}), ${((await fs.stat(out)).size / 1024).toFixed(0)} KB`)
