import { createHandlers } from './handlers'
import type { RsvpEntry, SheetsApi } from './sheets'

const guests = [['ID', 'Name'], ['4NUV42', 'Bạn Ánh Nguyệt'], ['9XMPV8', 'Anh Minh'], ['123', 'Chi']]
const LOG_HEAD = ['Thời gian', 'Mã thiệp', 'Xác nhận', 'Số người', 'Lời nhắn']
const logRows = [
  LOG_HEAD,
  ['08/11/2026 10:00:00', '9XMPV8', 'Tham dự', '2', 'Mừng hai bạn'],
  ['08/11/2026 10:05:00', '4NUV42', 'Tham dự', '1', ''],
  ['08/11/2026 10:10:00', '4NUV42', 'Không tham dự', '0', 'Tiếc quá'],
  ['08/11/2026 10:15:00', 'ZZZ999', 'Tham dự', '1', 'Khách lạ chúc'],
]

type FakeApi = SheetsApi & { recorded: { e: RsvpEntry; now: Date }[] }
function fakeApi(over: Partial<SheetsApi> = {}): FakeApi {
  const recorded: FakeApi['recorded'] = []
  return {
    recorded,
    getGuestRows: async () => guests,
    getLogRows: async () => logRows,
    recordRsvp: async (e, now) => { recorded.push({ e, now }) },
    ...over,
  }
}

describe('guest', () => {
  test('returns the display name for a known ID, ignoring letter case', async () => {
    expect(await createHandlers(fakeApi()).guest('4NUV42')).toEqual({ status: 200, body: { name: 'Bạn Ánh Nguyệt' } })
    expect((await createHandlers(fakeApi()).guest('4nuv42')).body).toEqual({ name: 'Bạn Ánh Nguyệt' })
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
    const r = await createHandlers(api, { retryDelayMs: 0 }).guest('4NUV42')
    expect(r.status).toBe(502)
    expect(JSON.stringify(r.body)).not.toContain('SECRET')
  })
  test('caches the sheet for 20 seconds', async () => {
    let calls = 0
    let t = 0
    const h = createHandlers(fakeApi({ getGuestRows: async () => { calls++; return guests } }), { now: () => t })
    await h.guest('123'); await h.guest('4NUV42')
    expect(calls).toBe(1)
    t = 21_000
    await h.guest('123')
    expect(calls).toBe(2)
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
    expect((await h.guest('a')).body).toEqual({ name: 'Tên Cũ' })
    expect(calls).toBe(2)
    release([['ID', 'Name'], ['a', 'Tên Mới']])
    await new Promise((r) => setTimeout(r, 0))
    expect((await h.guest('a')).body).toEqual({ name: 'Tên Mới' })
  })
  test('keeps serving the last good rows when a refresh fails', async () => {
    let now = 0
    let fail = false
    const api = fakeApi({ getGuestRows: async () => { if (fail) throw new Error('quota'); return [['ID', 'Name'], ['a', 'Còn Đó']] } })
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
    const api = fakeApi({ getGuestRows: async () => { calls++; if (calls === 1) throw new Error('blip'); return [['ID', 'Name'], ['a', 'Sau Khi Thử Lại']] } })
    const r = await createHandlers(api, { retryDelayMs: 0 }).guest('a')
    expect(r.body).toEqual({ name: 'Sau Khi Thử Lại' })
    expect(calls).toBe(2)
  })
  test('if the very first load fails twice it answers 502, and the next request tries again', async () => {
    let calls = 0
    const api = fakeApi({ getGuestRows: async () => { calls++; if (calls <= 2) throw new Error('down'); return [['ID', 'Name'], ['a', 'Đã Lại']] } })
    const h = createHandlers(api, { retryDelayMs: 0 })
    expect((await h.guest('a')).status).toBe(502)
    expect((await h.guest('a')).body).toEqual({ name: 'Đã Lại' })
  })
  test('warm() preloads the guest rows, and never throws even if the sheet is down', async () => {
    let calls = 0
    const h = createHandlers(fakeApi({ getGuestRows: async () => { calls++; return guests } }))
    await h.warm()
    await h.guest('123')
    expect(calls).toBe(1)
    const down = createHandlers(fakeApi({ getGuestRows: async () => { throw new Error('down') } }), { retryDelayMs: 0 })
    await expect(down.warm()).resolves.toBeUndefined()
  })
})

