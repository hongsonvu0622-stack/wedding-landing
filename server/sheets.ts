import { createFetchRequest, createTokenProvider } from './google-auth.js'

export interface SheetsEnv { email: string; privateKey: string; sheetId: string; guestTab: string; responseTab: string }

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
    guestTab: e.GUEST_SHEET_NAME || 'khách mời',
    responseTab: e.RSVP_SHEET_NAME || 'Responses',
  }
}

export function findGuestName(rows: string[][], id: string): string | null {
  const body = rows.slice(1)
  const nameOf = (r: string[]) => (r[1] ?? '').trim() || null
  for (const r of body) if ((r[0] ?? '').trim() === id) return nameOf(r)
  // Some chat apps change the case of a link; accept a case-insensitive match only if it is unambiguous.
  const lower = id.toLowerCase()
  const hits = body.filter((r) => (r[0] ?? '').trim().toLowerCase() === lower)
  return hits.length === 1 ? nameOf(hits[0]) : null
}

export function formatSheetTime(d: Date): string {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Ho_Chi_Minh', hourCycle: 'h23', day: 'numeric', month: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).formatToParts(d).map((x) => [x.type, x.value]),
  )
  return `${p.hour}:${p.minute}:${p.second} ${Number(p.day)}/${Number(p.month)}/${p.year}`
}

export function buildResponseRow(
  p: { name: string; attending: boolean; companions: number; message: string },
  now: Date,
): string[] {
  const total = p.attending ? 1 + p.companions : 0
  return [p.name.trim(), p.attending ? 'Có' : 'Không', String(total), p.message.trim(), formatSheetTime(now)]
}

export interface SheetsApi {
  getGuestRows(): Promise<string[][]>
  appendResponse(row: string[]): Promise<void>
  getResponseRows(): Promise<string[][]>
}

export type SheetsRequest = (o: { url: string; method?: 'GET' | 'POST'; params?: Record<string, string>; data?: unknown }) => Promise<{ data: any }>

const BASE = 'https://sheets.googleapis.com/v4/spreadsheets'

function defaultRequest(env: SheetsEnv): SheetsRequest {
  return createFetchRequest(createTokenProvider({ email: env.email, privateKey: env.privateKey }))
}

export function createSheetsApi(env: SheetsEnv, request: SheetsRequest = defaultRequest(env)): SheetsApi {
  const range = (tab: string, cols: string) => encodeURIComponent(`'${tab.replace(/'/g, "''")}'!${cols}`)
  const values = async (tab: string, cols: string) => {
    const r = await request({ url: `${BASE}/${env.sheetId}/values/${range(tab, cols)}` })
    return (r.data?.values ?? []) as string[][]
  }
  return {
    getGuestRows: () => values(env.guestTab, 'A:B'),
    getResponseRows: () => values(env.responseTab, 'A:E'),
    async appendResponse(row) {
      await request({
        url: `${BASE}/${env.sheetId}/values/${range(env.responseTab, 'A:E')}:append`,
        method: 'POST',
        params: { valueInputOption: 'RAW', insertDataOption: 'INSERT_ROWS' },
        data: { values: [row] },
      })
    },
  }
}
