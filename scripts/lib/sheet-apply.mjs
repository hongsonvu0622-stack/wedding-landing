import { toBatch } from './sheet-plan.mjs'

const CHUNK = 100
const str = (v) => String(v ?? '')
const cellOf = (grid, row, col) => str(grid[row - 1]?.[col])

// Chỉ cột ID và Name quyết định ai nhận ID nào: nếu chúng đổi giữa lúc đọc và lúc ghi thì dừng.
const fingerprint = (grid, cols) => JSON.stringify(grid.slice(1).map((r) => [str(r[cols.id]).trim(), str(r[cols.name]).trim()]))

// Ghi kế hoạch vào Sheet một cách an toàn:
//  1. sao lưu bản gốc TRƯỚC khi ghi;  2. đọc lại, nếu Sheet vừa bị sửa thì dừng, chưa ghi gì;
//  3. ghi từng lô tối đa 100 ô;       4. đọc lại và kiểm tra từng ô đã ghi.
export async function applyChanges({ grid, plan, tab, saveBackup, readGrid, writeBatch, chunk = CHUNK }) {
  const data = toBatch(plan.changes, plan.cols, tab)
  if (data.length === 0) return { written: 0, backup: null }

  const backup = await saveBackup(grid)

  const fresh = await readGrid()
  if (fingerprint(fresh, plan.cols) !== fingerprint(grid, plan.cols)) {
    throw new Error('Sheet đã bị sửa (cột ID hoặc Name) kể từ lúc đọc, nên CHƯA GHI gì cả. Hãy chạy lại để lập kế hoạch mới.')
  }

  let written = 0
  for (let i = 0; i < data.length; i += chunk) {
    const part = data.slice(i, i + chunk)
    try {
      await writeBatch(part)
    } catch (e) {
      throw new Error(`Ghi dở dang: đã ghi ${written}/${data.length} ô, rồi lỗi: ${e instanceof Error ? e.message : e}. Bản sao lưu ở ${backup}`)
    }
    written += part.length
  }

  const after = await readGrid()
  const c = plan.cols
  for (const ch of plan.changes) {
    const bad =
      (ch.id && cellOf(after, ch.row, c.id) !== ch.id.to && 'ID') ||
      (ch.link && c.link >= 0 && cellOf(after, ch.row, c.link) !== ch.link && 'Link') ||
      (ch.name && cellOf(after, ch.row, c.name) !== ch.name.to && 'Name') ||
      (ch.note && c.note >= 0 && cellOf(after, ch.row, c.note) !== ch.note && 'Ghi chú')
    if (bad) throw new Error(`Kiểm tra sau khi ghi không khớp ở dòng ${ch.row} (cột ${bad}). Bản sao lưu ở ${backup}`)
  }
  return { written, backup }
}
