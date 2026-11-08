import {
  createSheetsApi, extractGuests, findGuest, findGuestName, findRsvpWebRow, formatSheetTime, readSheetsEnv,
  rsvpLogRow, rsvpStatus, rsvpWebRow, type RsvpEntry, type SheetsEnv, type SheetsRequest,
} from './sheets'

// Bố cục tab "Thiệp online (tổng hợp)": vài dòng tiêu đề/ghi chú, dòng tiêu đề cột ở dòng 4, dữ liệu từ dòng 5.
const aggregate = [
  ['THIỆP ONLINE – DANH SÁCH TỔNG HỢP (CHỈ XEM)'],
  ['Tự gom từ 3 sheet khách...'],
  ['', '', '', '', '', '', '', '', '', '', 'Số dòng:', '3'],
  ['STT', 'Khách của', 'Mã thiệp', 'Tên hiển thị trên thiệp', 'Link thiệp online', 'Gửi link', 'Xác nhận (chốt)'],
  ['1', 'Nhà gái', '4NUV42', 'Bạn Ánh Nguyệt ', '', 'Chưa gửi', 'Chưa phản hồi'],
  ['2', 'Nhà trai', ' 9XMPV8 ', 'Anh Minh', '', 'Chưa gửi', 'Chưa phản hồi'],
  ['', '', '', '', '', '', ''],
  ['3', 'Chưa phân bên', 'dup001', 'Người Đầu'],
  ['4', 'Nhà gái', 'dup001', 'Người Sau'],
  ['5', 'Nhà gái', 'noname', ''],
]

describe('extractGuests', () => {
  test('finds the header row by its column names and returns normalized [ID, Name] rows', () => {
    const rows = extractGuests(aggregate)
    expect(rows[0]).toEqual(['ID', 'Name'])
    expect(rows[1]).toEqual(['4NUV42', 'Bạn Ánh Nguyệt'])
    expect(rows[2]).toEqual(['9XMPV8', 'Anh Minh'])
  })
  test('skips blank rows (formulas that return empty text) and rows without an ID', () => {
    const ids = extractGuests(aggregate).slice(1).map((r) => r[0])
    expect(ids).toEqual(['4NUV42', '9XMPV8', 'dup001', 'dup001', 'noname'])
  })
  test('is tolerant of header spelling: case, extra spaces, and column order', () => {
    const g = [['Tên hiển thị trên thiệp ', ' MÃ  THIỆP'], ['Bạn Lan', 'abc123']]
    expect(extractGuests(g)).toEqual([['ID', 'Name'], ['abc123', 'Bạn Lan']])
  })
  test('a missing header is a clear error naming the columns it was looking for', () => {
    expect(() => extractGuests([['x', 'y'], ['1', '2']])).toThrow(/Mã thiệp.*Tên hiển thị/)
    expect(() => extractGuests([])).toThrow()
  })
  test('a header further down than the first 15 rows is not accepted (guards against reading the wrong tab)', () => {
    const far = [...Array(20).fill(['ghi chú']), ['Mã thiệp', 'Tên hiển thị trên thiệp'], ['a', 'b']]
    expect(() => extractGuests(far)).toThrow()
  })
})

describe('findGuest / findGuestName', () => {
  const rows = extractGuests(aggregate)
  test('returns the canonical ID as written in the sheet together with the name', () => {
    expect(findGuest(rows, '4NUV42')).toEqual({ id: '4NUV42', name: 'Bạn Ánh Nguyệt' })
  })
  test('accepts a different letter case (chat apps change links) and reports the sheet ID', () => {
    expect(findGuest(rows, '4nuv42')).toEqual({ id: '4NUV42', name: 'Bạn Ánh Nguyệt' })
    expect(findGuestName(rows, '9xmpv8')).toBe('Anh Minh')
  })
  test('the first of two identical IDs wins; two IDs differing only by case are ambiguous', () => {
    expect(findGuest(rows, 'dup001')?.name).toBe('Người Đầu')
    const amb = [['ID', 'Name'], ['aBc', 'Một'], ['AbC', 'Hai']]
    expect(findGuest(amb, 'abc')).toBeNull()
    expect(findGuest(amb, 'aBc')?.name).toBe('Một')
  })
  test('unknown ID, a row without a name, and an empty list are all null', () => {
    expect(findGuest(rows, 'nope')).toBeNull()
    expect(findGuest(rows, 'noname')).toBeNull()
    expect(findGuest([], 'x')).toBeNull()
  })
})

