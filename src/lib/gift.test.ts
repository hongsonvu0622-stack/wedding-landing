import { copyText, formatAccountNumber } from './gift'

describe('formatAccountNumber', () => {
  test('groups digits in fours for easy reading', () => {
    expect(formatAccountNumber('21357045656')).toBe('2135 7045 656')
    expect(formatAccountNumber('1234')).toBe('1234')
    expect(formatAccountNumber('123456789012')).toBe('1234 5678 9012')
  })
  test('ignores existing spaces and dashes and leaves non-numeric text untouched', () => {
    expect(formatAccountNumber('2135 7045-656')).toBe('2135 7045 656')
    expect(formatAccountNumber('Đang cập nhật')).toBe('Đang cập nhật')
  })
})

describe('copyText', () => {
  test('uses the async clipboard API when available', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    expect(await copyText('123', { clipboard: { writeText } } as unknown as Navigator, document)).toBe(true)
    expect(writeText).toHaveBeenCalledWith('123')
  })
  test('falls back to execCommand when the clipboard API is missing (plain http, old browsers)', async () => {
    const exec = vi.fn().mockReturnValue(true)
    const doc = Object.assign(document, { execCommand: exec })
    expect(await copyText('123', {} as Navigator, doc)).toBe(true)
    expect(exec).toHaveBeenCalledWith('copy')
    expect(document.querySelector('textarea')).toBeNull() // temporary element is cleaned up
  })
  test('falls back when the async API rejects (permission denied)', async () => {
    const exec = vi.fn().mockReturnValue(true)
    const doc = Object.assign(document, { execCommand: exec })
    const nav = { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } } as unknown as Navigator
    expect(await copyText('123', nav, doc)).toBe(true)
    expect(exec).toHaveBeenCalled()
  })
  test('reports failure when nothing works', async () => {
    const doc = Object.assign(document, { execCommand: vi.fn().mockReturnValue(false) })
    expect(await copyText('123', {} as Navigator, doc)).toBe(false)
    const throwing = Object.assign(document, { execCommand: vi.fn(() => { throw new Error('nope') }) })
    expect(await copyText('123', {} as Navigator, throwing)).toBe(false)
  })
})
