import type { IncomingMessage, ServerResponse } from 'node:http'
import { getHandlers } from '../server/runtime.js'
import { send } from '../server/http.js'

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'GET') return send(res, { status: 405, body: { error: 'Method not allowed' } })
  try {
    const id = new URL(req.url ?? '', 'http://localhost').searchParams.get('id') ?? undefined
    send(res, await getHandlers().guest(id))
  } catch {
    send(res, { status: 500, body: { error: 'Server not configured' } })
  }
}
