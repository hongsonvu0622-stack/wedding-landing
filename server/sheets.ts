import { createFetchRequest, createTokenProvider } from './google-auth.js'

export interface SheetsEnv {
  email: string
  privateKey: string
  sheetId: string
  guestTab: string
  rsvpWebTab: string
  rsvpLogTab: string
}

export function readSheetsEnv(e: Record<string, string | undefined>): SheetsEnv {
  const need = (k: string) => {
    const v = e[k]
    if (!v) throw new Error(`Missing environment variable ${k}`)
    return v
  }
  return {
    email: need('GOOGLE_SERVICE_ACCOUNT_EMAIL'),
    privateKey: need('GOOGLE_PRIVATE_KEY').replace(/\\n/g, '\n'),
    sheetId: need('GOOGLE_SHEET_ID'),
    guestTab: e.GUEST_SHEET_NAME || 'Thiệp online (tổng hợp)',
    rsvpWebTab: e.RSVP_WEB_SHEET_NAME || 'RSVP web',
    rsvpLogTab: e.RSVP_LOG_SHEET_NAME || 'RSVP log',
  }
}

const str = (v: unknown) => String(v ?? '')
const norm = (v: unknown) => str(v).normalize('NFC').replace(/\s+/g, ' ').trim().toLowerCase()

// ---------- khách mời: tab "Thiệp online (tổng hợp)" ----------
// Tab này gộp khách của ba bên (đã bỏ khách "Huỷ mời"). Dòng tiêu đề cột không nằm ở dòng 1 nên được tìm theo tên cột.
const ID_HEADER = 'mã thiệp'
const NAME_HEADER = 'tên hiển thị trên thiệp'
const HEADER_SEARCH_ROWS = 15

// Trả về bảng chuẩn hoá [['ID','Name'], [mã thiệp, tên hiển thị], ...] chỉ gồm các dòng có mã thiệp.
export function extractGuests(grid: string[][]): string[][] {
  for (let i = 0; i < Math.min(grid.length, HEADER_SEARCH_ROWS); i++) {
    const h = grid[i].map(norm)
    const id = h.indexOf(ID_HEADER)
    const name = h.indexOf(NAME_HEADER)
    if (id < 0 || name < 0) continue
    const out: string[][] = [['ID', 'Name']]
    for (const r of grid.slice(i + 1)) {
      const gid = str(r[id]).trim()
      if (gid) out.push([gid, str(r[name]).trim()])
    }
    return out
  }
  throw new Error(`Không thấy dòng tiêu đề có cột "Mã thiệp" và "Tên hiển thị trên thiệp" trong ${HEADER_SEARCH_ROWS} dòng đầu của tab khách mời`)
}

// Khớp đúng ID trước; nếu không có thì chấp nhận lệch chữ hoa/thường khi chỉ có đúng một ứng viên
// (một số ứng dụng nhắn tin đổi chữ hoa trong link). Trả về ID đúng như viết trong Sheet.
export function findGuest(rows: string[][], id: string): { id: string; name: string } | null {
  const body = rows.slice(1)
  const want = id.trim()
  const make = (r: string[]) => {
    const name = str(r[1]).trim()
    return name ? { id: str(r[0]).trim(), name } : null
  }
  for (const r of body) if (str(r[0]).trim() === want) return make(r)
  const lower = want.toLowerCase()
  const hits = body.filter((r) => str(r[0]).trim().toLowerCase() === lower)
  return hits.length === 1 ? make(hits[0]) : null
}

export function findGuestName(rows: string[][], id: string): string | null {
  return findGuest(rows, id)?.name ?? null
}

// ---------- RSVP: tab "RSVP web" (mỗi khách một dòng) và "RSVP log" (ghi nối tiếp) ----------
export interface RsvpEntry {
  id: string
  attending: boolean
  people: number // tổng số người đến, kể cả khách (0 nếu không tham dự)
  message: string
}

