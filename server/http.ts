import type { IncomingMessage, ServerResponse } from 'node:http'
import type { HttpResult } from './handlers.js'

export function send(res: ServerResponse, r: HttpResult): void {
  res.statusCode = r.status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(r.body))
}

export async function readJson(req: IncomingMessage & { body?: unknown }, limit = 10_000): Promise<unknown> {
  if (req.body !== undefined) return typeof req.body === 'string' ? JSON.parse(req.body) : req.body // Vercel pre-parses
  const chunks: Buffer[] = []
  let size = 0
  for await (const c of req) {
    size += (c as Buffer).length
    if (size > limit) throw new Error('Body too large')
    chunks.push(c as Buffer)
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

export interface RsvpRequestHeaders { contentType?: string; origin?: string; host?: string }

// Blocks cross-site "simple" requests (text/plain forms) and browser requests from other origins.
export function checkRsvpRequest(h: RsvpRequestHeaders): HttpResult | null {
  if (!/^application\/json\b/i.test(h.contentType ?? '')) return { status: 415, body: { error: 'Unsupported content type' } }
  if (h.origin) {
    let originHost: string | null = null
    try { originHost = new URL(h.origin).host } catch { /* invalid origin */ }
    if (!originHost || originHost !== h.host) return { status: 403, body: { error: 'Forbidden' } }
  }
  return null
}

// Real client address for rate limiting. Only the entries added by our own proxies are trustworthy:
// with `hops` trusted proxies in front, that is the hops-th entry from the end of X-Forwarded-For.
export function clientIp(
  headers: { 'x-forwarded-for'?: string | string[] },
  remoteAddress: string | undefined,
  hops = 1,
): string {
  const xff = headers['x-forwarded-for']
  const raw = Array.isArray(xff) ? xff.join(',') : xff
  if (hops > 0 && raw) {
    const parts = raw.split(',').map((s) => s.trim()).filter(Boolean)
    const ip = parts[parts.length - hops] ?? parts[0]
    if (ip) return ip
  }
  return remoteAddress || 'unknown'
}
