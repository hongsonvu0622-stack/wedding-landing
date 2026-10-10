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

import { clientIp } from './http'

describe('clientIp', () => {
  test('behind one trusted proxy, takes the address that proxy appended (the last entry), not a client-supplied one', () => {
    expect(clientIp({ 'x-forwarded-for': '6.6.6.6, 203.0.113.9' }, '10.0.0.2', 1)).toBe('203.0.113.9')
  })
  test('with two proxy hops, takes the second from the end', () => {
    expect(clientIp({ 'x-forwarded-for': '6.6.6.6, 203.0.113.9, 10.1.1.1' }, '10.0.0.2', 2)).toBe('203.0.113.9')
  })
  test('with no trusted proxy (hops 0) the header is ignored and the socket address is used', () => {
    expect(clientIp({ 'x-forwarded-for': '6.6.6.6' }, '198.51.100.7', 0)).toBe('198.51.100.7')
  })
  test('falls back to the socket address, then "unknown", when there is no usable header', () => {
    expect(clientIp({}, '198.51.100.7', 1)).toBe('198.51.100.7')
    expect(clientIp({}, undefined, 1)).toBe('unknown')
    expect(clientIp({ 'x-forwarded-for': ' , ' }, '198.51.100.7', 1)).toBe('198.51.100.7')
  })
  test('a header shorter than the hop count uses its first entry', () => {
    expect(clientIp({ 'x-forwarded-for': '203.0.113.9' }, '10.0.0.2', 3)).toBe('203.0.113.9')
  })
  test('accepts the header as an array (repeated header lines)', () => {
    expect(clientIp({ 'x-forwarded-for': ['6.6.6.6', '203.0.113.9'] }, '10.0.0.2', 1)).toBe('203.0.113.9')
  })
})
