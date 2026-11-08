import { colLetter } from './sheet-plan.mjs'
import { toFormulaBatch } from './formula-fix.mjs'

const CHUNK = 300
const cell = (grids, tab, row, col) => String(grids[tab]?.[row - 1]?.[col] ?? '')

// Ghi kế hoạch sửa công thức một cách an toàn:
//  1. đọc lại và dừng nếu ô cần sửa vừa bị người khác đổi;  2. sao lưu công thức và giá trị gốc TRƯỚC khi ghi;
//  3. ghi từng lô;  4. đọc lại: công thức đúng như dự định VÀ giá trị tính ra không đổi so với trước.
export async function applyFormulaFix({ plan, readFormulas, readValues, writeFormulas, saveBackup, chunk = CHUNK }) {
  if (plan.changes.length === 0) return { written: 0, backup: null }

  const beforeFormulas = await readFormulas()
  const beforeValues = await readValues()
  for (const c of plan.changes) {
    if (cell(beforeFormulas, c.tab, c.row, c.col) !== c.from) {
      throw new Error(`Ô ${c.tab}!${colLetter(c.col)}${c.row} đã bị sửa kể từ lúc lập kế hoạch, nên CHƯA GHI gì cả. Hãy chạy lại.`)
    }
  }
  const backup = await saveBackup({ formulas: beforeFormulas, values: beforeValues })

  const data = toFormulaBatch(plan.changes, colLetter)
  let written = 0
  for (let i = 0; i < data.length; i += chunk) {
    const part = data.slice(i, i + chunk)
    try {
      await writeFormulas(part)
    } catch (e) {
      throw new Error(`Ghi dở dang: đã ghi ${written}/${data.length} ô, rồi lỗi: ${e instanceof Error ? e.message : e}. Bản sao lưu ở ${backup}`)
    }
    written += part.length
  }

  const afterFormulas = await readFormulas()
  for (const c of plan.changes) {
    if (cell(afterFormulas, c.tab, c.row, c.col) !== c.to) {
      throw new Error(`Kiểm tra sau khi ghi không khớp ở ${c.tab}!${colLetter(c.col)}${c.row}. Bản sao lưu ở ${backup}`)
    }
  }
  const afterValues = await readValues()
  const tabs = [...new Set(plan.changes.map((c) => c.tab))]
  for (const t of tabs) {
    if (JSON.stringify(afterValues[t]) !== JSON.stringify(beforeValues[t])) {
      throw new Error(`Sau khi sửa, giá trị tính ra của tab "${t}" đã thay đổi (không khớp với trước khi sửa). Bản sao lưu ở ${backup}`)
    }
  }
  return { written, backup }
}