describe('rsvp', () => {
  const good = { id: '4NUV42', attending: true, companions: 1, message: 'Chúc mừng' }

  test('records the answer under the sheet\'s own ID, with the total number of people (guest + companions)', async () => {
    const api = fakeApi()
    const r = await createHandlers(api).rsvp(good)
    expect(r).toEqual({ status: 200, body: { ok: true } })
    expect(api.recorded).toHaveLength(1)
    expect(api.recorded[0].e).toEqual({ id: '4NUV42', attending: true, people: 2, message: 'Chúc mừng' })
  })
  test('a guest who comes alone counts as one person', async () => {
    const api = fakeApi()
    await createHandlers(api).rsvp({ ...good, companions: 0 })
    expect(api.recorded[0].e.people).toBe(1)
  })
  test('declining records zero people whatever the companions field says', async () => {
    const api = fakeApi()
    await createHandlers(api).rsvp({ ...good, attending: false, companions: 7 })
    expect(api.recorded[0].e).toMatchObject({ attending: false, people: 0 })
  })
  test('a link whose letter case was changed still records under the real ID', async () => {
    const api = fakeApi()
    await createHandlers(api).rsvp({ ...good, id: '4nuv42' })
    expect(api.recorded[0].e.id).toBe('4NUV42')
  })
  test('an ID that is not in the guest list is rejected with a clear code and nothing is written', async () => {
    const api = fakeApi()
    const r = await createHandlers(api).rsvp({ ...good, id: 'NOPE00' })
    expect(r.status).toBe(404)
    expect((r.body as { code: string }).code).toBe('unknown_guest')
    expect(api.recorded).toHaveLength(0)
  })
  test.each([
    [null], ['text'], [{}], [{ ...good, id: undefined }], [{ ...good, id: 42 }], [{ ...good, id: '' }], [{ ...good, id: 'a b' }],
    [{ ...good, id: 'x'.repeat(41) }], [{ ...good, attending: 'yes' }], [{ ...good, companions: 'two' }],
    [{ ...good, companions: 10 }], [{ ...good, companions: -1 }], [{ ...good, message: 5 }], [{ ...good, message: 'x'.repeat(501) }],
  ])('rejects invalid body %#', async (body) => {
    const api = fakeApi()
    const r = await createHandlers(api).rsvp(body)
    expect(r.status).toBe(400)
    expect(api.recorded).toHaveLength(0)
  })
  test('a message beginning with = is passed through untouched (RAW storage makes it inert)', async () => {
    const api = fakeApi()
    await createHandlers(api).rsvp({ ...good, message: '=SUM(1+1)' })
    expect(api.recorded[0].e.message).toBe('=SUM(1+1)')
  })
  test('a sheet failure -> 502 generic, no details', async () => {
    const api = fakeApi({ recordRsvp: async () => { throw new Error('quota SECRET') } })
    const r = await createHandlers(api).rsvp(good)
    expect(r.status).toBe(502)
    expect(JSON.stringify(r.body)).not.toContain('SECRET')
  })
  test('the timestamp comes from the injected clock', async () => {
    const api = fakeApi()
    await createHandlers(api, { now: () => Date.parse('2026-11-08T03:04:05Z') }).rsvp(good)
    expect(api.recorded[0].now.toISOString()).toBe('2026-11-08T03:04:05.000Z')
  })
})

