import { DEFAULT_GUEST, fetchGuestName, looksLikeId, readGuestRef, sanitizeName } from './guests'

describe('sanitizeName', () => {
  test('trims, collapses whitespace, strips control characters, truncates to 60', () => {
    expect(sanitizeName('  Anh \n  Minh\u0007 ')).toBe('Anh Minh')
    expect(sanitizeName('a'.repeat(500))).toHaveLength(60)
  })
  test('returns null for empty, whitespace-only or missing input', () => {
    expect(sanitizeName('   ')).toBeNull()
    expect(sanitizeName(null)).toBeNull()
    expect(sanitizeName(undefined)).toBeNull()
  })
  test('keeps HTML as inert text (React escapes it on render)', () => {
    expect(sanitizeName('<script>alert(1)</script>')).toBe('<script>alert(1)</script>')
  })
})

describe('looksLikeId', () => {
  test.each(['HaHxtn', '9WNYt0', '123', 'a_b-c'])('accepts %s', (v) => expect(looksLikeId(v)).toBe(true))
  test.each(['', 'Anh Minh', 'Chị', 'a.b', 'x'.repeat(41), '<b>'])('rejects %j', (v) => expect(looksLikeId(v)).toBe(false))
})

describe('readGuestRef', () => {
  test('takes the id from the first path segment', () => {
    expect(readGuestRef({ pathname: '/HaHxtn', search: '' })).toEqual({ id: 'HaHxtn', freeText: null })
    expect(readGuestRef({ pathname: '/HaHxtn/', search: '' }).id).toBe('HaHxtn')
  })
  test('takes the id from ?to= when the path is empty', () => {
    expect(readGuestRef({ pathname: '/', search: '?to=9WNYt0' })).toEqual({ id: '9WNYt0', freeText: null })
  })
  test('the path wins over ?to=', () => {
    expect(readGuestRef({ pathname: '/abc', search: '?to=xyz' }).id).toBe('abc')
  })
  test('?to= with spaces or diacritics is free text, never an id', () => {
    expect(readGuestRef({ pathname: '/', search: '?to=Anh%20Minh%20%26%20Ch%E1%BB%8B%20Lan' })).toEqual({ id: null, freeText: 'Anh Minh & Chị Lan' })
  })
  test('HTML in ?to= stays inert text and is truncated', () => {
    const r = readGuestRef({ pathname: '/', search: '?to=' + encodeURIComponent('<img src=x onerror=alert(1)>' + 'z'.repeat(100)) })
    expect(r.id).toBeNull()
    expect(r.freeText!.startsWith('<img src=x')).toBe(true)
    expect(r.freeText!.length).toBe(60)
  })
  test('no path and no query -> nothing', () => {
    expect(readGuestRef({ pathname: '/', search: '' })).toEqual({ id: null, freeText: null })
    expect(readGuestRef({ pathname: '/', search: '?to=%20%20' })).toEqual({ id: null, freeText: null })
  })
  test('a malformed percent-escape in the path does not throw', () => {
    expect(() => readGuestRef({ pathname: '/%E0%A4%A', search: '' })).not.toThrow()
  })
})

describe('fetchGuestName', () => {
  const ok = (body: unknown) => vi.fn().mockResolvedValue({ ok: true, json: async () => body })
  test('returns the sanitized name and encodes the id', async () => {
    const f = ok({ name: '  Ánh Nguyệt ' })
    expect(await fetchGuestName('a b', f as unknown as typeof fetch)).toBe('Ánh Nguyệt')
    expect(f.mock.calls[0][0]).toBe('/api/guest?id=a%20b')
  })
  test('null when the server has no such guest', async () => {
    expect(await fetchGuestName('x', ok({ name: null }) as unknown as typeof fetch)).toBeNull()
  })
  test('null on network error, non-OK status, bad JSON or timeout', async () => {
    expect(await fetchGuestName('x', vi.fn().mockRejectedValue(new Error('net')) as unknown as typeof fetch)).toBeNull()
    expect(await fetchGuestName('x', vi.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch)).toBeNull()
    expect(await fetchGuestName('x', vi.fn().mockResolvedValue({ ok: true, json: async () => { throw new Error('bad') } }) as unknown as typeof fetch)).toBeNull()
    const hang = vi.fn((_u: string, init?: RequestInit) => new Promise((_r, rej) => init?.signal?.addEventListener('abort', () => rej(new Error('abort')))))
    expect(await fetchGuestName('x', hang as unknown as typeof fetch, 20)).toBeNull()
  })
  test('DEFAULT_GUEST is the polite fallback', () => expect(DEFAULT_GUEST).toBe('Quý khách'))
})
