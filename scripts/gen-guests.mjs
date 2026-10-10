// Tạo ID và link mời cho danh sách khách, chạy ở máy bạn (không cần công thức Google Sheet).
//
//   npm run guests -- data/names.txt            mỗi dòng một tên gốc, ví dụ "A Thành", "C Oanh", "A Kiên(*)"
//   npm run guests -- data/names.txt --copy     chép luôn kết quả vào clipboard (macOS), rồi dán vào Sheet
//
// Tuỳ chọn: --base=https://wedding.hson.io.vn  --suffix=5  --no-expand  --no-header  --out=...  --state=...
// ID đã phát được nhớ trong data/guests-state.json: chạy lại không làm đổi ID của người đã có.
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { generate, toTsv } from './lib/guests-gen.mjs'

const args = process.argv.slice(2)
const flag = (n) => args.includes(`--${n}`)
const opt = (n, d) => args.find((a) => a.startsWith(`--${n}=`))?.split('=').slice(1).join('=') ?? d
const file = args.find((a) => !a.startsWith('--'))

if (!file) {
  console.error('Cách dùng: npm run guests -- data/names.txt [--copy] [--base=https://...]\n(mỗi dòng một tên gốc; dòng trống hoặc bắt đầu bằng # sẽ bị bỏ qua)')
  process.exit(1)
}
if (!fs.existsSync(file)) {
  console.error(`Không thấy tệp: ${file}`)
  process.exit(1)
}

const base = opt('base', process.env.SITE_URL || 'https://wedding.hson.io.vn')
const outFile = opt('out', 'data/guests-out.tsv')
const stateFile = opt('state', 'data/guests-state.json')
const suffixLength = Number(opt('suffix', 5))
if (!Number.isInteger(suffixLength) || suffixLength < 3 || suffixLength > 9) {
  console.error('--suffix phải là số nguyên từ 3 đến 9')
  process.exit(1)
}

const lines = fs.readFileSync(file, 'utf8').replace(/^﻿/, '').split(/\r?\n/)
let state = { ids: {} }
if (fs.existsSync(stateFile)) {
  try { state = JSON.parse(fs.readFileSync(stateFile, 'utf8')) } catch { console.error(`Tệp trạng thái hỏng: ${stateFile}. Xoá hoặc sửa nó rồi chạy lại.`); process.exit(1) }
}

const { rows, state: next } = generate(lines, { base, state, suffixLength, expand: !flag('no-expand') })
if (rows.length === 0) {
  console.error('Không có dòng tên nào để xử lý.')
  process.exit(1)
}

const tsv = toTsv(rows, { header: !flag('no-header') })
fs.mkdirSync(path.dirname(outFile), { recursive: true })
fs.mkdirSync(path.dirname(stateFile), { recursive: true })
fs.writeFileSync(outFile, tsv)
fs.writeFileSync(stateFile, JSON.stringify(next, null, 2) + '\n')

const fresh = rows.filter((r) => !r.reused).length
console.log(`${rows.length} khách: ${fresh} ID mới, ${rows.length - fresh} giữ nguyên ID cũ`)
console.log(`Ghi kết quả vào ${outFile} (và nhớ ID trong ${stateFile})\n`)
for (const r of rows.slice(0, 5)) console.log(`  ${r.id.padEnd(30)} ${r.name}${r.note ? '  ' + r.note : ''}`)
if (rows.length > 5) console.log(`  ... còn ${rows.length - 5} dòng`)
if (rows.some((r) => r.note)) console.log(`\n${rows.filter((r) => r.note).length} dòng có ký hiệu (*): ký hiệu đã được bỏ khỏi cột Name và để ở cột "Ghi chú".`)

if (flag('copy')) {
  const r = spawnSync('pbcopy', { input: tsv })
  console.log(r.error ? '\nKhông chép được vào clipboard (cần macOS). Mở tệp kết quả và copy thủ công.' : '\nĐã chép vào clipboard: mở Google Sheet, chọn ô A1 và dán (Cmd+V).')
} else {
  console.log(`\nMở ${outFile}, copy toàn bộ rồi dán vào Google Sheet (hoặc chạy lại với --copy).`)
}
