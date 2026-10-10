import type { IncomingMessage, ServerResponse } from 'node:http'
import { getHandlers } from '../server/runtime'
import { readJson, send } from '../server/http'

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') return send(res, { status: 405, body: { error: 'Method not allowed' } })
  let body: unknown
  try {
    body = await readJson(req)
  } catch {
    return send(res, { status: 400, body: { error: 'Invalid body' } })
  }
  try {
    send(res, await getHandlers().rsvp(body))
  } catch {
    send(res, { status: 500, body: { error: 'Server not configured' } })
  }
}