describe('formatSheetTime', () => {
  test('is dd/MM/yyyy HH:mm:ss in Ho Chi Minh time', () => {
    expect(formatSheetTime(new Date('2026-04-04T10:42:49Z'))).toBe('04/04/2026 17:42:49')
    expect(formatSheetTime(new Date('2026-12-19T17:05:09Z'))).toBe('20/12/2026 00:05:09')
  })
})

const entry = (over: Partial<RsvpEntry> = {}): RsvpEntry => ({ id: '4NUV42', attending: true, people: 2, message: ' Chúc mừng ', ...over })
const NOW = new Date('2026-11-08T03:04:05Z')

describe('RSVP rows', () => {
  test('the status uses exactly the words the sheet formulas compare against', () => {
    expect(rsvpStatus(true)).toBe('Tham dự')
    expect(rsvpStatus(false)).toBe('Không tham dự')
  })
  test('log row = Thời gian, Mã thiệp, Xác nhận, Số người, Lời nhắn', () => {
    expect(rsvpLogRow(entry(), NOW)).toEqual(['08/11/2026 10:04:05', '4NUV42', 'Tham dự', 2, 'Chúc mừng'])
  })
  test('web row = Mã thiệp, Xác nhận, Số người, Lời nhắn, Thời gian cập nhật, Số lần gửi', () => {
    expect(rsvpWebRow(entry({ attending: false, people: 0, message: '' }), NOW, 3)).toEqual(['4NUV42', 'Không tham dự', 0, '', '08/11/2026 10:04:05', 3])
  })
})

describe('findRsvpWebRow', () => {
  const grid = [['Mã thiệp', 'Xác nhận'], ['AAA111', 'Tham dự'], [' bbb222 ', 'Không tham dự'], ['', '']]
  test('returns the 1-based sheet row of the guest, ignoring the header, spaces and letter case', () => {
    expect(findRsvpWebRow(grid, 'AAA111')).toBe(2)
    expect(findRsvpWebRow(grid, 'BBB222')).toBe(3)
  })
  test('-1 when the guest has not answered yet; the header text is never a match', () => {
    expect(findRsvpWebRow(grid, 'ZZZ')).toBe(-1)
    expect(findRsvpWebRow(grid, 'Mã thiệp')).toBe(-1)
    expect(findRsvpWebRow([], 'x')).toBe(-1)
  })
})

describe('readSheetsEnv', () => {
  const base = { GOOGLE_SERVICE_ACCOUNT_EMAIL: 'a@b', GOOGLE_PRIVATE_KEY: 'k1\\nk2', GOOGLE_SHEET_ID: 'sid' }
  test('requires all credentials, turns \\n into newlines and applies the tab defaults of the guest workbook', () => {
    expect(readSheetsEnv(base)).toEqual({
      email: 'a@b', privateKey: 'k1\nk2', sheetId: 'sid',
      guestTab: 'Thiệp online (tổng hợp)', rsvpWebTab: 'RSVP web', rsvpLogTab: 'RSVP log',
    })
  })
  test('tab names can be overridden from the environment', () => {
    const e = readSheetsEnv({ ...base, GUEST_SHEET_NAME: 'G', RSVP_WEB_SHEET_NAME: 'W', RSVP_LOG_SHEET_NAME: 'L' })
    expect([e.guestTab, e.rsvpWebTab, e.rsvpLogTab]).toEqual(['G', 'W', 'L'])
  })
  test('throws without echoing secrets when something is missing', () => {
    expect(() => readSheetsEnv({ GOOGLE_PRIVATE_KEY: 'SECRETKEY' })).toThrow(/GOOGLE_SERVICE_ACCOUNT_EMAIL/)
    try { readSheetsEnv({ GOOGLE_PRIVATE_KEY: 'SECRETKEY' }) } catch (e) { expect(String(e)).not.toContain('SECRETKEY') }
  })
})

