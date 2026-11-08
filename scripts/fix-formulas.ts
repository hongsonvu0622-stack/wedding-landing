// Sửa vùng tham chiếu RSVP trong công thức của file Google Sheet để không bị trượt khi có ai chèn dòng.
//
//   npm run fix:formulas            xem trước: in ra sẽ sửa gì, CHƯA ghi gì
//   npm run fix:formulas -- --apply ghi thật (sao lưu trước, kiểm tra lại sau)
//
// 'RSVP web'!$A$2:$A$3000  ->  'RSVP web'!$A$1:$A$3000  (vùng bắt đầu từ dòng tiêu đề). Chỉ đổi dòng bắt đầu, giá trị tính ra không đổi.
import fs from 'node:fs'
import path from 'node:path'
import { createFetchRequest, createTokenProvider } from '../server/google-auth.js'
import { readSheetsEnv } from '../server/sheets.js'
import { applyFormulaFix } from './lib/formula-apply.mjs'
import { planFormulaFix } from './lib/formula-fix.mjs'

const apply = process.argv.includes('--apply')
const env = readSheetsEnv(process.env as Record<string, string | undefined>)
const request = createFetchRequest(createTokenProvider({ email: env.email, privateKey: env.privateKey }))
const SHEETS = `https://sheets.googleapis.com/v4/spreadsheets/${env.sheetId}`

const meta = await request({ url: `${SHEETS}?fields=properties.title,sheets.properties.title` })
const tabs = meta.data.sheets.map((s: { properties: { title: string } }) => s.properties.title) as string[]

async function readAll(render: 'FORMULA' | 'FORMATTED_VALUE'): Promise<Record<string, unknown[][]>> {
  const out: Record<string, unknown[][]> = {}
  for (const tab of tabs) {
    const r = await request({
      url: `${SHEETS}/values/${encodeURIComponent(`'${tab.replace(/'/g, "''")}'!A1:Z1000`)}`,
      params: { valueRenderOption: render },
    })
    out[tab] = (r.data?.values ?? []) as unknown[][]
  }
  return out
}

const formulas = await readAll('FORMULA')
const plan = planFormulaFix(formulas)
console.log(`File "${meta.data.properties.title}": quét ${plan.scanned} công thức trong ${tabs.length} tab.`)
const perTab = new Map<string, number>()
for (const c of plan.changes) perTab.set(c.tab, (perTab.get(c.tab) ?? 0) + 1)
for (const [tab, n] of perTab) console.log(`  ${tab}: ${n} ô cần sửa`)
console.log(`Tổng cộng ${plan.total} ô cần sửa.`)
if (plan.total === 0) {
  console.log('\nKhông có gì cần sửa (vùng tham chiếu đã bắt đầu từ dòng tiêu đề).')
  process.exit(0)
}
const sample = plan.changes[0]
console.log(`\nVí dụ (${sample.tab}, dòng ${sample.row}):\n  TRƯỚC: ${sample.from.slice(0, 150)}...\n  SAU  : ${sample.to.slice(0, 150)}...`)
if (!apply) {
  console.log('\nĐÂY CHỈ LÀ XEM TRƯỚC, chưa ghi gì vào Sheet. Hài lòng thì chạy lại với --apply.')
  process.exit(0)
}

try {
  const res = await applyFormulaFix({
    plan,
    readFormulas: () => readAll('FORMULA'),
    readValues: () => readAll('FORMATTED_VALUE'),
    writeFormulas: async (data: unknown[]) => {
      await request({ url: `${SHEETS}/values:batchUpdate`, method: 'POST', data: { valueInputOption: 'USER_ENTERED', data } })
    },
    saveBackup: async (b: unknown) => {
      const file = path.join('data', `backup-formulas-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
      fs.mkdirSync('data', { recursive: true })
      fs.writeFileSync(file, JSON.stringify({ sheetId: env.sheetId, savedAt: new Date().toISOString(), ...(b as object) }))
      return file
    },
  })
  console.log(`\nĐã sửa ${res.written} ô. Đã đọc lại: công thức đúng như dự định và giá trị tính ra KHÔNG đổi.`)
  console.log(`Bản sao lưu công thức và giá trị gốc: ${res.backup}`)
} catch (e) {
  console.error('\nLỖI: ' + (e instanceof Error ? e.message : e))
  process.exit(1)
}
