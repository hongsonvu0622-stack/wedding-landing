// @vitest-environment node
import { looksLikeId } from '../../src/lib/guests'
import { ALPHABET } from './guests-gen.mjs'
import { colLetter, planFill, toBatch } from './sheet-plan.mjs'

const BASE = 'https://wedding.hson.io.vn'
const seq = (...vals) => { let i = 0; return () => vals[i++ % vals.length] }
const grid = (...rows) => [['ID', 'Name', 'Link mời'], ...rows]

describe('colLetter', () => {
  test('converts a zero-based column index to a Sheets letter', () => {
    expect([0, 1, 25, 26, 27, 51, 52].map(colLetter)).toEqual(['A', 'B', 'Z', 'AA', 'AB', 'AZ', 'BA'])
  })
})

describe('planFill: header handling', () => {
  test('finds columns by header name, ignoring case and spacing, and prefers "Link mời" over "Link"', () => {
    const g = [[' name ', 'link', 'Link mời', 'id', 'Ghi chú'], ['A Thành', '', '', '', '']]
    const { cols } = planFill(g, { base: BASE })
    expect(cols).toEqual({ id: 3, name: 0, link: 2, note: 4 })
  })
  test('uses "Link" when there is no "Link mời"', () => {
    expect(planFill([['ID', 'Name', 'Link'], ['', 'Hưng', '']], { base: BASE }).cols.link).toBe(2)
  })
  test('a missing ID or Name header is a clear error that lists what was found', () => {
    expect(() => planFill([['Mã', 'Tên']], { base: BASE })).toThrow(/ID.*Name|tiêu đề/i)
    expect(() => planFill([], { base: BASE })).toThrow()
  })
})

describe('planFill: which rows get an ID', () => {
  test('fills only empty IDs, numbers the sheet rows correctly, and builds the link', () => {
    const { changes } = planFill(grid(['', 'A Thành', ''], ['k7mq2xe4', 'Chị Lan', ''], ['', 'Hưng', '']), { base: BASE })
    const withId = changes.filter((c) => c.id)
    expect(withId.map((c) => c.row)).toEqual([2, 4])
    expect(withId[0].id.to).toMatch(/^anh-thanh-[a-z2-9]{5}$/)
    expect(withId[0].link).toBe(`${BASE}/${withId[0].id.to}`)
    expect(withId[0].id.from).toBe('')
  })

  test('never touches a valid ID that is already there (links may already be sent)', () => {
    const { changes } = planFill(grid(['abc123', 'A Minh', `${BASE}/abc123`], ['k7mq2xe4', 'Chị Lan', `${BASE}/k7mq2xe4`]), { base: BASE })
    expect(changes).toEqual([])
  })

  test('numeric IDs such as 123 are valid and kept', () => {
    expect(planFill(grid(['123', 'Ánh Nguyệt', `${BASE}/123`]), { base: BASE }).changes).toEqual([])
  })

  test('an ID with stray spaces around it is kept (the server trims it) and the link uses the trimmed ID', () => {
    const { changes } = planFill(grid([' abc123 ', 'A Minh', '']), { base: BASE })
    expect(changes).toEqual([{ row: 2, link: `${BASE}/abc123` }])
  })

  test('an invalid ID (spaces, diacritics) cannot work as a link, so it is replaced and reported', () => {
    const { changes, problems } = planFill(grid(['A Thành-2vhr9', 'A Thành', '']), { base: BASE })
    expect(changes[0].id.from).toBe('A Thành-2vhr9')
    expect(looksLikeId(changes[0].id.to)).toBe(true)
    expect(problems.some((p) => /không hợp lệ/i.test(p))).toBe(true)
  })

  test('a duplicate ID keeps the first row and re-issues the later ones', () => {
    const { changes, problems } = planFill(grid(['dup1', 'Một', ''], ['dup1', 'Hai', '']), { base: BASE })
    const idChanges = changes.filter((c) => c.id)
    expect(idChanges.map((c) => c.row)).toEqual([3])
    expect(problems.some((p) => /trùng/i.test(p))).toBe(true)
  })

  test('rows without a name are ignored', () => {
    expect(planFill(grid(['', '', ''], ['', '   ', ''], ['x1', '', '']), { base: BASE }).changes).toEqual([])
  })

  test('new IDs never collide with IDs already in the sheet or with each other', () => {
    const random = seq(0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2)
    const existing = `anh-minh-${ALPHABET[0].repeat(5)}`
    const { changes } = planFill(grid([existing, 'A Minh', `${BASE}/${existing}`], ['', 'A Minh', ''], ['', 'A Minh', '']), { base: BASE, random })
    const ids = changes.map((c) => c.id.to)
    expect(ids).toEqual([`anh-minh-${ALPHABET[1].repeat(5)}`, `anh-minh-${ALPHABET[2].repeat(5)}`])
  })

  test('the slug comes from the cleaned name even when Name itself is left alone', () => {
    const { changes } = planFill(grid(['', 'C Oanh', '']), { base: BASE })
    expect(changes[0].id.to.startsWith('chi-oanh-')).toBe(true)
    expect(changes[0].name).toBeUndefined()
  })
})

