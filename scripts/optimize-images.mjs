// Chuyển ảnh gốc (JPG) sang WebP nhiều kích thước cho web.
//   npm run photos               chỉ các ảnh trong src/config/photo-ids.json
//   npm run photos:all           toàn bộ ảnh trong thư mục nguồn
//   --force                      làm lại cả ảnh đã có
//   --quality=80                 chất lượng WebP (mặc định 80)
//   --src=public/asset           thư mục ảnh gốc (mặc định public/asset)
// Ảnh gốc không bao giờ bị sửa. Ảnh trong "fix" (đã chỉnh) được ưu tiên hơn "file le fix".
import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const args = process.argv.slice(2)
const flag = (name) => args.includes(`--${name}`)
const opt = (name, fallback) => args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1] ?? fallback

const WIDTHS = [640, 1280, 2000]
const QUALITY = Number(opt('quality', 80))
const SRC = opt('src', 'public/asset')
const OUT = 'public/img'
const force = flag('force')
const all = flag('all')

const dirs = [path.join(SRC, 'fix'), path.join(SRC, 'file le fix')] // thứ tự = độ ưu tiên

async function listSources() {
  const found = new Map() // id -> đường dẫn
  for (const dir of dirs) {
    let files = []
    try { files = await fs.readdir(dir) } catch { continue }
    for (const f of files) {
      const m = f.match(/^0B1A(\d+)\.jpe?g$/i)
      if (m && !found.has(m[1])) found.set(m[1], path.join(dir, f))
    }
  }
  return found
}

const fmt = (bytes) => (bytes / 1024 / 1024).toFixed(2) + ' MB'

const sources = await listSources()
if (sources.size === 0) {
  console.error(`Không tìm thấy ảnh trong ${dirs.join(' hoặc ')}`)
  process.exit(1)
}

let ids
if (all) ids = [...sources.keys()].sort()
else {
  ids = JSON.parse(await fs.readFile('src/config/photo-ids.json', 'utf8'))
  const missing = ids.filter((id) => !sources.has(id))
  if (missing.length) {
    console.error(`Thiếu ảnh gốc cho: ${missing.join(', ')}`)
    process.exit(1)
  }
}

await fs.mkdir(OUT, { recursive: true })
await fs.mkdir('src/generated', { recursive: true })

const manifest = {}
let inBytes = 0
let outBytes = 0
let built = 0
let skipped = 0

for (const id of ids) {
  const src = sources.get(id)
  const meta = await sharp(src).metadata()
  const swap = (meta.orientation ?? 1) >= 5
  const w = swap ? meta.height : meta.width
  const h = swap ? meta.width : meta.height
  const widths = WIDTHS.filter((x) => x <= w)
  if (widths.length === 0) widths.push(w)
  inBytes += (await fs.stat(src)).size

  for (const width of widths) {
    const out = path.join(OUT, `${id}-${width}.webp`)
    let exists = false
    if (!force) { try { await fs.access(out); exists = true } catch { /* chưa có */ } }
    if (!exists) {
      await sharp(src)
        .rotate() // theo EXIF, tránh ảnh bị xoay
        .resize({ width, withoutEnlargement: true, kernel: 'lanczos3' })
        .webp({ quality: QUALITY, effort: 5, smartSubsample: true })
        .toFile(out)
      built++
    } else skipped++
    outBytes += (await fs.stat(out)).size
  }
  manifest[id] = { w, h, widths }
  console.log(`ok ${id}  ${w}x${h}  [${widths.join(' / ')}]  từ ${path.relative('.', src)}`)
}

await fs.writeFile('src/generated/photos.json', JSON.stringify(manifest, null, 2) + '\n')
console.log('')
console.log(`${ids.length} ảnh · tạo mới ${built} file, bỏ qua ${skipped} file đã có`)
console.log(`Ảnh gốc: ${fmt(inBytes)}  ->  WebP (tất cả kích thước): ${fmt(outBytes)}  (chất lượng ${QUALITY})`)