// Một "Google Sheet" nhỏ trong bộ nhớ, hiểu đúng các lời gọi mà createSheetsApi gửi đi.
function fakeWorkbook(initial: Record<string, (string | number)[][]>) {
  const tabs: Record<string, (string | number)[][]> = JSON.parse(JSON.stringify(initial))
  const calls: { url: string; method?: string; params?: Record<string, string>; data?: any }[] = []
  const tabOf = (url: string) => decodeURIComponent(/values\/([^:?]+)/.exec(url)![1]).replace(/^'((?:[^']|'')*)'!.*$/, '$1').replace(/''/g, "'")
  const request: SheetsRequest = async (o) => {
    calls.push(o)
    if (o.url.includes(':append')) {
      const tab = tabOf(o.url)
      for (const row of (o.data as { values: (string | number)[][] }).values) (tabs[tab] ??= []).push(row)
      return { data: {} }
    }
    if (o.url.endsWith('values:batchUpdate')) {
      for (const d of (o.data as { data: { range: string; values: (string | number)[][] }[] }).data) {
        const m = /^'((?:[^']|'')*)'!([A-Z]+)(\d+)(?::([A-Z]+)\d+)?$/.exec(d.range)!
        const tab = m[1].replace(/''/g, "'"); const col = m[2].charCodeAt(0) - 65; const r = Number(m[3]) - 1
        tabs[tab] ??= []
        while (tabs[tab].length <= r) tabs[tab].push([])
        d.values[0].forEach((v: string | number, i: number) => { while (tabs[tab][r].length <= col + i) tabs[tab][r].push(''); tabs[tab][r][col + i] = v })
      }
      return { data: {} }
    }
    return { data: { values: tabs[tabOf(o.url)] ?? [] } }
  }
  return { tabs, calls, request }
}

const ENV: SheetsEnv = { email: 'a@b', privateKey: 'k', sheetId: 'SID', guestTab: 'Thiệp online (tổng hợp)', rsvpWebTab: 'RSVP web', rsvpLogTab: 'RSVP log' }
const WEB_HEAD = ['Mã thiệp', 'Xác nhận', 'Số người', 'Lời nhắn', 'Thời gian cập nhật', 'Số lần gửi']
const LOG_HEAD = ['Thời gian', 'Mã thiệp', 'Xác nhận', 'Số người', 'Lời nhắn']

describe('createSheetsApi: reading', () => {
  test('getGuestRows reads the aggregate tab (quoted, encoded) and normalizes it', async () => {
    const wb = fakeWorkbook({ 'Thiệp online (tổng hợp)': aggregate })
    const rows = await createSheetsApi(ENV, wb.request).getGuestRows()
    expect(rows[1]).toEqual(['4NUV42', 'Bạn Ánh Nguyệt'])
    expect(wb.calls[0].url).toBe(`https://sheets.googleapis.com/v4/spreadsheets/SID/values/${encodeURIComponent("'Thiệp online (tổng hợp)'!A1:L2000")}`)
  })
  test('getLogRows reads RSVP log columns A:E, and an empty tab is []', async () => {
    const wb = fakeWorkbook({ 'RSVP log': [LOG_HEAD, ['t', 'id', 'Tham dự', '1', 'hi']] })
    expect(await createSheetsApi(ENV, wb.request).getLogRows()).toEqual([LOG_HEAD, ['t', 'id', 'Tham dự', '1', 'hi']])
    expect(wb.calls[0].url).toContain(encodeURIComponent("'RSVP log'!A:E"))
    expect(await createSheetsApi(ENV, fakeWorkbook({}).request).getLogRows()).toEqual([])
  })
})

