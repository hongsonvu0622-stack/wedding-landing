import type { SheetsRequest } from './sheets.js'

// Google service-account auth using only Web Crypto + fetch, so it runs on Node 20+, Vercel and Cloudflare Workers alike.
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const SCOPE = 'https://www.googleapis.com/auth/spreadsheets'
const REFRESH_MARGIN_MS = 60_000

const encoder = new TextEncoder()

function b64url(bytes: Uint8Array): string {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function pemToDer(pem: string): Uint8Array<ArrayBuffer> {
  // Keep only base64 characters: tolerates headers, escaped "\n", real newlines and quotes left by env-file parsers.
  const body = pem
    .replace(/-----(BEGIN|END) PRIVATE KEY-----/g, '')
    .replace(/\\n/g, '')
    .replace(/[^A-Za-z0-9+/=]/g, '')
  const bin = atob(body)
  return Uint8Array.from(bin, (c) => c.charCodeAt(0))
}

export async function signJwt(claims: Record<string, string | number>, privateKeyPem: string): Promise<string> {
  let key: CryptoKey
  try {
    key = await crypto.subtle.importKey('pkcs8', pemToDer(privateKeyPem), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign'])
  } catch {
    throw new Error('Invalid service account key')
  }
  const head = b64url(encoder.encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' })))
  const payload = b64url(encoder.encode(JSON.stringify(claims)))
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, encoder.encode(`${head}.${payload}`))
  return `${head}.${payload}.${b64url(new Uint8Array(sig))}`
}

export function createTokenProvider(
  env: { email: string; privateKey: string },
  fetchImpl: typeof fetch = fetch,
  now: () => number = Date.now,
): () => Promise<string> {
  let token: string | null = null
  let expiresAt = 0
  let inflight: Promise<string> | null = null

  const exchange = async (): Promise<string> => {
    const iat = Math.floor(now() / 1000)
    const assertion = await signJwt({ iss: env.email, scope: SCOPE, aud: TOKEN_URL, iat, exp: iat + 3600 }, env.privateKey)
    const res = await fetchImpl(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }).toString(),
    })
    if (!res.ok) throw new Error(`Token exchange failed (${res.status})`)
    const data = (await res.json()) as { access_token?: string; expires_in?: number }
    if (!data.access_token) throw new Error('Token exchange failed (no token)')
    token = data.access_token
    expiresAt = now() + (data.expires_in ?? 3600) * 1000
    return token
  }

  return async () => {
    if (token && now() < expiresAt - REFRESH_MARGIN_MS) return token
    inflight ??= exchange().finally(() => { inflight = null })
    return inflight
  }
}

export function createFetchRequest(
  getToken: () => Promise<string>,
  fetchImpl: typeof fetch = fetch,
  timeoutMs = 8000,
): SheetsRequest {
  return async (o) => {
    const query = o.params ? new URLSearchParams(o.params).toString() : ''
    const url = query ? `${o.url}${o.url.includes('?') ? '&' : '?'}${query}` : o.url
    const headers: Record<string, string> = { Authorization: `Bearer ${await getToken()}` }
    if (o.data !== undefined) headers['Content-Type'] = 'application/json'
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), timeoutMs)
    try {
      const res = await fetchImpl(url, {
        method: o.method ?? 'GET',
        headers,
        body: o.data !== undefined ? JSON.stringify(o.data) : undefined,
        signal: ctrl.signal,
      })
      if (!res.ok) throw new Error(`Sheets request failed (${res.status})`)
      return { data: await res.json() }
    } finally {
      clearTimeout(timer)
    }
  }
}
