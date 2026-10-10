import { buildResponseRow, createSheetsApi, findGuestName, formatSheetTime, readSheetsEnv, type SheetsEnv } from './sheets'

const rows = [
  ['ID', 'Name', 'Link', 'Link mời'],
  ['123', 'Ánh Nguyệt ', '', 'http://x/123'],
  ['9WNYt0', ' Châu Nguyệt ', '', ''],
  ['dup', 'Người Đầu', '', ''],
  ['dup', 'Người Sau', '', ''],
  ['noname', '', '', ''],
]

describe('findGuestName', () => {
  test('finds by exact ID (numeric IDs too) and trims the name', () => {
    expect(findGuestName(rows, '123')).toBe('Ánh Nguyệt')
    expect(findGuestName(rows, '9WNYt0')).toBe('Châu Nguyệt')
  })
  test('the header row is not a guest and the first exact duplicate wins (case is tolerated, see below)', () => {
    expect(findGuestName(rows, '9wnyt0')).toBe('Châu Nguyệt')
    expect(findGuestName(rows, 'ID')).toBeNull()
    expect(findGuestName(rows, 'dup')).toBe('Người Đầu')
  })
  test('unknown id or a row without a name -> null', () => {
    expect(findGuestName(rows, 'nope')).toBeNull()
    expect(findGuestName(rows, 'noname')).toBeNull()
    expect(findGuestName([], '123')).toBeNull()
  })
})

describe('findGuestName tolerant matching', () => {
  const r = [['ID', 'Name'], ['a-thanh-e78yw', 'Anh Thành'], ['K7MQ2', 'Chị Lan'], ['dup1', 'Một'], ['DUP1', 'Hai']]
  test('an exact match always wins', () => expect(findGuestName(r, 'K7MQ2')).toBe('Chị Lan'))
  test('falls back to a case-insensitive match when a chat app changed the case of the link', () => {
    expect(findGuestName(r, 'A-THANH-E78YW')).toBe('Anh Thành')
    expect(findGuestName(r, 'k7mq2')).toBe('Chị Lan')
  })
  test('an ambiguous case-insensitive match returns null instead of guessing', () => {
    expect(findGuestName(r, 'Dup1')).toBeNull()
  })
})

describe('formatSheetTime', () => {
  test('matches the sheet format in Ho Chi Minh time', () => {
    expect(formatSheetTime(new Date('2026-04-04T10:42:49Z'))).toBe('17:42:49 4/4/2026')
    expect(formatSheetTime(new Date('2026-12-19T17:05:09Z'))).toBe('00:05:09 20/12/2026')
  })
})

describe('buildResponseRow', () => {
  const now = new Date('2026-04-04T10:42:49Z')
  test('attending: total people = 1 + companions', () => {
    expect(buildResponseRow({ name: ' Anh Minh ', attending: true, companions: 2, message: ' Chúc mừng ' }, now))
      .toEqual(['Anh Minh', 'Có', '3', 'Chúc mừng', '17:42:49 4/4/2026'])
  })
  test('declining: 0 people, companions ignored', () => {
    expect(buildResponseRow({ name: 'Chị Lan', attending: false, companions: 5, message: '' }, now))
      .toEqual(['Chị Lan', 'Không', '0', '', '17:42:49 4/4/2026'])
  })
})

describe('readSheetsEnv', () => {
  test('requires all credentials, turns \\n into newlines and applies tab defaults', () => {
    const e = readSheetsEnv({ GOOGLE_SERVICE_ACCOUNT_EMAIL: 'a@b', GOOGLE_PRIVATE_KEY: 'k1\\nk2', GOOGLE_SHEET_ID: 'sid' })
    expect(e).toEqual({ email: 'a@b', privateKey: 'k1\nk2', sheetId: 'sid', guestTab: 'khách mời', responseTab: 'Responses' })
  })
  test('throws without echoing secrets when something is missing', () => {
    expect(() => readSheetsEnv({ GOOGLE_PRIVATE_KEY: 'SECRETKEY' })).toThrow(/GOOGLE_SERVICE_ACCOUNT_EMAIL/)
    try { readSheetsEnv({ GOOGLE_PRIVATE_KEY: 'SECRETKEY' }) } catch (e) { expect(String(e)).not.toContain('SECRETKEY') }
  })
})

describe('createSheetsApi', () => {
  const env: SheetsEnv = { email: 'a@b', privateKey: 'k', sheetId: 'SID', guestTab: "khách mời", responseTab: 'Responses' }
  test('reads the guest tab A:B with the tab name quoted and encoded', async () => {
    const request = vi.fn().mockResolvedValue({ data: { values: [['ID', 'Name']] } })
    expect(await createSheetsApi(env, request).getGuestRows()).toEqual([['ID', 'Name']])
    expect(request.mock.calls[0][0].url).toBe(`https://sheets.googleapis.com/v4/spreadsheets/SID/values/${encodeURIComponent("'khách mời'!A:B")}`)
  })
  test('appends a RAW row so a leading = is stored as text, never a formula', async () => {
    const request = vi.fn().mockResolvedValue({ data: {} })
    await createSheetsApi(env, request).appendResponse(['A', 'Có', '1', '=HYPERLINK("http://evil")', 't'])
    const o = request.mock.calls[0][0]
    expect(o.method).toBe('POST')
    expect(o.url).toContain(`/values/${encodeURIComponent("'Responses'!A:E")}:append`)
    expect(o.params).toEqual({ valueInputOption: 'RAW', insertDataOption: 'INSERT_ROWS' })
    expect(o.data).toEqual({ values: [['A', 'Có', '1', '=HYPERLINK("http://evil")', 't']] })
  })
  test('an empty tab yields []', async () => {
    const request = vi.fn().mockResolvedValue({ data: {} })
    expect(await createSheetsApi(env, request).getResponseRows()).toEqual([])
  })
})
