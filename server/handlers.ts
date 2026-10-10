import { looksLikeId, sanitizeName } from '../src/lib/guests.js'
import { validateRsvp } from '../src/lib/rsvp.js'
import { buildResponseRow, findGuestName, type SheetsApi } from './sheets.js'

export interface HttpResult { status: number; body: unknown }

const GUEST_TTL = 20_000
const WISH_TTL = 30_000
const IP_LIMIT = 5
const IP_WINDOW = 10 * 60_000
const GLOBAL_LIMIT = 100
const GLOBAL_WINDOW = 60 * 60_000
const LINKISH = /(https?:\/\/|www\.|\b[\w-]+\.(com|vn|net|org|info|xyz|top|io|me|co)\b)/i
const TOO_MANY: HttpResult = { status: 429, body: { error: 'Bạn gửi quá nhanh, vui lòng thử lại sau ít phút.' } }
const BAD_GATEWAY: HttpResult = { status: 502, body: { error: 'Không kết nối được bảng tính. Vui lòng thử lại sau.' } }

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// One quick retry smooths over transient Google errors (rate limit blips, network resets).
async function withRetry<T>(fn: () => Promise<T>, delayMs: number): Promise<T> {
  try {
    return await fn()
  } catch {
    await sleep(delayMs)
    return fn()
  }
}

// Stale-while-revalidate: the first call waits for the load; afterwards every call is instant.
// Once the TTL passes, one background refresh runs and the previous value keeps being served,
// so a slow or failing Google call never reaches a visitor.
function swr<T>(ttl: number, now: () => number, load: () => Promise<T>) {
  let value: T | undefined
  let at = -Infinity
  let inflight: Promise<T> | null = null
  const refresh = (): Promise<T> =>
    (inflight ??= load()
      .then((v) => { value = v; at = now(); return v })
      .finally(() => { inflight = null }))
  return async (): Promise<T> => {
    if (value === undefined) return refresh()
    if (now() - at >= ttl) refresh().catch(() => { /* keep serving the last good value */ })
    return value
  }
}

export function createHandlers(api: SheetsApi, opts: { now?: () => number; retryDelayMs?: number } = {}) {
  const now = opts.now ?? Date.now
  const retryDelay = opts.retryDelayMs ?? 300
  const guestRows = swr(GUEST_TTL, now, () => withRetry(() => api.getGuestRows(), retryDelay))
  const responseRows = swr(WISH_TTL, now, () => withRetry(() => api.getResponseRows(), retryDelay))
  const byIp = new Map<string, number[]>()
  let all: number[] = []

  // Best-effort, per warm instance: it blunts scripted spam without needing a database.
  const throttled = (ip: string): boolean => {
    const t = now()
    all = all.filter((x) => t - x < GLOBAL_WINDOW)
    const mine = (byIp.get(ip) ?? []).filter((x) => t - x < IP_WINDOW)
    if (mine.length >= IP_LIMIT || all.length >= GLOBAL_LIMIT) {
      byIp.set(ip, mine)
      return true
    }
    mine.push(t)
    all.push(t)
    byIp.set(ip, mine)
    return false
  }

  return {
    // Preload the guest list at startup so the first visitor does not wait for Google.
    async warm(): Promise<void> {
      await guestRows().then(() => undefined, () => undefined)
    },

    async guest(id: string | undefined): Promise<HttpResult> {
      if (!id || !looksLikeId(id)) return { status: 400, body: { error: 'Invalid id' } }
      try {
        return { status: 200, body: { name: findGuestName(await guestRows(), id) } }
      } catch {
        return BAD_GATEWAY
      }
    },

    async rsvp(body: unknown, ctx: { ip?: string } = {}): Promise<HttpResult> {
      const b = body as Record<string, unknown> | null
      if (
        !b || typeof b !== 'object' || typeof b.name !== 'string' || typeof b.attending !== 'boolean' ||
        typeof b.companions !== 'number' || typeof b.message !== 'string'
      ) return { status: 400, body: { error: 'Invalid body' } }
      const payload = { name: b.name, attending: b.attending, companions: b.companions, message: b.message }
      const errors = validateRsvp(payload)
      if (Object.keys(errors).length) return { status: 400, body: { errors } }
      if (throttled(ctx.ip ?? 'unknown')) return TOO_MANY
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
          .filter((w) => w.message && !LINKISH.test(w.message))
          .slice(-30)
          .reverse()
        return { status: 200, body: wishes }
      } catch {
        return { status: 200, body: [] }
      }
    },
  }
}
