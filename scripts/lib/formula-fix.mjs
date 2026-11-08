// Công thức trong tab khách đọc 'RSVP web'!$A$2:$A$3000. Vùng bắt đầu ngay dưới tiêu đề nên hễ có ai chèn một dòng
// vào đó (Apps Script cũ, người sửa tay, hay lệnh ghi dùng INSERT_ROWS) thì cả vùng trượt xuống ($A$4:$A$3002) và
// các câu trả lời rơi ra ngoài vùng. Cho vùng bắt đầu từ dòng 1 (dòng tiêu đề): chèn dòng ở dưới tiêu đề chỉ làm vùng giãn ra.
const RANGE = /('RSVP (?:web|log)'!)(\$?[A-Z]{1,3})(\$?)2:(\$?[A-Z]{1,3})(\$?)(\d+)/g

export function widenRsvpRanges(text) {
  const s = String(text ?? '')
  if (!s.trimStart().startsWith('=')) return { formula: s, changed: 0 }
  let changed = 0
  const formula = s.replace(RANGE, (_m, sheet, c1, d1, c2, d2, end) => {
    changed++
    return `${sheet}${c1}${d1}1:${c2}${d2}${end}`
  })
  return { formula, changed }
}

// grids: { tên tab: bảng công thức (đọc ở chế độ FORMULA) }. Trả về các ô cần đổi.
export function planFormulaFix(grids) {
  const changes = []
  let scanned = 0
  for (const [tab, grid] of Object.entries(grids)) {
    grid.forEach((row, r) => {
      row.forEach((cell, col) => {
        const from = String(cell ?? '')
        if (!from.startsWith('=')) return
        scanned++
        const { formula, changed } = widenRsvpRanges(from)
        if (changed > 0) changes.push({ tab, row: r + 1, col, from, to: formula })
      })
    })
  }
  return { changes, total: changes.length, scanned }
}

// Mỗi ô một vùng A1 (không ghi đè ô lân cận, không làm đổi kiểu dữ liệu của ô tĩnh).
export function toFormulaBatch(changes, colLetter) {
  return changes.map((c) => ({
    range: `'${c.tab.replace(/'/g, "''")}'!${colLetter(c.col)}${c.row}`,
    values: [[c.to]],
  }))
}
