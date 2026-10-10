// Tạo favicon, biểu tượng ứng dụng và ảnh chia sẻ mạng xã hội (1200x630) cho thiệp.
//   npm run brand            (cần ảnh gốc trong source/asset và các gói font trong devDependencies)
// Chữ được chuyển thành đường vẽ (path) nên không phụ thuộc font của máy hay trình duyệt.
import fs from 'node:fs/promises'
import { createRequire } from 'node:module'
import opentype from 'opentype.js'
import sharp from 'sharp'

const require = createRequire(import.meta.url)
const fontFile = (pkg, file) => require.resolve(`@expo-google-fonts/${pkg}/${file}`)
const load = async (pkg, file) => {
  const buf = await fs.readFile(fontFile(pkg, file))
  const ab = () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
  const font = opentype.parse(ab())
  font.fresh = () => opentype.parse(ab())
  return font
}
const script = await load('great-vibes', '400Regular/GreatVibes_400Regular.ttf')
const sans = await load('montserrat', '500Medium/Montserrat_500Medium.ttf')

const C = { night: '#1E2318', gold: '#B99E7B', goldL: '#D8C3A0', ivory: '#FAF6EF' }

// Tự ghi dữ liệu đường vẽ: Path.toPathData của opentype.js đôi khi xuất "NaN" cho một toạ độ.
function pathData(path) {
  const n = (v) => {
    if (!Number.isFinite(v)) throw new Error('Toạ độ không hợp lệ trong đường vẽ chữ')
    return Number(v.toFixed(2)).toString()
  }
  return path.commands.map((c) => {
    switch (c.type) {
      case 'M': case 'L': return `${c.type}${n(c.x)} ${n(c.y)}`
      case 'Q': return `Q${n(c.x1)} ${n(c.y1)} ${n(c.x)} ${n(c.y)}`
      case 'C': return `C${n(c.x1)} ${n(c.y1)} ${n(c.x2)} ${n(c.y2)} ${n(c.x)} ${n(c.y)}`
      case 'Z': return 'Z'
      default: throw new Error(`Lệnh đường vẽ lạ: ${c.type}`)
    }
  }).join('')
}

function textWidth(font, text, size, letterSpacing = 0) {
  const scale = size / font.unitsPerEm
  const glyphs = [...text].map((ch) => font.charToGlyph(ch))
  let width = 0
  glyphs.forEach((g, i) => {
    width += g.advanceWidth * scale + letterSpacing
    if (glyphs[i + 1]) width += (Number(font.getKerningValue(g, glyphs[i + 1])) || 0) * scale
  })
  return width - letterSpacing
}

// Chữ -> SVG path, căn giữa theo cx. Tự xếp từng ký tự (opentype.js lỗi với bảng GSUB phức tạp của font chữ viết tay).
function textPath(font, text, cx, baseline, size, fill, letterSpacing = 0, stroke = 0) {
  const scale = size / font.unitsPerEm
  const glyphs = [...text].map((ch) => font.charToGlyph(ch))
  glyphs.forEach((g, i) => { if (g.index === 0 && text[i] !== '\u0000') throw new Error(`Font thiếu ký tự "${[...text][i]}"`) })
  let width = 0
  const xs = glyphs.map((g, i) => {
    const x = width
    width += g.advanceWidth * scale + letterSpacing
    if (glyphs[i + 1]) width += (Number(font.getKerningValue(g, glyphs[i + 1])) || 0) * scale
    return x
  })
  width -= letterSpacing
  if (!Number.isFinite(width)) throw new Error(`Không đo được độ rộng chữ "${text}"`)
  const x0 = cx - width / 2
  // Mỗi ký tự một <path> riêng: gộp cả dòng vào một đường vẽ khiến bộ dựng SVG dừng giữa chừng.
  // Đọc font mới cho từng ký tự: ký tự ghép (ơ, ư, ồ...) làm biến dạng nét của ký tự dùng chung trong cùng một lần đọc.
  const paths = [...text].map((ch, i) => pathData(font.fresh().charToGlyph(ch).getPath(x0 + xs[i], baseline, size))).filter((d) => d)
  return paths.map((d) => `<path d="${d}" fill="${fill}"${stroke ? ` stroke="${fill}" stroke-width="${stroke}" stroke-linejoin="round"` : ''}/>`).join('')
}

