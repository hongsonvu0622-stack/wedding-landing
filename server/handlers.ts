import { looksLikeId, sanitizeName } from '../src/lib/guests'
import { validateRsvp } from '../src/lib/rsvp'
import { buildResponseRow, findGuestName, type SheetsApi } from './sheets'

export interface HttpResult { status: number; body: unknown }

const GUEST_TTL = 60_000
const WISH_TTL = 30_000
const BAD_GATEWAY: HttpResult = { status: 502, body: { error: 'Không kết nối được bảng tính. Vui lòng thử lại sau.' } }

function cached<T>(ttl: number, now: () => number, load: () => Promise<T>) {
  let value: T | undefined
  let at = -Infinity
  return async () => {
    if (value === undefined || now() - at >= ttl) {
      value = await load()
      at = now()
    }
    return value
  }
}

export function createHandlers(api: SheetsApi, opts: { now?: () => number } = {}) {
  const now = opts.now ?? Date.now
  const guestRows = cached(GUEST_TTL, now, () => api.getGuestRows())
  const responseRows = cached(WISH_TTL, now, () => api.getResponseRows())

  return {
    async guest(id: string | undefined): Promise<HttpResult> {
      if (!id || !looksLikeId(id)) return { status: 400, body: { error: 'Invalid id' } }
      try {
        return { status: 200, body: { name: findGuestName(await guestRows(), id) } }
      } catch {
        return BAD_GATEWAY
      }
    },

    async rsvp(body: unknown): Promise<HttpResult> {
      const b = body as Record<string, unknown> | null
      if (
        !b || typeof b !== 'object' || typeof b.name !== 'string' || typeof b.attending !== 'boolean' ||
        typeof b.companions !== 'number' || typeof b.message !== 'string'
      ) return { status: 400, body: { error: 'Invalid body' } }
      const payload = { name: b.name, attending: b.attending, companions: b.companions, message: b.message }
      const errors = validateRsvp(payload)
      if (Object.keys(errors).length) return { status: 400, body: { errors } }
      try {
        await api.appendResponse(buildResponseRow({ ...payload, name: sanitizeName(payload.name) ?? payload.name }, new Date(now())))
        return { status: 200, body: { ok: true } }
      } catch {
        return BAD_GATEWAY
      }
    },

    async wishes(): Promise<HttpResult> {
      try {
        const rows = (await responseRows()).slice(1)
        const wishes = rows
          .map((r) => ({ name: (r[0] ?? '').trim(), message: (r[3] ?? '').trim(), at: r[4] ?? '' }))
          .filter((w) => w.message)
          .slice(-30)
          .reverse()
        return { status: 200, body: wishes }
      } catch {
        return { status: 200, body: [] }
      }
    },
  }
}
