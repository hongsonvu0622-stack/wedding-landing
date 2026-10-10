import { cleanName, makeId } from './guests-gen.mjs'

// Cùng luật với máy chủ: chữ, số, "-" và "_", tối đa 40 ký tự.
const VALID_ID = /^[A-Za-z0-9_-]{1,40}$/
const norm = (h) => String(h ?? '').trim().toLowerCase()

export function colLetter(i) {
  let n = i + 1
  let s = ''
  while (n > 0) {
    const r = (n - 1) % 26
    s = String.fromCharCode(65 + r) + s
    n = Math.floor((n - 1) / 26)
  }
  return s
}

function findCols(header) {
  const h = header.map(norm)
  const id = h.indexOf('id')
  const name = h.indexOf('name')
  if (id < 0 || name < 0) {
    throw new Error(`Không thấy cột "ID" và "Name" ở dòng tiêu đề. Các cột đang có: ${header.map((x) => `"${x}"`).join(', ') || '(trống)'}`)
  }
  let link = h.indexOf('link mời')
  if (link < 0) link = h.indexOf('link')
  return { id, name, link, note: h.indexOf('ghi chú') }
}

// grid: toàn bộ tab (mảng các dòng), dòng 1 là tiêu đề. Trả về kế hoạch thay đổi, KHÔNG ghi gì cả.
// formulas: (tuỳ chọn) cùng bảng đọc ở chế độ công thức; ô nào bắt đầu bằng "=" sẽ KHÔNG bao giờ bị ghi đè.
export function planFill(grid, { base, suffixLength = 5, cleanNames = false, expand = true, random, formulas } = {}) {
  if (!grid || grid.length === 0) throw new Error('Tab trống: không có dòng tiêu đề')
  const cols = findCols(grid[0])
  const root = String(base ?? '').replace(/\/+$/, '')
  const cell = (r, c) => (c >= 0 ? String(r[c] ?? '') : '')
  const isFormula = (row, c) => c >= 0 && String(formulas?.[row - 1]?.[c] ?? '').trim().startsWith('=')
  const body = grid.slice(1)

  // ID hợp lệ hiện có: giữ nguyên, tránh trùng, và nhớ dòng đầu tiên của mỗi ID.
  const used = new Set()
  const firstRow = new Map()
  body.forEach((r, i) => {
    const id = cell(r, cols.id).trim()
    if (VALID_ID.test(id)) {
      used.add(id)
      if (!firstRow.has(id)) firstRow.set(id, i + 2)
    }
  })

  const changes = []
  const problems = []
  const summary = { total: 0, kept: 0, newIds: 0, replacedInvalid: 0, replacedDuplicate: 0, linksFilled: 0, linksSkippedFormula: 0, namesCleaned: 0 }

  body.forEach((r, i) => {
    const row = i + 2
    const rawName = cell(r, cols.name)
    if (!rawName.trim()) return
    summary.total++
    const curId = cell(r, cols.id).trim()
    if (isFormula(row, cols.id)) {
      problems.push(`Dòng ${row}: ô ID đang là công thức nên KHÔNG bị ghi đè (công thức ngẫu nhiên đổi giá trị mỗi lần Sheet tính lại). Xoá công thức nếu muốn script cấp ID.`)
      return
    }
    const ch = { row }
    let finalId = curId
    let issued = false

    if (!curId) {
      issued = true
    } else if (!VALID_ID.test(curId)) {
      issued = true
      summary.replacedInvalid++
      problems.push(`Dòng ${row}: ID "${curId}" không hợp lệ (chỉ được chữ không dấu, số, - và _), sẽ cấp ID mới.`)
    } else if (firstRow.get(curId) !== row) {
      issued = true
      summary.replacedDuplicate++
      problems.push(`Dòng ${row}: ID "${curId}" trùng với dòng ${firstRow.get(curId)}, dòng ${row} sẽ được cấp ID mới.`)
    }

    const cleaned = cleanName(rawName, { expand })
    if (issued) {
      finalId = makeId(cleaned.name, { used, suffixLength, random })
      ch.id = { from: cell(r, cols.id), to: finalId }
      if (!curId) summary.newIds++
    } else {
      summary.kept++
    }

    if (cols.link >= 0 && isFormula(row, cols.link)) {
      summary.linksSkippedFormula++
    } else if (cols.link >= 0 && (issued || !cell(r, cols.link).trim())) {
      ch.link = `${root}/${finalId}`
      summary.linksFilled++
    }

    if (cleanNames) {
      if (cleaned.name !== rawName && !isFormula(row, cols.name)) {
        ch.name = { from: rawName, to: cleaned.name }
        summary.namesCleaned++
      }
      if (cleaned.note && cols.note >= 0 && !isFormula(row, cols.note) && !cell(r, cols.note).trim()) ch.note = cleaned.note
    }

    if (Object.keys(ch).length > 1) changes.push(ch)
  })

  return { cols, changes, problems, summary }
}

// Chỉ những ô thay đổi, dạng A1 có dấu nháy quanh tên tab.
export function toBatch(changes, cols, tab) {
  const q = `'${String(tab).replace(/'/g, "''")}'`
  const out = []
  const put = (col, row, value) => out.push({ range: `${q}!${colLetter(col)}${row}`, values: [[value]] })
  for (const c of changes) {
    if (c.id) put(cols.id, c.row, c.id.to)
    if (c.link && cols.link >= 0) put(cols.link, c.row, c.link)
    if (c.name) put(cols.name, c.row, c.name.to)
    if (c.note && cols.note >= 0) put(cols.note, c.row, c.note)
  }
  return out
}
