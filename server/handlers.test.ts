import { createHandlers } from './handlers'
import type { SheetsApi } from './sheets'

const guests = [['ID', 'Name'], ['HaHxtn', 'Ánh Nguyệt '], ['123', 'Chi']]
function fakeApi(over: Partial<SheetsApi> = {}): SheetsApi & { appended: string[][] } {
  const appended: string[][] = []
  return {
    appended,
    getGuestRows: async () => guests,
    getResponseRows: async () => [
      ['Tên khách', 'Tham dự', 'Số người', 'Lời nhắn', 'Thời gian'],
      ['Châu Nguyệt ', 'Có', '1', 'tham gia', '17:42:49 4/4/2026'],
      ['Im Lặng', 'Có', '1', '', 't'],
      ['Chị Lan', 'Không', '0', 'Tiếc quá', 't2'],
    ],
    appendResponse: async (row) => { appended.push(row) },
    ...over,
  }
}

describe('guest', () => {
  test('returns the trimmed name for a known ID', async () => {
    expect(await createHandlers(fakeApi()).guest('HaHxtn')).toEqual({ status: 200, body: { name: 'Ánh Nguyệt' } })
  })
  test('unknown ID -> 200 with name null (the page falls back to Quý khách)', async () => {
    expect(await createHandlers(fakeApi()).guest('zzz')).toEqual({ status: 200, body: { name: null } })
  })
  test('missing or malformed id -> 400', async () => {
    expect((await createHandlers(fakeApi()).guest(undefined)).status).toBe(400)
    expect((await createHandlers(fakeApi()).guest('a b<script>')).status).toBe(400)
  })
  test('a sheet failure -> 502 with a generic message, no details leaked', async () => {
    const api = fakeApi({ getGuestRows: async () => { throw new Error('invalid_grant: SECRET') } })
    const r = await createHandlers(api).guest('HaHxtn')
    expect(r.status).toBe(502)
    expect(JSON.stringify(r.body)).not.toContain('SECRET')
  })
  test('caches the sheet for 60 seconds', async () => {
    let calls = 0
    let t = 0
    const api = fakeApi({ getGuestRows: async () => { calls++; return guests } })
    const h = createHandlers(api, { now: () => t })
    await h.guest('123'); await h.guest('HaHxtn')
    expect(calls).toBe(1)
    t = 61_000
    await h.guest('123')
    expect(calls).toBe(2)
  })
})

describe('rsvp', () => {
  const good = { name: 'Anh Minh', attending: true, companions: 1, message: 'Chúc mừng' }
  test('appends one row and answers ok', async () => {
    const api = fakeApi()
    const r = await createHandlers(api).rsvp(good)
    expect(r).toEqual({ status: 200, body: { ok: true } })
    expect(api.appended).toHaveLength(1)
    expect(api.appended[0].slice(0, 4)).toEqual(['Anh Minh', 'Có', '2', 'Chúc mừng'])
  })
  test('declining stores 0 people', async () => {
    const api = fakeApi()
    await createHandlers(api).rsvp({ ...good, attending: false, companions: 7 })
    expect(api.appended[0].slice(1, 3)).toEqual(['Không', '0'])
  })
  test.each([
    [null], ['text'], [{}], [{ ...good, name: '' }], [{ ...good, name: 'x'.repeat(61) }],
    [{ ...good, companions: 10 }], [{ ...good, companions: 'two' }], [{ ...good, attending: 'yes' }],
    [{ ...good, message: 'x'.repeat(501) }],
  ])('rejects invalid body %#', async (body) => {
    const api = fakeApi()
    const r = await createHandlers(api).rsvp(body)
    expect(r.status).toBe(400)
    expect(api.appended).toHaveLength(0)
  })
  test('a message beginning with = is passed through untouched (RAW storage makes it inert)', async () => {
    const api = fakeApi()
    await createHandlers(api).rsvp({ ...good, message: '=SUM(1+1)' })
    expect(api.appended[0][3]).toBe('=SUM(1+1)')
  })
  test('a sheet failure -> 502 generic', async () => {
    const api = fakeApi({ appendResponse: async () => { throw new Error('quota SECRET') } })
    const r = await createHandlers(api).rsvp(good)
    expect(r.status).toBe(502)
    expect(JSON.stringify(r.body)).not.toContain('SECRET')
  })
})

describe('wishes', () => {
  test('returns newest first, skips empty messages, trims names, at most 30', async () => {
    const r = await createHandlers(fakeApi()).wishes()
    expect(r.status).toBe(200)
    expect(r.body).toEqual([
      { name: 'Chị Lan', message: 'Tiếc quá', at: 't2' },
      { name: 'Châu Nguyệt', message: 'tham gia', at: '17:42:49 4/4/2026' },
    ])
  })
  test('failure -> 200 with [] so the page just hides the wall', async () => {
    const api = fakeApi({ getResponseRows: async () => { throw new Error('x') } })
    expect(await createHandlers(api).wishes()).toEqual({ status: 200, body: [] })
  })
})
