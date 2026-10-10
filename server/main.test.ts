// @vitest-environment node
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import type { AddressInfo } from 'node:net'
import { createAppServer } from './main'

let dir: string
let server: ReturnType<typeof createAppServer>
let base: string
const apiCalls: string[] = []

beforeAll(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dist-'))
  fs.mkdirSync(path.join(dir, 'assets'))
  fs.mkdirSync(path.join(dir, 'img'))
  fs.writeFileSync(path.join(dir, 'index.html'), '<!doctype html><title>spa</title>')
  fs.writeFileSync(path.join(dir, 'assets', 'app-abc.js'), 'console.log(1)')
  fs.writeFileSync(path.join(dir, 'img', 'a-640.webp'), 'webp')
  fs.writeFileSync(path.join(os.tmpdir(), 'secret-outside.txt'), 'SECRET')
  server = createAppServer({
    distDir: dir,
    routes: {
      guest: async (req, res) => { apiCalls.push(req.url ?? ''); res.setHeader('Content-Type', 'application/json'); res.end('{"name":"X"}') },
    },
  })
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r))
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})
afterAll(async () => {
  await new Promise((r) => server.close(r))
  fs.rmSync(dir, { recursive: true, force: true })
  fs.rmSync(path.join(os.tmpdir(), 'secret-outside.txt'), { force: true })
})

test('GET / serves index.html without caching', async () => {
  const r = await fetch(`${base}/`)
  expect(r.status).toBe(200)
  expect(await r.text()).toContain('<title>spa</title>')
  expect(r.headers.get('content-type')).toMatch(/text\/html/)
  expect(r.headers.get('cache-control')).toBe('no-cache')
})

test('guest links (/<ID>) fall back to index.html', async () => {
  const r = await fetch(`${base}/9WNYt0`)
  expect(r.status).toBe(200)
  expect(await r.text()).toContain('<title>spa</title>')
})

test('hashed assets are cached for a year and immutable; images for a week', async () => {
  const a = await fetch(`${base}/assets/app-abc.js`)
  expect(a.headers.get('cache-control')).toBe('public, max-age=31536000, immutable')
  expect(a.headers.get('content-type')).toMatch(/javascript/)
  const i = await fetch(`${base}/img/a-640.webp`)
  expect(i.headers.get('cache-control')).toBe('public, max-age=604800')
  expect(i.headers.get('content-type')).toBe('image/webp')
})

test('a missing file with an extension is a real 404, not the SPA page', async () => {
  const r = await fetch(`${base}/img/missing.webp`)
  expect(r.status).toBe(404)
  expect(await r.text()).not.toContain('<title>spa</title>')
})

test('path traversal never leaves the dist folder', async () => {
  for (const p of ['/..%2fsecret-outside.txt', '/%2e%2e/secret-outside.txt', '/../secret-outside.txt', '/assets/..%2f..%2fsecret-outside.txt', '/%00', '/..\\secret-outside.txt']) {
    const r = await fetch(`${base}${p}`)
    expect(await r.text()).not.toContain('SECRET')
  }
})

test('/healthz answers ok for container health checks', async () => {
  const r = await fetch(`${base}/healthz`)
  expect(r.status).toBe(200)
  expect(await r.text()).toBe('ok')
})

test('/api/<name> is routed to the handler with the original url; unknown api names are 404 JSON', async () => {
  const r = await fetch(`${base}/api/guest?id=abc`)
  expect(await r.json()).toEqual({ name: 'X' })
  expect(apiCalls).toContain('/api/guest?id=abc')
  const u = await fetch(`${base}/api/nope`)
  expect(u.status).toBe(404)
  expect(u.headers.get('content-type')).toMatch(/json/)
})

test('a throwing API handler becomes a generic 500', async () => {
  const s2 = createAppServer({ distDir: dir, routes: { guest: async () => { throw new Error('SECRET-KEY boom') } } })
  await new Promise<void>((r) => s2.listen(0, '127.0.0.1', r))
  const r = await fetch(`http://127.0.0.1:${(s2.address() as AddressInfo).port}/api/guest`)
  const text = await r.text()
  expect(r.status).toBe(500)
  expect(text).not.toContain('SECRET')
  await new Promise((res) => s2.close(res))
})

test('only GET and HEAD are served for static paths', async () => {
  expect((await fetch(`${base}/`, { method: 'POST' })).status).toBe(405)
  const h = await fetch(`${base}/`, { method: 'HEAD' })
  expect(h.status).toBe(200)
  expect(await h.text()).toBe('')
})

test('responses carry basic security headers', async () => {
  const r = await fetch(`${base}/`)
  expect(r.headers.get('x-content-type-options')).toBe('nosniff')
  expect(r.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin')
})

test('byte ranges are supported (iOS Safari will not play audio without them)', async () => {
  fs.writeFileSync(path.join(dir, 'img', 'song.m4a'), '0123456789')
  const full = await fetch(`${base}/img/song.m4a`)
  expect(full.headers.get('accept-ranges')).toBe('bytes')
  const part = await fetch(`${base}/img/song.m4a`, { headers: { Range: 'bytes=2-5' } })
  expect(part.status).toBe(206)
  expect(part.headers.get('content-range')).toBe('bytes 2-5/10')
  expect(part.headers.get('content-length')).toBe('4')
  expect(await part.text()).toBe('2345')
  const open = await fetch(`${base}/img/song.m4a`, { headers: { Range: 'bytes=7-' } })
  expect(open.status).toBe(206)
  expect(await open.text()).toBe('789')
  const suffix = await fetch(`${base}/img/song.m4a`, { headers: { Range: 'bytes=-3' } })
  expect(await suffix.text()).toBe('789')
})

test('an unsatisfiable or malformed range answers 416 with the file size', async () => {
  const r = await fetch(`${base}/img/song.m4a`, { headers: { Range: 'bytes=50-60' } })
  expect(r.status).toBe(416)
  expect(r.headers.get('content-range')).toBe('bytes */10')
  const bad = await fetch(`${base}/img/song.m4a`, { headers: { Range: 'bytes=abc' } })
  expect([200, 416]).toContain(bad.status)
})
