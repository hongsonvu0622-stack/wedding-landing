import { createApiClient, validateRsvp, type RsvpPayload } from './rsvp'

const ok: RsvpPayload = { name: 'Anh Minh', attending: true, companions: 1, message: 'Chúc mừng!' }

describe('validateRsvp', () => {
  test('accepts a complete payload', () => expect(validateRsvp(ok)).toEqual({}))
  test('requires a name and caps it at 60 characters', () => {
    expect(validateRsvp({ ...ok, name: '   ' }).name).toBeDefined()
    expect(validateRsvp({ ...ok, name: 'a'.repeat(61) }).name).toBeDefined()
  })
  test('companions must be an integer 0-9, only checked when attending', () => {
    expect(validateRsvp({ ...ok, companions: 0 })).toEqual({})
    expect(validateRsvp({ ...ok, companions: 9 })).toEqual({})
    expect(validateRsvp({ ...ok, companions: -1 }).companions).toBeDefined()
    expect(validateRsvp({ ...ok, companions: 10 }).companions).toBeDefined()
    expect(validateRsvp({ ...ok, companions: 1.5 }).companions).toBeDefined()
    expect(validateRsvp({ ...ok, attending: false, companions: 99 })).toEqual({})
  })
  test('message is limited to 500 characters', () => {
    expect(validateRsvp({ ...ok, message: 'x'.repeat(501) }).message).toBeDefined()
    expect(validateRsvp({ ...ok, message: 'x'.repeat(500) })).toEqual({})
  })
})

describe('createApiClient', () => {
  test('POSTs JSON to /api/rsvp', async () => {
    const f = vi.fn().mockResolvedValue({ ok: true })
    await createApiClient(f as unknown as typeof fetch).submit(ok)
    const [url, init] = f.mock.calls[0]
    expect(url).toBe('/api/rsvp')
    expect(init.method).toBe('POST')
    expect(init.headers['Content-Type']).toBe('application/json')
    expect(JSON.parse(init.body)).toEqual(ok)
  })
  test('rejects on a non-OK status so the form can offer a retry', async () => {
    const f = vi.fn().mockResolvedValue({ ok: false, status: 502 })
    await expect(createApiClient(f as unknown as typeof fetch).submit(ok)).rejects.toThrow()
  })
  test('rejects when the network fails', async () => {
    const f = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(createApiClient(f as unknown as typeof fetch).submit(ok)).rejects.toThrow()
  })
  test('wishes() returns the list, or [] on any failure or a non-array reply', async () => {
    const good = vi.fn().mockResolvedValue({ ok: true, json: async () => [{ name: 'A', message: 'B', at: 'C' }] })
    expect(await createApiClient(good as unknown as typeof fetch).wishes()).toEqual([{ name: 'A', message: 'B', at: 'C' }])
    const bad = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ not: 'array' }) })
    expect(await createApiClient(bad as unknown as typeof fetch).wishes()).toEqual([])
    expect(await createApiClient(vi.fn().mockRejectedValue(new Error('x')) as unknown as typeof fetch).wishes()).toEqual([])
  })
})
