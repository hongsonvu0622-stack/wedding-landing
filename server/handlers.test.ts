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

describe('rsvp abuse limits', () => {
  const good = { name: 'Anh Minh', attending: true, companions: 0, message: 'Chúc mừng' }
  test('allows 5 submissions per IP per 10 minutes, then answers 429 without writing', async () => {
    const api = fakeApi()
    let t = 0
    const h = createHandlers(api, { now: () => t })
    for (let i = 0; i < 5; i++) expect((await h.rsvp(good, { ip: '1.1.1.1' })).status).toBe(200)
    expect((await h.rsvp(good, { ip: '1.1.1.1' })).status).toBe(429)
    expect(api.appended).toHaveLength(5)
    expect((await h.rsvp(good, { ip: '2.2.2.2' })).status).toBe(200)
    t = 10 * 60_000 + 1
    expect((await h.rsvp(good, { ip: '1.1.1.1' })).status).toBe(200)
  })
  test('has a global ceiling of 100 submissions per hour across IPs', async () => {
    const api = fakeApi()
    const h = createHandlers(api, { now: () => 0 })
    for (let i = 0; i < 100; i++) expect((await h.rsvp(good, { ip: `10.0.0.${i}` })).status).toBe(200)
    expect((await h.rsvp(good, { ip: '10.9.9.9' })).status).toBe(429)
  })
  test('the wish wall hides messages containing links or domains (stored, never shown)', async () => {
    const api = fakeApi({
      getResponseRows: async () => [
        ['Tên khách', 'Tham dự', 'Số người', 'Lời nhắn', 'Thời gian'],
        ['A', 'Có', '1', 'Chuyển khoản mừng cưới tại https://evil.example/pay', 't1'],
        ['B', 'Có', '1', 'xem www.evil.vn nhé', 't2'],
        ['C', 'Có', '1', 'đặt tại evil.com/x', 't3'],
        ['D', 'Có', '1', 'Trăm năm hạnh phúc', 't4'],
      ],
    })
    const r = await createHandlers(api).wishes()
    expect(r.body).toEqual([{ name: 'D', message: 'Trăm năm hạnh phúc', at: 't4' }])
  })
})

describe('guest lookup resilience', () => {
  test('after the TTL it serves the old rows immediately and refreshes in the background', async () => {
    let now = 0
    let release!: (rows: string[][]) => void
    let calls = 0
    const api = fakeApi({
      getGuestRows: () => {
        calls++
        if (calls === 1) return Promise.resolve([['ID', 'Name'], ['a', 'Tên Cũ']])
        return new Promise<string[][]>((r) => { release = r })
      },
    })
    const h = createHandlers(api, { now: () => now })
    expect((await h.guest('a')).body).toEqual({ name: 'Tên Cũ' })
    now = 25_000
    expect((await h.guest('a')).body).toEqual({ name: 'Tên Cũ' }) // not blocked by the slow refresh
    expect(calls).toBe(2)
    release([['ID', 'Name'], ['a', 'Tên Mới']])
    await new Promise((r) => setTimeout(r, 0))
    expect((await h.guest('a')).body).toEqual({ name: 'Tên Mới' })
  })

  test('keeps serving the last good rows when a refresh fails', async () => {
    let now = 0
    let fail = false
    const api = fakeApi({
      getGuestRows: async () => { if (fail) throw new Error('quota'); return [['ID', 'Name'], ['a', 'Còn Đó']] },
    })
    const h = createHandlers(api, { now: () => now, retryDelayMs: 0 })
    await h.guest('a')
    fail = true
    now = 60_000
    expect((await h.guest('a')).body).toEqual({ name: 'Còn Đó' })
    await new Promise((r) => setTimeout(r, 0))
    now = 120_000
    expect((await h.guest('a')).body).toEqual({ name: 'Còn Đó' })
  })

  test('retries a failing sheet read once before giving up', async () => {
    let calls = 0
    const api = fakeApi({
      getGuestRows: async () => { calls++; if (calls === 1) throw new Error('blip'); return [['ID', 'Name'], ['a', 'Sau Khi Thử Lại']] },
    })
    const r = await createHandlers(api, { retryDelayMs: 0 }).guest('a')
    expect(r.body).toEqual({ name: 'Sau Khi Thử Lại' })
    expect(calls).toBe(2)
  })

  test('if the very first load fails twice it answers 502, and the next request tries again', async () => {
    let calls = 0
    const api = fakeApi({
      getGuestRows: async () => { calls++; if (calls <= 2) throw new Error('down'); return [['ID', 'Name'], ['a', 'Đã Lại']] },
    })
    const h = createHandlers(api, { retryDelayMs: 0 })
    expect((await h.guest('a')).status).toBe(502)
    expect((await h.guest('a')).body).toEqual({ name: 'Đã Lại' })
  })

  test('warm() preloads the guest rows so the first visitor does not wait for Google', async () => {
    let calls = 0
    const api = fakeApi({ getGuestRows: async () => { calls++; return [['ID', 'Name'], ['a', 'X']] } })
    const h = createHandlers(api)
    await h.warm()
    expect(calls).toBe(1)
    await h.guest('a')
    expect(calls).toBe(1)
  })

  test('warm() never throws, even if the sheet is down', async () => {
    const h = createHandlers(fakeApi({ getGuestRows: async () => { throw new Error('down') } }), { retryDelayMs: 0 })
    await expect(h.warm()).resolves.toBeUndefined()
  })
})