// ---------- favicon / icons ----------
// Biểu tượng lớn (ứng dụng, màn hình chính): "S&L" vừa 62% bề ngang, có viền mảnh.
const appIcon = (size) => {
  const fs = (size * 0.62 * 100) / textWidth(script, 'S&L', 100)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <rect width="${size}" height="${size}" fill="${C.night}"/>
  <rect x="${size * 0.07}" y="${size * 0.07}" width="${size * 0.86}" height="${size * 0.86}" fill="none" stroke="${C.gold}" stroke-opacity=".55" stroke-width="${Math.max(1, size * 0.012)}"/>
  ${textPath(script, 'S&L', size / 2, size * 0.6, fs, C.goldL)}
</svg>`
}
// Favicon nhỏ (16-48px): chỉ chữ "S" đậm hơn, nền bo góc, để còn đọc được ở cỡ rất nhỏ.
const favicon = (size) => {
  const fs = size * 0.66
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <rect width="${size}" height="${size}" rx="${size * 0.22}" fill="${C.night}"/>
  ${textPath(script, 'S', size * 0.47, size * 0.74, fs, C.goldL, 0, size * 0.03)}
</svg>`
}
await fs.writeFile('public/favicon.svg', favicon(64))
const png = (svg, px) => sharp(Buffer.from(svg), { density: 600 }).resize(px, px).png({ compressionLevel: 9 }).toBuffer()
const square = appIcon(512) // iOS và Android tự bo góc / che theo mặt nạ
await fs.writeFile('public/apple-touch-icon.png', await png(square, 180))
await fs.writeFile('public/icon-192.png', await png(square, 192))
await fs.writeFile('public/icon-512.png', await png(square, 512))

// favicon.ico chứa PNG 16/32/48
const small = await Promise.all([16, 32, 48].map(async (px) => ({ px, data: await png(favicon(64), px) })))
const header = Buffer.alloc(6); header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(small.length, 4)
let offset = 6 + 16 * small.length
const entries = small.map(({ px, data }) => {
  const e = Buffer.alloc(16)
  e.writeUInt8(px, 0); e.writeUInt8(px, 1); e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6)
  e.writeUInt32LE(data.length, 8); e.writeUInt32LE(offset, 12)
  offset += data.length
  return e
})
await fs.writeFile('public/favicon.ico', Buffer.concat([header, ...entries, ...small.map((s) => s.data)]))

// ---------- ảnh chia sẻ 1200x630 ----------
const W = 1200, H = 630
const hero = ['source/asset/fix/0B1A6457.jpg', 'source/asset/file le fix/0B1A6457.jpg']
let src
for (const f of hero) { try { await fs.access(f); src = f; break } catch { /* thử tiếp */ } }
if (!src) throw new Error('Không tìm thấy ảnh gốc 0B1A6457.jpg trong source/asset')
const overlay = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${C.night}" stop-opacity=".25"/>
      <stop offset=".38" stop-color="${C.night}" stop-opacity="0"/>
      <stop offset=".72" stop-color="${C.night}" stop-opacity=".62"/>
      <stop offset="1" stop-color="${C.night}" stop-opacity=".9"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#g)"/>
  <rect x="18" y="18" width="${W - 36}" height="${H - 36}" fill="none" stroke="${C.goldL}" stroke-opacity=".5" stroke-width="1.5"/>
  ${textPath(sans, 'TRÂN TRỌNG KÍNH MỜI', W / 2, 428, 21, C.goldL, 7)}
  ${textPath(script, 'Hồng Sơn & Phương Lan', W / 2, 536, 112, C.ivory)}
  ${textPath(sans, '19 & 20 · 12 · 2026', W / 2, 590, 22, C.goldL, 8)}
</svg>`
await sharp(src).rotate().resize(W, H, { fit: 'cover', position: 'attention' })
  .composite([{ input: Buffer.from(overlay), top: 0, left: 0 }])
  .jpeg({ quality: 84, mozjpeg: true }).toFile('public/og-image.jpg')

await fs.writeFile('public/site.webmanifest', JSON.stringify({
  name: 'Thiệp cưới Hồng Sơn & Phương Lan',
  short_name: 'Sơn & Lan',
  lang: 'vi',
  start_url: '/',
  display: 'standalone',
  background_color: C.night,
  theme_color: C.night,
  icons: [
    { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
    { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
  ],
}, null, 2) + '\n')

for (const f of ['favicon.svg', 'favicon.ico', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'og-image.jpg', 'site.webmanifest']) {
  console.log(f.padEnd(22), `${((await fs.stat('public/' + f)).size / 1024).toFixed(1)} KB`)
}
