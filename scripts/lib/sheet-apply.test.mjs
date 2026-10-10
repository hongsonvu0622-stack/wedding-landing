// @vitest-environment node
import { planFill } from './sheet-plan.mjs'
import { applyChanges } from './sheet-apply.mjs'

const BASE = 'https://wedding.hson.io.vn'
const TAB = 'khách mời'
const colNum = (letters) => [...letters].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1

// Một "Google Sheet" trong bộ nhớ.
function fakeSheet(initial) {
  const state = { grid: initial.map((r) => [...r]), writes: [], reads: 0, onRead: null, failOnWrite: null }
  const api = {
    readGrid: async () => { state.reads++; state.onRead?.(state); return state.grid.map((r) => [...r]) },
    writeBatch: async (data) => {
      if (state.failOnWrite !== null && state.writes.length >= state.failOnWrite) throw new Error('quota exceeded')
      state.writes.push(data)
      for (const d of data) {
        const m = /!([A-Z]+)(\d+)$/.exec(d.range)
        const c = colNum(m[1]); const r = Number(m[2]) - 1
        while (state.grid.length <= r) state.grid.push([])
        while (state.grid[r].length <= c) state.grid[r].push('')
        state.grid[r][c] = d.values[0][0]
      }
    },
  }
  return { state, api }
}
const makeBackup = () => { const saved = []; return { saved, saveBackup: async (g) => { saved.push(JSON.parse(JSON.stringify(g))); return 'data/backup-test.json' } } }
const base = [['ID', 'Name', 'Link mời'], ['', 'A Thành', ''], ['keep1', 'C Oanh', `${BASE}/keep1`], ['', 'Hưng', '']]

async function run(sheet, extra = {}) {
  const grid = await sheet.api.readGrid()
  const plan = planFill(grid, { base: BASE })
  const b = makeBackup()
  const res = await applyChanges({ grid, plan, tab: TAB, planOptions: { base: BASE }, saveBackup: b.saveBackup, ...sheet.api, ...extra })
  return { res, plan, b }
}

test('writes only the planned cells and leaves existing valid IDs alone', async () => {
  const s = fakeSheet(base)
  const { res, plan } = await run(s)
  expect(res.written).toBe(plan.changes.reduce((n, c) => n + (c.id ? 1 : 0) + (c.link ? 1 : 0), 0))
  expect(s.state.grid[2]).toEqual(['keep1', 'C Oanh', `${BASE}/keep1`])
  expect(s.state.grid[1][0]).toMatch(/^anh-thanh-/)
  expect(s.state.grid[1][2]).toBe(`${BASE}/${s.state.grid[1][0]}`)
})

test('the backup is saved BEFORE the first write and holds the original data', async () => {
  const s = fakeSheet(base)
  const order = []
  const orig = s.api.writeBatch
  s.api.writeBatch = async (d) => { order.push('write'); return orig(d) }
  const grid = await s.api.readGrid()
  const plan = planFill(grid, { base: BASE })
  await applyChanges({ grid, plan, tab: TAB, planOptions: { base: BASE }, saveBackup: async (g) => { order.push('backup'); expect(g).toEqual(base); return 'b.json' }, ...s.api })
  expect(order[0]).toBe('backup')
  expect(order).toContain('write')
})

test('nothing planned means no backup, no write and no error', async () => {
  const s = fakeSheet([['ID', 'Name', 'Link mời'], ['k1', 'A', `${BASE}/k1`]])
  const { res, b } = await run(s)
  expect(res).toEqual({ written: 0, backup: null })
  expect(s.state.writes).toHaveLength(0)
  expect(b.saved).toHaveLength(0)
})

test('aborts without writing if someone edited an ID or Name since the sheet was read', async () => {
  const s = fakeSheet(base)
  const grid = await s.api.readGrid()
  const plan = planFill(grid, { base: BASE })
  s.state.grid[3][1] = 'Hưng (đã sửa)' // an edit made by someone else while we were planning
  await expect(applyChanges({ grid, plan, tab: TAB, planOptions: { base: BASE }, saveBackup: async () => 'b.json', ...s.api })).rejects.toThrow(/đã bị sửa|chưa ghi/i)
  expect(s.state.writes).toHaveLength(0)
})

test('writes in batches of at most 100 cells', async () => {
  const many = [['ID', 'Name', 'Link mời'], ...Array.from({ length: 130 }, (_, i) => ['', `Khách ${i}`, ''])]
  const s = fakeSheet(many)
  await run(s)
  expect(s.state.writes.length).toBeGreaterThan(1)
  for (const w of s.state.writes) expect(w.length).toBeLessThanOrEqual(100)
  expect(s.state.writes.flat()).toHaveLength(260)
})

test('a write failure mid-way reports how far it got and where the backup is', async () => {
  const many = [['ID', 'Name', 'Link mời'], ...Array.from({ length: 130 }, (_, i) => ['', `Khách ${i}`, ''])]
  const s = fakeSheet(many)
  s.state.failOnWrite = 1
  await expect(run(s)).rejects.toThrow(/dở dang[\s\S]*100\/260[\s\S]*backup-test\.json/i)
})

test('a verification mismatch after writing is reported instead of claiming success', async () => {
  const s = fakeSheet(base)
  const orig = s.api.writeBatch
  s.api.writeBatch = async (d) => { await orig(d); s.state.grid[1][0] = 'someone-overwrote' }
  await expect(run(s)).rejects.toThrow(/không khớp|kiểm tra/i)
})

test('running it again after a successful apply changes nothing (idempotent)', async () => {
  const s = fakeSheet(base)
  await run(s)
  const before = JSON.stringify(s.state.grid)
  const { res } = await run(s)
  expect(res.written).toBe(0)
  expect(JSON.stringify(s.state.grid)).toBe(before)
})
