import type { IncomingMessage, ServerResponse } from 'node:http'
import type { HttpResult } from './handlers'

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