describe('planFill: links and names', () => {
  test('fills an empty Link cell for kept IDs but never overwrites an existing link', () => {
    const { changes } = planFill(grid(['abc123', 'A', ''], ['def456', 'B', 'https://other.example/def456']), { base: BASE })
    expect(changes).toEqual([{ row: 2, link: `${BASE}/abc123` }])
  })
  test('with no link column at all, only IDs are planned', () => {
    const { changes, cols } = planFill([['ID', 'Name'], ['', 'Hưng']], { base: BASE })
    expect(cols.link).toBe(-1)
    expect(changes[0].link).toBeUndefined()
  })
  test('cleanNames rewrites Name (A/C expansion, (*) removed) and moves the marker to Ghi chú', () => {
    const g = [['ID', 'Name', 'Link mời', 'Ghi chú'], ['x1', 'A Kiên(*)', `${BASE}/x1`, ''], ['x2', 'Hưng', `${BASE}/x2`, '']]
    const { changes } = planFill(g, { base: BASE, cleanNames: true })
    expect(changes).toEqual([{ row: 2, name: { from: 'A Kiên(*)', to: 'Anh Kiên' }, note: '(*)' }])
  })
  test('without cleanNames the Name column is never changed', () => {
    const { changes } = planFill(grid(['x1', 'A Kiên(*)', `${BASE}/x1`]), { base: BASE })
    expect(changes).toEqual([])
  })
  test('cleanNames does not clobber a Ghi chú that already has text', () => {
    const g = [['ID', 'Name', 'Ghi chú'], ['x1', 'A Kiên(*)', 'bạn cô dâu']]
    const { changes } = planFill(g, { base: BASE, cleanNames: true })
    expect(changes[0].note).toBeUndefined()
  })
})

describe('planFill is idempotent', () => {
  test('applying the plan and planning again yields no further changes', () => {
    const g = [['ID', 'Name', 'Link mời'], ['', 'A Thành', ''], ['dup', 'X', ''], ['dup', 'Y', ''], ['Bad Id', 'Z', '']]
    const first = planFill(g, { base: BASE })
    const applied = g.map((r) => [...r])
    for (const c of first.changes) {
      if (c.id) applied[c.row - 1][first.cols.id] = c.id.to
      if (c.link) applied[c.row - 1][first.cols.link] = c.link
    }
    expect(planFill(applied, { base: BASE }).changes).toEqual([])
  })
})