describe('rsvp abuse limits', () => {
  const good = { id: '4NUV42', attending: true, companions: 0, message: 'Chúc mừng' }
  test('allows 5 submissions per IP per 10 minutes, then answers 429 without writing', async () => {
    const api = fakeApi()
    let t = 0
    const h = createHandlers(api, { now: () => t })
    for (let i = 0; i < 5; i++) expect((await h.rsvp(good, { ip: '1.1.1.1' })).status).toBe(200)
    expect((await h.rsvp(good, { ip: '1.1.1.1' })).status).toBe(429)
    expect(api.recorded).toHaveLength(5)
    expect((await h.rsvp(good, { ip: '2.2.2.2' })).status).toBe(200)
    t = 10 * 60_000 + 1
    expect((await h.rsvp(good, { ip: '1.1.1.1' })).status).toBe(200)
  })
  test('has a global ceiling of 100 submissions per hour across IPs', async () => {
    const h = createHandlers(fakeApi(), { now: () => 0 })
    for (let i = 0; i < 100; i++) expect((await h.rsvp(good, { ip: `10.0.0.${i}` })).status).toBe(200)
    expect((await h.rsvp(good, { ip: '10.9.9.9' })).status).toBe(429)
  })
  test('guessing IDs through the RSVP endpoint is throttled too (unknown IDs count)', async () => {
    const h = createHandlers(fakeApi())
    for (let i = 0; i < 5; i++) expect((await h.rsvp({ ...good, id: `GUESS${i}` }, { ip: '3.3.3.3' })).status).toBe(404)
    expect((await h.rsvp({ ...good, id: 'GUESS9' }, { ip: '3.3.3.3' })).status).toBe(429)
  })
})

describe('wishes', () => {
  test('lists messages newest first with the guest\'s display name taken from the guest list', async () => {
    const r = await createHandlers(fakeApi()).wishes()
    expect(r.status).toBe(200)
    expect(r.body).toEqual([
      { name: 'Khách mời', message: 'Khách lạ chúc', at: '08/11/2026 10:15:00' },
      { name: 'Bạn Ánh Nguyệt', message: 'Tiếc quá', at: '08/11/2026 10:10:00' },
      { name: 'Anh Minh', message: 'Mừng hai bạn', at: '08/11/2026 10:00:00' },
    ])
  })
  test('skips empty messages and hides messages containing links or domains (stored, never shown)', async () => {
    const api = fakeApi({
      getLogRows: async () => [LOG_HEAD,
        ['t1', '4NUV42', 'Tham dự', '1', 'Chuyển khoản tại https://evil.example/pay'],
        ['t2', '4NUV42', 'Tham dự', '1', 'xem www.evil.vn nhé'],
        ['t3', '4NUV42', 'Tham dự', '1', 'đặt tại evil.com/x'],
        ['t4', '4NUV42', 'Tham dự', '1', '   '],
        ['t5', '9XMPV8', 'Tham dự', '1', 'Trăm năm hạnh phúc']],
    })
    expect((await createHandlers(api).wishes()).body).toEqual([{ name: 'Anh Minh', message: 'Trăm năm hạnh phúc', at: 't5' }])
  })
  test('returns at most the 30 newest', async () => {
    const many = [LOG_HEAD, ...Array.from({ length: 45 }, (_, i) => [`t${i}`, '9XMPV8', 'Tham dự', '1', `Lời ${i}`])]
    const body = (await createHandlers(fakeApi({ getLogRows: async () => many })).wishes()).body as { message: string }[]
    expect(body).toHaveLength(30)
    expect(body[0].message).toBe('Lời 44')
  })
  test('works with an empty log, and a failing sheet gives 200 with [] so the page just hides the wall', async () => {
    expect((await createHandlers(fakeApi({ getLogRows: async () => [] })).wishes()).body).toEqual([])
    const down = fakeApi({ getLogRows: async () => { throw new Error('x') } })
    expect(await createHandlers(down, { retryDelayMs: 0 }).wishes()).toEqual({ status: 200, body: [] })
  })
  test('still lists wishes (with a generic name) if only the guest list is unavailable', async () => {
    const api = fakeApi({ getGuestRows: async () => { throw new Error('x') } })
    const body = (await createHandlers(api, { retryDelayMs: 0 }).wishes()).body as { name: string }[]
    expect(body.length).toBeGreaterThan(0)
    expect(body.every((w) => w.name === 'Khách mời')).toBe(true)
  })
})
