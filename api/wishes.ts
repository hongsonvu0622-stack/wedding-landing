import type { IncomingMessage, ServerResponse } from 'node:http'
import { getHandlers } from '../server/runtime.js'
import { send } from '../server/http.js'

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'GET') return send(res, { status: 405, body: { error: 'Method not allowed' } })
  try {
    send(res, await getHandlers().wishes())
  } catch {
    send(res, { status: 200, body: [] })
  }
}
