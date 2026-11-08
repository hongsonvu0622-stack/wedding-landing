// @vitest-environment node
import { colLetter } from './sheet-plan.mjs'
import { planFormulaFix } from './formula-fix.mjs'
import { applyFormulaFix } from './formula-apply.mjs'

const F = (c) => `=INDEX('RSVP web'!$B$2:$B$3000;MATCH($I${c};'RSVP web'!$A$2:$A$3000;0))`
const colNum = (l) => [...l].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1

function fakeBook() {
  const state = {
    formulas: { 'Nhà gái': [['STT', 'Xác nhận'], ['1', F(6)], ['2', F(7)], ['3', 'văn bản']], 'Nhà trai': [['STT', 'Xác nhận'], ['1', F(6)]] },
    values: { 'Nhà gái': [['STT', 'Xác nhận'], ['1', ''], ['2', ''], ['3', 'văn bản']], 'Nhà trai': [['STT', 'Xác nhận'], ['1', '']] },
    writes: [], mutate: null, failAt: null,
  }
  const api = {
    readFormulas: async () => JSON.parse(JSON.stringify(state.formulas)),
    readValues: async () => JSON.parse(JSON.stringify(state.values)),
    writeFormulas: async (data) => {
      if (state.failAt !== null && state.writes.length >= state.failAt) throw new Error('quota')
      state.writes.push(data)
      for (const d of data) {
        const m = /^'((?:[^']|'')*)'!([A-Z]+)(\d+)$/.exec(d.range)
        const tab = m[1].replace(/''/g, "'"); state.formulas[tab][Number(m[2] ? m[3] : 0) - 1][colNum(m[2])] = d.values[0][0]
      }
      state.mutate?.(state)
    },
  }
  return { state, api }
}
const backups = () => { const saved = []; return { saved, saveBackup: async (b) => { saved.push(b); return 'data/backup-formulas-test.json' } } }
const planOf = (state) => planFormulaFix(state.formulas)

test('writes only the changed cells and leaves static cells and other tabs untouched', async () => {
  const { state, api } = fakeBook(); const b = backups()
  const res = await applyFormulaFix({ plan: planOf(state), saveBackup: b.saveBackup, ...api })
  expect(res.written).toBe(3)
  expect(state.formulas['Nhà gái'][1][1]).toContain("'RSVP web'!$B$1:$B$3000")
  expect(state.formulas['Nhà gái'][3][1]).toBe('văn bản')
  expect(state.formulas['Nhà trai'][1][1]).toContain("$A$1:$A$3000")
  expect(state.writes.flat().every((d) => /^'[^']+'![A-Z]+\d+$/.test(d.range))).toBe(true)
})

test('the backup holds the original formulas and values and is saved BEFORE the first write', async () => {
  const { state, api } = fakeBook(); const order = []
  const original = JSON.parse(JSON.stringify(state.formulas))
  const wrapped = { ...api, writeFormulas: async (d) => { order.push('write'); return api.writeFormulas(d) } }
  await applyFormulaFix({ plan: planOf(state), saveBackup: async (b) => { order.push('backup'); expect(b.formulas).toEqual(original); expect(b.values).toBeDefined(); return 'b.json' }, ...wrapped })
  expect(order[0]).toBe('backup')
})

test('nothing to fix means no backup, no write, no error', async () => {
  const { state, api } = fakeBook(); const b = backups()
  const plan = planOf(state)
  await applyFormulaFix({ plan, saveBackup: b.saveBackup, ...api })
  const res = await applyFormulaFix({ plan: planOf(state), saveBackup: b.saveBackup, ...api })
  expect(res).toEqual({ written: 0, backup: null })
  expect(b.saved).toHaveLength(1)
})

test('aborts without writing if a planned cell was edited by someone since it was read', async () => {
  const { state, api } = fakeBook(); const b = backups()
  const plan = planOf(state)
  state.formulas['Nhà gái'][1][1] = '=1+1' // sửa tay giữa chừng
  await expect(applyFormulaFix({ plan, saveBackup: b.saveBackup, ...api })).rejects.toThrow(/đã bị sửa|chưa ghi/i)
  expect(state.writes).toHaveLength(0)
})

test('writes in batches of at most the chunk size', async () => {
  const { state, api } = fakeBook()
  state.formulas['Nhà gái'] = [['STT', 'X'], ...Array.from({ length: 700 }, (_, i) => [String(i), F(i + 6)])]
  state.values['Nhà gái'] = state.formulas['Nhà gái'].map((r) => r.map(() => ''))
  await applyFormulaFix({ plan: planOf(state), saveBackup: backups().saveBackup, chunk: 300, ...api })
  // 700 công thức ở Nhà gái + 1 ở Nhà trai = 701 ô
  expect(state.writes.map((w) => w.length)).toEqual([300, 300, 101])
  expect(state.writes.flat()).toHaveLength(701)
})

test('a write failure half way reports the progress and where the backup is', async () => {
  const { state, api } = fakeBook()
  state.formulas['Nhà gái'] = [['STT', 'X'], ...Array.from({ length: 700 }, (_, i) => [String(i), F(i + 6)])]
  state.values['Nhà gái'] = state.formulas['Nhà gái'].map((r) => r.map(() => ''))
  state.failAt = 1
  await expect(applyFormulaFix({ plan: planOf(state), saveBackup: backups().saveBackup, chunk: 300, ...api })).rejects.toThrow(/dở dang[\s\S]*300\/701[\s\S]*backup-formulas-test\.json/i)
})

test('if the computed values change after the repair it says so instead of claiming success', async () => {
  const { state, api } = fakeBook()
  state.mutate = (s) => { s.values['Nhà gái'][1][1] = 'Tham dự' }
  await expect(applyFormulaFix({ plan: planOf(state), saveBackup: backups().saveBackup, ...api })).rejects.toThrow(/giá trị.*thay đổi|không khớp/i)
})

test('if a written formula does not read back as planned it reports a mismatch', async () => {
  const { state, api } = fakeBook()
  state.mutate = (s) => { s.formulas['Nhà gái'][2][1] = '=0' }
  await expect(applyFormulaFix({ plan: planOf(state), saveBackup: backups().saveBackup, ...api })).rejects.toThrow(/không khớp|kiểm tra/i)
})