export function formatSheetTime(d: Date): string {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Ho_Chi_Minh', hourCycle: 'h23', day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).formatToParts(d).map((x) => [x.type, x.value]),
  )
  return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}:${p.second}`
}

// Đúng hai giá trị mà công thức của Sheet so sánh ("Số người tính bàn" kiểm tra R = "Không tham dự").
export const rsvpStatus = (attending: boolean) => (attending ? 'Tham dự' : 'Không tham dự')

// RSVP log: Thời gian | Mã thiệp | Xác nhận | Số người | Lời nhắn
export function rsvpLogRow(e: RsvpEntry, now: Date): string[] {
  return [formatSheetTime(now), e.id, rsvpStatus(e.attending), String(e.people), e.message.trim()]
}

// RSVP web: Mã thiệp | Xác nhận | Số người | Lời nhắn | Thời gian cập nhật | Số lần gửi
export function rsvpWebRow(e: RsvpEntry, now: Date, count: number): string[] {
  return [e.id, rsvpStatus(e.attending), String(e.people), e.message.trim(), formatSheetTime(now), String(count)]
}

// Số dòng (tính từ 1) của khách trong "RSVP web", hoặc -1. Bỏ qua dòng tiêu đề, khoảng trắng và chữ hoa/thường.
export function findRsvpWebRow(grid: string[][], id: string): number {
  const want = id.trim().toLowerCase()
  if (!want) return -1
  for (let i = 1; i < grid.length; i++) if (str(grid[i]?.[0]).trim().toLowerCase() === want) return i + 1
  return -1
}

export interface SheetsApi {
  getGuestRows(): Promise<string[][]>
  getLogRows(): Promise<string[][]>
  recordRsvp(e: RsvpEntry, now: Date): Promise<void>
}

export type SheetsRequest = (o: { url: string; method?: 'GET' | 'POST'; params?: Record<string, string>; data?: unknown }) => Promise<{ data: any }>

const BASE = 'https://sheets.googleapis.com/v4/spreadsheets'

function defaultRequest(env: SheetsEnv): SheetsRequest {
  return createFetchRequest(createTokenProvider({ email: env.email, privateKey: env.privateKey }))
}

export function createSheetsApi(env: SheetsEnv, request: SheetsRequest = defaultRequest(env)): SheetsApi {
  const quote = (tab: string) => `'${tab.replace(/'/g, "''")}'`
  const enc = (tab: string, cols: string) => encodeURIComponent(`${quote(tab)}!${cols}`)
  const values = async (tab: string, cols: string) => {
    const r = await request({ url: `${BASE}/${env.sheetId}/values/${enc(tab, cols)}` })
    return (r.data?.values ?? []) as string[][]
  }
  const append = (tab: string, cols: string, row: string[]) =>
    request({
      url: `${BASE}/${env.sheetId}/values/${enc(tab, cols)}:append`,
      method: 'POST',
      params: { valueInputOption: 'RAW', insertDataOption: 'INSERT_ROWS' }, // RAW: "=..." được lưu như chữ, không bị tính thành công thức
      data: { values: [row] },
    })
  const update = (tab: string, a1: string, row: string[]) =>
    request({
      url: `${BASE}/${env.sheetId}/values:batchUpdate`,
      method: 'POST',
      data: { valueInputOption: 'RAW', data: [{ range: `${quote(tab)}!${a1}`, values: [row] }] },
    })

  // Đọc rồi ghi thì phải nối đuôi nhau, nếu không hai lần gửi cùng lúc của một khách sẽ tạo hai dòng.
  let chain: Promise<unknown> = Promise.resolve()
  const record = async (e: RsvpEntry, now: Date) => {
    const web = await values(env.rsvpWebTab, 'A:F')
    const row = findRsvpWebRow(web, e.id)
    if (row > 0) {
      const count = (Number(web[row - 1]?.[5]) || 0) + 1
      const own = str(web[row - 1]?.[0]).trim() || e.id // giữ nguyên cách viết mã thiệp trong Sheet, chỉ ghi cột B..F
      await update(env.rsvpWebTab, `B${row}:F${row}`, rsvpWebRow({ ...e, id: own }, now, count).slice(1))
    } else {
      await append(env.rsvpWebTab, 'A:F', rsvpWebRow(e, now, 1))
    }
    await append(env.rsvpLogTab, 'A:E', rsvpLogRow(e, now))
  }

  return {
    getGuestRows: async () => extractGuests(await values(env.guestTab, 'A1:L2000')),
    getLogRows: () => values(env.rsvpLogTab, 'A:E'),
    recordRsvp(e, now) {
      const run = chain.then(() => record(e, now))
      chain = run.catch(() => undefined)
      return run
    },
  }
}
