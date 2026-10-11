// @vitest-environment node
import fs from 'node:fs'
import jsQR from 'jsqr'
import sharp from 'sharp'
import { wedding } from '../src/config/wedding.config'

async function decode(path: string) {
  const { data, info } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  return jsQR(new Uint8ClampedArray(data), info.width, info.height)
}

describe.each(wedding.gift.accounts.map((a) => [a.side, a] as const))('gift QR image (%s)', (_side, acc) => {
  const file = `public${acc.qr}`

  test('exists, is large enough to stay sharp on phones and light enough to load fast', async () => {
    expect(fs.existsSync(file)).toBe(true)
    const info = await sharp(file).metadata()
    expect(info.width).toBeGreaterThanOrEqual(480)
    expect(Math.abs((info.width ?? 0) - (info.height ?? 0))).toBeLessThanOrEqual(2)
    expect(fs.statSync(file).size).toBeLessThan(150 * 1024)
  })

  test('still scans, and it pays the same account that is printed on the page', async () => {
    const code = await decode(file)
    expect(code).not.toBeNull()
    expect(code!.data).toContain('A000000727') // VietQR / NAPAS application id
    expect(code!.data).toContain(acc.accountNumber.replace(/\D/g, ''))
  })
})

test('every account uses its own QR file', () => {
  const files = wedding.gift.accounts.map((a) => a.qr)
  expect(new Set(files).size).toBe(files.length)
})