describe('createSheetsApi.recordRsvp never inserts rows', () => {
  // Công thức ở tab khách tham chiếu cố định 'RSVP web'!$A$2:$A$3000. Chèn dòng (INSERT_ROWS) làm vùng đó trượt xuống
  // ($A$4:$A$3002...) và câu trả lời rơi ra ngoài vùng: công thức không thấy RSVP nữa.
  test('every append overwrites the next free row instead of inserting a row', async () => {
    const wb = fakeWorkbook({ 'RSVP web': [WEB_HEAD], 'RSVP log': [LOG_HEAD] })
    await createSheetsApi(ENV, wb.request).recordRsvp(entry(), NOW)
    const appends = wb.calls.filter((c) => c.url.includes(':append'))
    expect(appends).toHaveLength(2)
    for (const a of appends) {
      expect(a.params?.insertDataOption).toBe('OVERWRITE')
      expect(a.params?.insertDataOption).not.toBe('INSERT_ROWS')
    }
  })
  test('no request ever asks the sheet to insert or delete rows or columns', async () => {
    const wb = fakeWorkbook({ 'RSVP web': [WEB_HEAD, ['4NUV42', 'Tham dự', '1', '', 't0', '1']], 'RSVP log': [LOG_HEAD] })
    const api = createSheetsApi(ENV, wb.request)
    await api.recordRsvp(entry(), NOW)
    await api.recordRsvp(entry({ id: 'NEW001' }), NOW)
    const bodies = JSON.stringify(wb.calls.map((c) => [c.url, c.params, c.data]))
    expect(bodies).not.toMatch(/INSERT_ROWS|insertDimension|deleteDimension|insertRange|deleteRange/)
  })
})

describe('createSheetsApi.recordRsvp writes real numbers', () => {
  // Chữ "2" thay cho số 2 khiến SUM/COUNT trong Sheet bỏ qua ô đó: tổng số người tính bàn sẽ thiếu.
  test('Số người and Số lần gửi are numbers in both tabs, the rest stay text', async () => {
    const wb = fakeWorkbook({ 'RSVP web': [WEB_HEAD], 'RSVP log': [LOG_HEAD] })
    await createSheetsApi(ENV, wb.request).recordRsvp(entry({ people: 3 }), NOW)
    const web = wb.tabs['RSVP web'][1]; const log = wb.tabs['RSVP log'][1]
    expect([typeof web[0], typeof web[1], typeof web[2], typeof web[3], typeof web[4], typeof web[5]]).toEqual(['string', 'string', 'number', 'string', 'string', 'number'])
    expect([typeof log[0], typeof log[1], typeof log[2], typeof log[3], typeof log[4]]).toEqual(['string', 'string', 'string', 'number', 'string'])
  })
  test('the count keeps counting when the sheet already holds numbers', async () => {
    const wb = fakeWorkbook({ 'RSVP web': [WEB_HEAD, ['4NUV42', 'Tham dự', 2, '', 't0', 4]], 'RSVP log': [LOG_HEAD] })
    await createSheetsApi(ENV, wb.request).recordRsvp(entry(), NOW)
    expect(wb.tabs['RSVP web'][1][5]).toBe(5)
  })
  test('an ID made only of digits is still written as text so it matches the guest list text', async () => {
    const wb = fakeWorkbook({ 'RSVP web': [WEB_HEAD], 'RSVP log': [LOG_HEAD] })
    await createSheetsApi(ENV, wb.request).recordRsvp(entry({ id: '123456' }), NOW)
    expect(wb.tabs['RSVP web'][1][0]).toBe('123456')
    expect(wb.tabs['RSVP log'][1][1]).toBe('123456')
  })
})

