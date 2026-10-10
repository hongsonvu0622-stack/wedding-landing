import fs from 'node:fs'
import http, { type IncomingMessage, type ServerResponse } from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import guest from '../api/guest.js'
import rsvp from '../api/rsvp.js'
import wishes from '../api/wishes.js'

type Route = (req: IncomingMessage, res: ServerResponse) => Promise<void> | void

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webp': 'image/webp',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.m4a': 'audio/mp4', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.webmanifest': 'application/manifest+json; charset=utf-8',
}

const SECURITY: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'SAMEORIGIN',
}

const HOST = /^[a-z0-9.-]+(:\d{1,5})?$/i
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.split(',')[0].trim()

// Public origin used for absolute URLs in social metadata. Only plain http(s) hosts are accepted: nothing else can reach the HTML.
export function resolveOrigin(
  headers: { host?: string; 'x-forwarded-host'?: string | string[]; 'x-forwarded-proto'?: string | string[] },
  siteUrl?: string,
): string {
  if (siteUrl) {
    const url = siteUrl.trim().replace(/\/+$/, '')
    return /^https?:\/\/[a-z0-9.-]+(:\d{1,5})?$/i.test(url) ? url : ''
  }
  const host = first(headers['x-forwarded-host']) ?? headers.host
  if (!host || !HOST.test(host)) return ''
  const proto = first(headers['x-forwarded-proto'])
  return `${proto === 'https' ? 'https' : 'http'}://${host}`
}

function json(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(body))
}

function cacheControl(urlPath: string): string {
  if (urlPath.startsWith('/assets/')) return 'public, max-age=31536000, immutable'
  if (urlPath === '/' || urlPath.endsWith('.html')) return 'no-cache'
  return 'public, max-age=604800'
}

// Resolves a request path to a file inside distDir, or null if it escapes the folder or does not exist.
function resolveFile(distDir: string, urlPath: string): string | null {
  let decoded: string
  try { decoded = decodeURIComponent(urlPath) } catch { return null }
  if (decoded.includes('\0') || decoded.includes('\\')) return null
  const root = path.resolve(distDir)
  const file = path.resolve(root, '.' + decoded)
  if (file !== root && !file.startsWith(root + path.sep)) return null
  try {
    return fs.statSync(file).isFile() ? file : null
  } catch {
    return null
  }
}

export function createAppServer(opts: { distDir: string; routes?: Record<string, Route>; siteUrl?: string }) {
  const routes: Record<string, Route> = opts.routes ?? { guest, rsvp, wishes }
  const index = path.join(opts.distDir, 'index.html')
  const siteUrl = opts.siteUrl ?? process.env.SITE_URL
  let template: string | undefined

  // index.html carries __ORIGIN__ placeholders; every page view gets absolute URLs for the host it was served from.
  const sendIndex = (req: IncomingMessage, res: ServerResponse) => {
    template ??= fs.readFileSync(index, 'utf8')
    const body = Buffer.from(template.replaceAll('__ORIGIN__', resolveOrigin(req.headers, siteUrl)))
    res.statusCode = 200
    res.setHeader('Content-Type', TYPES['.html'])
    res.setHeader('Cache-Control', 'no-cache')
    if (!siteUrl) res.setHeader('Vary', 'X-Forwarded-Host, X-Forwarded-Proto, Host')
    res.setHeader('Content-Length', body.length)
    res.end(req.method === 'HEAD' ? undefined : body)
  }

  const sendFile = (req: IncomingMessage, res: ServerResponse, file: string, urlPath: string) => {
    const size = fs.statSync(file).size
    res.setHeader('Content-Type', TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream')
    res.setHeader('Cache-Control', cacheControl(urlPath))
    res.setHeader('Accept-Ranges', 'bytes')

    let start = 0
    let end = size - 1
    const range = req.headers.range
    if (range) {
      const m = /^bytes=(\d*)-(\d*)$/.exec(range.trim())
      if (m && (m[1] !== '' || m[2] !== '')) {
        if (m[1] === '') { start = Math.max(0, size - Number(m[2])) } // suffix: last N bytes
        else { start = Number(m[1]); if (m[2] !== '') end = Math.min(Number(m[2]), size - 1) }
        if (start > end || start >= size) {
          res.statusCode = 416
          res.setHeader('Content-Range', `bytes */${size}`)
          return res.end()
        }
        res.statusCode = 206
        res.setHeader('Content-Range', `bytes ${start}-${end}/${size}`)
      } else if (m) {
        res.statusCode = 416
        res.setHeader('Content-Range', `bytes */${size}`)
        return res.end()
      }
    }
    if (res.statusCode !== 206) res.statusCode = 200
    res.setHeader('Content-Length', end - start + 1)
    if (req.method === 'HEAD') return res.end()
    fs.createReadStream(file, { start, end }).on('error', () => res.destroy()).pipe(res)
  }

  return http.createServer(async (req, res) => {
    for (const [k, v] of Object.entries(SECURITY)) res.setHeader(k, v)
    const urlPath = (req.url ?? '/').split('?')[0]

    if (urlPath === '/healthz') {
      res.statusCode = 200
      res.setHeader('Content-Type', 'text/plain')
      return res.end('ok')
    }

    if (urlPath.startsWith('/api/')) {
      const name = urlPath.slice('/api/'.length)
      const route = Object.hasOwn(routes, name) ? routes[name] : undefined
      if (!route) return json(res, 404, { error: 'Not found' })
      try {
        await route(req, res)
      } catch {
        if (!res.headersSent) json(res, 500, { error: 'Server error' })
        else res.end()
      }
      return
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.setHeader('Allow', 'GET, HEAD')
      return json(res, 405, { error: 'Method not allowed' })
    }

    if (urlPath === '/' || urlPath === '/index.html') return sendIndex(req, res)
    const target = resolveFile(opts.distDir, urlPath)
    if (target) return sendFile(req, res, target, urlPath)
    // Unknown file with an extension is a real 404; extensionless paths are guest links handled by the SPA.
    if (path.extname(urlPath)) return json(res, 404, { error: 'Not found' })
    return sendIndex(req, res)
  })
}

const isEntry = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
if (isEntry) {
  const port = Number(process.env.PORT ?? 3000)
  const distDir = process.env.DIST_DIR ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist')
  const server = createAppServer({ distDir })
  server.listen(port, '0.0.0.0', () => console.log(`Wedding site listening on :${port}`))
  const stop = () => server.close(() => process.exit(0))
  process.on('SIGTERM', stop)
  process.on('SIGINT', stop)
}
