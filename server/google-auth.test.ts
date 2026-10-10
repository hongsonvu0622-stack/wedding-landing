// @vitest-environment node
import { generateKeyPairSync, verify } from 'node:crypto'
import { createFetchRequest, createTokenProvider, signJwt } from './google-auth'

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
const pem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString()
const b64u = (s: string) => Buffer.from(s, 'base64url')

describe('signJwt', () => {
  test('produces an RS256 JWT that the matching public key verifies, with the given claims', async () => {
    const jwt = await signJwt({ iss: 'sa@x', scope: 's', aud: 'a', iat: 100, exp: 3700 }, pem)
    const [h, p, sig] = jwt.split('.')
    expect(JSON.parse(b64u(h).toString())).toEqual({ alg: 'RS256', typ: 'JWT' })
    expect(JSON.parse(b64u(p).toString())).toEqual({ iss: 'sa@x', scope: 's', aud: 'a', iat: 100, exp: 3700 })
    const ok = verify('RSA-SHA256', Buffer.from(`${h}.${p}`), publicKey, b64u(sig))
    expect(ok).toBe(true)
  })
  test('accepts a key whose newlines are escaped as \\n (how env files store it)', async () => {
    const escaped = pem.replace(/\n/g, '\\n')
    await expect(signJwt({ iss: 'a', scope: 's', aud: 'a', iat: 1, exp: 2 }, escaped)).resolves.toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/)
  })
  test('accepts a key wrapped in quotes (what some env-file parsers leave behind)', async () => {
    const quoted = `"${pem.replace(/\n/g, '\\n')}"`
    await expect(signJwt({ iss: 'a', scope: 's', aud: 'a', iat: 1, exp: 2 }, quoted)).resolves.toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/)
  })
  test('rejects a malformed key with a generic error that does not echo the key', async () => {
    const bad = 'SECRET-NOT-A-KEY'
    await expect(signJwt({ iss: 'a', scope: 's', aud: 'a', iat: 1, exp: 2 }, bad)).rejects.toThrow()
    try { await signJwt({ iss: 'a', scope: 's', aud: 'a', iat: 1, exp: 2 }, bad) } catch (e) { expect(String(e)).not.toContain('SECRET') }
  })
})

describe('createTokenProvider', () => {
  const env = { email: 'sa@x', privateKey: pem }
  const tokenFetch = (token = 'tok1', expires = 3600) =>
    vi.fn().mockResolvedValue({ ok: true, json: async () => ({ access_token: token, expires_in: expires }) })

  test('exchanges a signed assertion for an access token', async () => {
    const f = tokenFetch()
    const token = await createTokenProvider(env, f as unknown as typeof fetch, () => 1_000_000)()
    expect(token).toBe('tok1')
    const [url, init] = f.mock.calls[0]
    expect(url).toBe('https://oauth2.googleapis.com/token')
    expect(init.method).toBe('POST')
    const body = new URLSearchParams(init.body)
    expect(body.get('grant_type')).toBe('urn:ietf:params:oauth:grant-type:jwt-bearer')
    expect(body.get('assertion')).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/)
  })
  test('caches the token until shortly before it expires, then refreshes', async () => {
    const f = tokenFetch('a', 3600)
    let t = 0
    const get = createTokenProvider(env, f as unknown as typeof fetch, () => t)
    await get(); await get()
    expect(f).toHaveBeenCalledTimes(1)
    t = (3600 - 30) * 1000
    await get()
    expect(f).toHaveBeenCalledTimes(2)
  })
  test('concurrent callers share one in-flight exchange', async () => {
    const f = tokenFetch()
    const get = createTokenProvider(env, f as unknown as typeof fetch, () => 0)
    await Promise.all([get(), get(), get()])
    expect(f).toHaveBeenCalledTimes(1)
  })
  test('a failed exchange throws a generic error and is retried next time', async () => {
    const f = vi.fn().mockResolvedValueOnce({ ok: false, status: 400, text: async () => 'invalid_grant SECRET' })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'ok', expires_in: 3600 }) })
    const get = createTokenProvider(env, f as unknown as typeof fetch, () => 0)
    await expect(get()).rejects.toThrow(/token/i)
    await get().then((t) => expect(t).toBe('ok'))
    try { await createTokenProvider(env, vi.fn().mockResolvedValue({ ok: false, status: 400, text: async () => 'SECRET' }) as unknown as typeof fetch, () => 0)() } catch (e) { expect(String(e)).not.toContain('SECRET') }
  })
})

describe('createFetchRequest', () => {
  test('GET sends the bearer token and returns parsed JSON as {data}', async () => {
    const f = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ values: [['a']] }) })
    const req = createFetchRequest(async () => 'T', f as unknown as typeof fetch)
    expect(await req({ url: 'https://s/x' })).toEqual({ data: { values: [['a']] } })
    const [url, init] = f.mock.calls[0]
    expect(url).toBe('https://s/x')
    expect(init.method).toBe('GET')
    expect(init.headers.Authorization).toBe('Bearer T')
  })
  test('POST sends query params and a JSON body', async () => {
    const f = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
    await createFetchRequest(async () => 'T', f as unknown as typeof fetch)({
      url: 'https://s/x:append', method: 'POST', params: { valueInputOption: 'RAW', insertDataOption: 'INSERT_ROWS' }, data: { values: [['=1']] },
    })
    const [url, init] = f.mock.calls[0]
    expect(url).toBe('https://s/x:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS')
    expect(init.headers['Content-Type']).toBe('application/json')
    expect(JSON.parse(init.body)).toEqual({ values: [['=1']] })
  })
  test('a non-OK reply throws a generic error without the upstream body', async () => {
    const f = vi.fn().mockResolvedValue({ ok: false, status: 403, text: async () => 'PERMISSION SECRET detail' })
    const req = createFetchRequest(async () => 'T', f as unknown as typeof fetch)
    await expect(req({ url: 'https://s/x' })).rejects.toThrow(/403/)
    await req({ url: 'https://s/x' }).catch((e) => expect(String(e)).not.toContain('SECRET'))
  })
  test('times out a hung request', async () => {
    const hang = vi.fn((_u: string, init?: RequestInit) => new Promise((_r, rej) => init?.signal?.addEventListener('abort', () => rej(new Error('abort')))))
    const req = createFetchRequest(async () => 'T', hang as unknown as typeof fetch, 20)
    await expect(req({ url: 'https://s/x' })).rejects.toThrow()
  })
})
