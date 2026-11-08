// @vitest-environment node
import { colLetter } from './sheet-plan.mjs'
import { planFormulaFix, toFormulaBatch, widenRsvpRanges } from './formula-fix.mjs'

// Công thức thật lấy từ cột "Xác nhận (web)" của tab Nhà gái.
const REAL_L = `=IF($I6="";"";IFERROR(IF(INDEX('RSVP web'!$B$2:$B$3000;MATCH($I6;'RSVP web'!$A$2:$A$3000;0))="";"";INDEX('RSVP web'!$B$2:$B$3000;MATCH($I6;'RSVP web'!$A$2:$A$3000;0)));""))`

describe('widenRsvpRanges', () => {
  test('moves the start of every RSVP web range from row 2 up to row 1 (the header row), keeping the end row', () => {
    const r = widenRsvpRanges(REAL_L)
    expect(r.formula).toBe(REAL_L.replaceAll('$2:', '$1:'))
    expect(r.formula).toContain("'RSVP web'!$B$1:$B$3000")
    expect(r.formula).toContain("'RSVP web'!$A$1:$A$3000")
    expect(r.changed).toBe(4)
  })

  test('INDEX and MATCH ranges still start on the same row, so the row positions keep lining up', () => {
    const f = widenRsvpRanges(REAL_L).formula
    const starts = [...f.matchAll(/'RSVP web'!\$[A-Z]\$(\d+):/g)].map((m) => m[1])
    expect(new Set(starts)).toEqual(new Set(['1']))
  })

  test('is idempotent: a formula that was already fixed is left untouched', () => {
    const once = widenRsvpRanges(REAL_L).formula
    const twice = widenRsvpRanges(once)
    expect(twice.formula).toBe(once)
    expect(twice.changed).toBe(0)
  })

  test('does not touch ranges on other tabs, other start rows, or references that are not ranges', () => {
    const f = `=INDEX('Nhà gái'!$I$6:$I$1000;1)&INDEX('RSVP web'!$B$4:$B$3002;1)&'RSVP web'!$A$2&'RSVP web'!$A$3:$A$9`
    expect(widenRsvpRanges(f)).toEqual({ formula: f, changed: 0 })
  })

  test('handles ranges written without dollar signs and other columns', () => {
    expect(widenRsvpRanges("=MATCH(A1;'RSVP web'!A2:A3000;0)").formula).toBe("=MATCH(A1;'RSVP web'!A1:A3000;0)")
    expect(widenRsvpRanges("=SUM('RSVP web'!$C$2:$C$3000)").formula).toBe("=SUM('RSVP web'!$C$1:$C$3000)")
  })

  test('also protects the RSVP log tab if a formula ever reads it', () => {
    expect(widenRsvpRanges("=COUNTA('RSVP log'!$B$2:$B$5000)").formula).toBe("=COUNTA('RSVP log'!$B$1:$B$5000)")
  })

  test('text that merely looks like a range is not a formula and is left alone', () => {
    const t = "Xem 'RSVP web'!$A$2:$A$3000"
    expect(widenRsvpRanges(t)).toEqual({ formula: t, changed: 0 })
  })
})

describe('planFormulaFix', () => {
  const grids = {
    'Nhà gái': [['STT', 'x'], ['1', REAL_L], ['2', 'văn bản'], ['3', "=A2+1"]],
    'RSVP web': [['Mã thiệp'], ['abc']],
  }
  test('lists only the cells that change, with 1-based rows and the column letter', () => {
    const { changes, total } = planFormulaFix(grids)
    expect(total).toBe(1)
    expect(changes).toHaveLength(1)
    expect(changes[0]).toMatchObject({ tab: 'Nhà gái', row: 2, col: 1, from: REAL_L })
    expect(changes[0].to).toBe(widenRsvpRanges(REAL_L).formula)
  })
  test('static cells, headers and other formulas are never part of the plan', () => {
    const { changes } = planFormulaFix({ T: [['=SUM(B2:B9)', 'text', 5, null, undefined]] })
    expect(changes).toEqual([])
  })
  test('planning on the repaired grid finds nothing more to do', () => {
    const { changes } = planFormulaFix(grids)
    const fixed = JSON.parse(JSON.stringify(grids))
    for (const c of changes) fixed[c.tab][c.row - 1][c.col] = c.to
    expect(planFormulaFix(fixed).changes).toEqual([])
  })
})

describe('toFormulaBatch', () => {
  test('one quoted A1 cell per change, carrying the new formula text', () => {
    const { changes } = planFormulaFix({ "Nhà 'gái'": [['', REAL_L]] })
    const data = toFormulaBatch(changes, colLetter)
    expect(data).toEqual([{ range: "'Nhà ''gái'''!B1", values: [[widenRsvpRanges(REAL_L).formula]] }])
  })
})