describe('toBatch', () => {
  test('emits only the changed cells, as quoted A1 ranges', () => {
    const { changes, cols } = planFill([['ID', 'Name', 'Link mời'], ['', 'Hưng', '']], { base: BASE })
    const data = toBatch(changes, cols, 'khách mời')
    expect(data.map((d) => d.range)).toEqual(["'khách mời'!A2", "'khách mời'!C2"])
    expect(data[0].values[0][0]).toBe(changes[0].id.to)
    expect(data[1].values[0][0]).toBe(changes[0].link)
  })
  test('escapes a single quote in the tab name', () => {
    const { changes, cols } = planFill([['ID', 'Name'], ['', 'A']], { base: BASE })
    expect(toBatch(changes, cols, "khách 'mời'")[0].range).toBe("'khách ''mời'''!A2")
  })
  test('writes name and note cells when planned', () => {
    const g = [['ID', 'Name', 'Ghi chú'], ['x1', 'A Kiên(*)', '']]
    const { changes, cols } = planFill(g, { base: BASE, cleanNames: true })
    const data = toBatch(changes, cols, 'T')
    expect(data.map((d) => [d.range, d.values[0][0]])).toEqual([["'T'!B2", 'Anh Kiên'], ["'T'!C2", '(*)']])
  })
})

describe('planFill never overwrites a cell that holds a formula', () => {
  // `formulas` là cùng bảng nhưng đọc ở chế độ công thức: ô công thức bắt đầu bằng "=".
  const values = [['ID', 'Name', 'Link', 'Link mời', 'Ghi chú'], ['', 'A Kiên(*)', '', `${BASE}/`, ''], ['k1', 'C Oanh', '', `${BASE}/k1`, '']]
  const formulas = [['ID', 'Name', 'Link', 'Link mời', 'Ghi chú'], ['', 'A Kiên(*)', '', '="https://wedding.hson.io.vn/"&A2', ''], ['k1', 'C Oanh', '', '="https://wedding.hson.io.vn/"&A3', '']]

  test('a formula in the link column is left alone even when a new ID is issued', () => {
    const { changes, summary } = planFill(values, { base: BASE, formulas })
    expect(changes).toHaveLength(1)
    expect(changes[0].id.to.startsWith('anh-kien-')).toBe(true)
    expect(changes[0].link).toBeUndefined()
    expect(summary.linksFilled).toBe(0)
    expect(summary.linksSkippedFormula).toBe(2) // cả hai dòng mẫu đều có Link là công thức
  })

  test('toBatch therefore writes the ID cell only', () => {
    const { changes, cols } = planFill(values, { base: BASE, formulas })
    expect(toBatch(changes, cols, 'T').map((d) => d.range)).toEqual(["'T'!A2"])
  })

  test('without the formulas grid the same link cell would be rewritten (this is what the guard prevents)', () => {
    expect(planFill(values, { base: BASE }).changes[0].link).toBeDefined()
  })

  test('an ID cell that is a formula is never overwritten; the user is told why', () => {
    const f = [['ID', 'Name'], ['=RANDARRAY(1)', 'A Minh']]
    const v = [['ID', 'Name'], ['', 'A Minh']]
    const { changes, problems } = planFill(v, { base: BASE, formulas: f })
    expect(changes).toEqual([])
    expect(problems.some((p) => /công thức/.test(p))).toBe(true)
  })

  test('a Name or Ghi chú formula is not rewritten by cleanNames', () => {
    const f = [['ID', 'Name', 'Ghi chú'], ['x1', '=B9', '=C9']]
    const v = [['ID', 'Name', 'Ghi chú'], ['x1', 'A Kiên(*)', '']]
    expect(planFill(v, { base: BASE, cleanNames: true, formulas: f }).changes).toEqual([])
  })

  test('plain cells still work normally when a formulas grid is supplied', () => {
    const f = [['ID', 'Name', 'Link mời'], ['', 'Hưng', '']]
    const { changes } = planFill(f, { base: BASE, formulas: f })
    expect(changes[0].id.to.startsWith('hung-')).toBe(true)
    expect(changes[0].link).toBe(`${BASE}/${changes[0].id.to}`)
  })
})
