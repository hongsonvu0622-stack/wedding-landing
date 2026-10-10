import type { IncomingMessage, ServerResponse } from 'node:http'
import { getHandlers } from '../server/runtime.js'
import { checkRsvpRequest, clientIp, readJson, send } from '../server/http.js'

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') return send(res, { status: 405, body: { error: 'Method not allowed' } })
  const h = req.headers
  const rejected = checkRsvpRequest({
    contentType: h['content-type'],
    origin: h.origin,
    host: (h['x-forwarded-host'] as string | undefined) ?? h.host,
  })
  if (rejected) return send(res, rejected)
  const ip = clientIp({ 'x-forwarded-for': h['x-forwarded-for'] }, req.socket.remoteAddress, Number(process.env.TRUSTED_PROXY_HOPS ?? 1))
  let body: unknown
  try {
    body = await readJson(req)
  } catch {
    return send(res, { status: 400, body: { error: 'Invalid body' } })
  }
  try {
    send(res, await getHandlers().rsvp(body, { ip }))
  } catch {
    send(res, { status: 500, body: { error: 'Server not configured' } })
  }
}
