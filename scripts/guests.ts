// Tạo ID và link mời cho khách NGAY TRONG Google Sheet (tab "khách mời").
//
//   npm run guests                     xem trước: in ra sẽ làm gì, CHƯA ghi gì vào Sheet
//   npm run guests -- --apply          ghi thật (sao lưu trước, kiểm tra lại sau)
//   npm run guests -- --apply --clean-names   đồng thời sửa cột Name: "A Thành" -> "Anh Thành", bỏ (*)
//
// Luật an toàn: không bao giờ đổi một ID hợp lệ đã có (link có thể đã gửi cho khách); chỉ điền ô ID còn trống,
// thay ID không hợp lệ hoặc bị trùng. Tuỳ chọn: --tab="khách mời" --base=https://... --suffix=5 --no-expand
import fs from 'node:fs'
import path from 'node:path'
import { createFetchRequest, createTokenProvider } from '../server/google-auth.js'
import { readSheetsEnv } from '../server/sheets.js'
import { cleanName } from './lib/guests-gen.mjs'
import { applyChanges } from './lib/sheet-apply.mjs'
import { planFill } from './lib/sheet-plan.mjs'

const args = process.argv.slice(2)
const flag = (n: string) => args.includes(`--${n}`)
const opt = (n: string, d: string) => args.find((a) => a.startsWith(`--${n}=`))?.split('=').slice(1).join('=') ?? d

const env = readSheetsEnv(process.env as Record<string, string | undefined>)
const tab = opt('tab', env.guestTab)
const base = opt('base', process.env.SITE_URL || 'https://wedding.hson.io.vn')
const suffixLength = Number(opt('suffix', '5'))
const apply = flag('apply')
const cleanNames = flag('clean-names')
const expand = !flag('no-expand')
if (!Number.isInteger(suffixLength) || suffixLength < 3 || suffixLength > 9) {
  console.error('--suffix phải là số nguyên từ 3 đến 9')
  process.exit(1)
}

const request = createFetchRequest(createTokenProvider({ email: env.email, privateKey: env.privateKey }))
const SHEETS = 'https://sheets.googleapis.com/v4/spreadsheets'
const quoted = `'${tab.replace(/'/g, "''")}'`

const readGrid = async (render: 'FORMATTED_VALUE' | 'FORMULA' = 'FORMATTED_VALUE'): Promise<string[][]> => {
  const r = await request({ url: `${SHEETS}/${env.sheetId}/values/${encodeURIComponent(`${quoted}!A:Z`)}`, params: { valueRenderOption: render } })
  return (r.data?.values ?? []) as string[][]
}
const writeBatch = async (data: unknown[]) => {
  await request({ url: `${SHEETS}/${env.sheetId}/values:batchUpdate`, method: 'POST', data: { valueInputOption: 'RAW', data } })
}
const saveBackup = async (grid: string[][]) => {
  const file = path.join('data', `backup-${tab.replace(/\W+/g, '_')}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
  fs.mkdirSync('data', { recursive: true })
  fs.writeFileSync(file, JSON.stringify({ tab, savedAt: new Date().toISOString(), grid }, null, 2))
  return file
}

const grid = await readGrid()
const formulas = await readGrid('FORMULA') // để không bao giờ ghi đè ô đang là công thức
const planOptions = { base, suffixLength, cleanNames, expand, formulas }
const plan = planFill(grid, planOptions)
const s = plan.summary

console.log(`Tab "${tab}": ${s.total} khách có tên.`)
console.log(`  giữ nguyên ID cũ : ${s.kept}`)
console.log(`  ID mới (ô trống)  : ${s.newIds}`)
console.log(`  thay ID không hợp lệ: ${s.replacedInvalid} | thay ID trùng: ${s.replacedDuplicate}`)
console.log(`  ô Link được điền  : ${s.linksFilled}${plan.cols.link < 0 ? ' (tab chưa có cột "Link mời" hoặc "Link")' : ''}`)
if (s.linksSkippedFormula) console.log(`  ô Link là công thức: ${s.linksSkippedFormula} (giữ nguyên, không ghi đè)`)
if (cleanNames) console.log(`  tên được làm đẹp  : ${s.namesCleaned}${plan.cols.note < 0 ? ' (không có cột "Ghi chú": ký hiệu (*) sẽ bị bỏ, bản gốc còn trong tệp sao lưu)' : ''}`)

if (plan.problems.length) {
  console.log('\nCần chú ý:')
  for (const p of plan.problems.slice(0, 10)) console.log('  - ' + p)
  if (plan.problems.length > 10) console.log(`  ... và ${plan.problems.length - 10} mục khác`)
}

console.log('\nVí dụ các thay đổi:')
for (const c of plan.changes.slice(0, 8)) {
  const parts = []
  if (c.id) parts.push(`ID ${c.id.from ? `"${c.id.from}" -> ` : ''}${c.id.to}`)
  if (c.name) parts.push(`Name "${c.name.from}" -> "${c.name.to}"`)
  console.log(`  dòng ${String(c.row).padStart(3)}: ${parts.join(' | ') || 'chỉ điền Link'}`)
}
if (plan.changes.length > 8) console.log(`  ... còn ${plan.changes.length - 8} dòng`)

if (!cleanNames) {
  const hints = grid.slice(1).map((r) => String(r[plan.cols.name] ?? '')).filter((n) => n.trim() && cleanName(n, { expand }).name !== n).length
  if (hints > 0) console.log(`\nGợi ý: ${hints} tên có thể làm đẹp (ví dụ "A Thành" -> "Anh Thành"). Thêm --clean-names nếu muốn sửa cột Name luôn.`)
}

if (plan.changes.length === 0) {
  console.log('\nKhông có gì cần thay đổi.')
  process.exit(0)
}

if (!apply) {
  console.log('\nĐÂY CHỈ LÀ XEM TRƯỚC, chưa ghi gì vào Sheet. Hài lòng thì chạy lại với --apply.')
  process.exit(0)
}

try {
  const res = await applyChanges({ grid, plan, tab, saveBackup, readGrid: () => readGrid(), writeBatch })
  console.log(`\nĐã ghi ${res.written} ô vào Sheet và kiểm tra lại từng ô: khớp.`)
  console.log(`Bản sao lưu dữ liệu gốc: ${res.backup}`)
  console.log('Máy chủ cập nhật danh sách khách sau khoảng 20 giây.')
} catch (e) {
  console.error('\nLỖI: ' + (e instanceof Error ? e.message : e))
  process.exit(1)
}
