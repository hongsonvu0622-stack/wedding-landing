import { checkRsvpRequest } from './http'

describe('checkRsvpRequest', () => {
  test('accepts a same-origin JSON request', () => {
    expect(checkRsvpRequest({ contentType: 'application/json', origin: 'https://thiep.vn', host: 'thiep.vn' })).toBeNull()
    expect(checkRsvpRequest({ contentType: 'application/json; charset=utf-8', host: 'thiep.vn' })).toBeNull()
  })
  test('rejects a non-JSON content type (blocks cross-site simple requests)', () => {
    expect(checkRsvpRequest({ contentType: 'text/plain', host: 'thiep.vn' })?.status).toBe(415)
    expect(checkRsvpRequest({ host: 'thiep.vn' })?.status).toBe(415)
  })
  test('rejects a cross-origin browser request', () => {
    expect(checkRsvpRequest({ contentType: 'application/json', origin: 'https://evil.example', host: 'thiep.vn' })?.status).toBe(403)
    expect(checkRsvpRequest({ contentType: 'application/json', origin: 'not a url', host: 'thiep.vn' })?.status).toBe(403)
  })
})
