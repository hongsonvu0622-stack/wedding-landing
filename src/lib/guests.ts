export const DEFAULT_GUEST = 'Quý khách'
const MAX_NAME = 60
const ID_LIKE = /^[A-Za-z0-9_-]{1,40}$/

export function sanitizeName(raw: string | null | undefined): string | null {
  if (!raw) return null
  // eslint-disable-next-line no-control-regex
  const cleaned = raw.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, MAX_NAME).trim()
  return cleaned || null
}

export function looksLikeId(s: string): boolean {
  return ID_LIKE.test(s)
}

export interface GuestRef { id: string | null; freeText: string | null }

function safeDecode(s: string): string {
  try { return decodeURIComponent(s) } catch { return s }
}

export function readGuestRef(loc: { pathname: string; search: string }): GuestRef {
  const seg = safeDecode(loc.pathname.split('/').filter(Boolean)[0] ?? '')
  if (looksLikeId(seg)) return { id: seg, freeText: null }
  const q = sanitizeName(new URLSearchParams(loc.search).get('to'))
  if (!q) return { id: null, freeText: null }
  return looksLikeId(q) ? { id: q, freeText: null } : { id: null, freeText: q }
}

export async function fetchGuestName(id: string, fetchImpl: typeof fetch = fetch, timeoutMs = 4000): Promise<string | null> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetchImpl(`/api/guest?id=${encodeURIComponent(id)}`, { signal: ctrl.signal })
    if (!res.ok) return null
    const data = await res.json()
    return sanitizeName(typeof data?.name === 'string' ? data.name : null)
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}