describe('createSheetsApi.recordRsvp', () => {
  test('a first answer appends one row to RSVP web (count 1) and one to RSVP log, as RAW text', async () => {
    const wb = fakeWorkbook({ 'RSVP web': [WEB_HEAD], 'RSVP log': [LOG_HEAD] })
    await createSheetsApi(ENV, wb.request).recordRsvp(entry(), NOW)
    expect(wb.tabs['RSVP web'][1]).toEqual(['4NUV42', 'Tham dự', 2, 'Chúc mừng', '08/11/2026 10:04:05', 1])
    expect(wb.tabs['RSVP log'][1]).toEqual(['08/11/2026 10:04:05', '4NUV42', 'Tham dự', 2, 'Chúc mừng'])
    for (const c of wb.calls.filter((x) => x.method === 'POST')) expect(c.params?.valueInputOption).toBe('RAW')
  })

  test('a repeat answer updates the same row (B:F only, ID cell untouched), bumps the count and still logs', async () => {
    const wb = fakeWorkbook({ 'RSVP web': [WEB_HEAD, ['4NUV42', 'Tham dự', '2', 'cũ', 't0', '2']], 'RSVP log': [LOG_HEAD] })
    await createSheetsApi(ENV, wb.request).recordRsvp(entry({ attending: false, people: 0, message: '' }), NOW)
    expect(wb.tabs['RSVP web']).toHaveLength(2)
    expect(wb.tabs['RSVP web'][1]).toEqual(['4NUV42', 'Không tham dự', 0, '', '08/11/2026 10:04:05', 3])
    const update = wb.calls.find((c) => c.url.endsWith('values:batchUpdate'))!
    expect(update.data.data[0].range).toBe("'RSVP web'!B2:F2")
    expect(wb.tabs['RSVP log']).toHaveLength(2)
  })

  test('the row is matched ignoring letter case and keeps the sheet\'s own spelling of the ID', async () => {
    const wb = fakeWorkbook({ 'RSVP web': [WEB_HEAD, ['4NUV42', 'Tham dự', '1', '', 't0', '1']], 'RSVP log': [LOG_HEAD] })
    await createSheetsApi(ENV, wb.request).recordRsvp(entry({ id: '4nuv42' }), NOW)
    expect(wb.tabs['RSVP web']).toHaveLength(2)
    expect(wb.tabs['RSVP web'][1][0]).toBe('4NUV42')
  })

  test('a message that starts with = is stored as text, never evaluated', async () => {
    const wb = fakeWorkbook({ 'RSVP web': [WEB_HEAD], 'RSVP log': [LOG_HEAD] })
    await createSheetsApi(ENV, wb.request).recordRsvp(entry({ message: '=HYPERLINK("http://evil")' }), NOW)
    expect(wb.tabs['RSVP web'][1][3]).toBe('=HYPERLINK("http://evil")')
    expect(wb.calls.every((c) => c.method !== 'POST' || c.params?.valueInputOption === 'RAW' || c.data?.valueInputOption === 'RAW')).toBe(true)
  })

  test('two simultaneous first answers from the same guest produce one row with count 2, not two rows', async () => {
    const wb = fakeWorkbook({ 'RSVP web': [WEB_HEAD], 'RSVP log': [LOG_HEAD] })
    const api = createSheetsApi(ENV, wb.request)
    await Promise.all([api.recordRsvp(entry({ message: 'a' }), NOW), api.recordRsvp(entry({ message: 'b' }), NOW)])
    expect(wb.tabs['RSVP web']).toHaveLength(2)
    expect(wb.tabs['RSVP web'][1][5]).toBe(2)
    expect(wb.tabs['RSVP log']).toHaveLength(3)
  })

  test('different guests answering together each get their own row', async () => {
    const wb = fakeWorkbook({ 'RSVP web': [WEB_HEAD], 'RSVP log': [LOG_HEAD] })
    const api = createSheetsApi(ENV, wb.request)
    await Promise.all([api.recordRsvp(entry({ id: 'AAA111' }), NOW), api.recordRsvp(entry({ id: 'BBB222' }), NOW)])
    expect(wb.tabs['RSVP web'].map((r) => r[0])).toEqual(['Mã thiệp', 'AAA111', 'BBB222'])
  })

  test('a failure for one guest does not block the next one', async () => {
    const wb = fakeWorkbook({ 'RSVP web': [WEB_HEAD], 'RSVP log': [LOG_HEAD] })
    let fail = true
    const request: SheetsRequest = async (o) => { if (fail && o.method === 'POST') throw new Error('quota'); return wb.request(o) }
    const api = createSheetsApi(ENV, request)
    await expect(api.recordRsvp(entry(), NOW)).rejects.toThrow()
    fail = false
    await api.recordRsvp(entry({ id: 'NEXT01' }), NOW)
    expect(wb.tabs['RSVP web'].map((r) => r[0])).toContain('NEXT01')
  })

  test('the header and the notes next to it are never rewritten', async () => {
    const note = ['', '', '', '', '', '', '', '← Do API tự ghi. KHÔNG sửa tay']
    const wb = fakeWorkbook({ 'RSVP web': [[...WEB_HEAD, ...note.slice(6)], ['4NUV42', 'Tham dự', '1', '', 't0', '1']], 'RSVP log': [LOG_HEAD] })
    const before = JSON.stringify(wb.tabs['RSVP web'][0])
    await createSheetsApi(ENV, wb.request).recordRsvp(entry(), NOW)
    expect(JSON.stringify(wb.tabs['RSVP web'][0])).toBe(before)
  })
})
