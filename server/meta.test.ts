// @vitest-environment node
import fs from 'node:fs'
import sharp from 'sharp'

const html = fs.readFileSync('index.html', 'utf8')
const meta = (attr: string, name: string) =>
  new RegExp(`<meta[^>]*${attr}="${name}"[^>]*content="([^"]*)"`).exec(html)?.[1]

describe('index.html social and icon metadata', () => {
  test.each(['og:title', 'og:description', 'og:type', 'og:site_name', 'og:locale', 'og:url', 'og:image', 'og:image:width', 'og:image:height', 'og:image:alt'])(
    'has %s', (name) => expect(meta('property', name)).toBeTruthy())
  test.each(['twitter:card', 'twitter:title', 'twitter:description', 'twitter:image'])(
    'has %s', (name) => expect(meta('name', name)).toBeTruthy())

  test('large-image card and an absolute-URL placeholder for the image (filled by the server)', () => {
    expect(meta('name', 'twitter:card')).toBe('summary_large_image')
    expect(meta('property', 'og:image')).toBe('__ORIGIN__/og-image.jpg')
    expect(meta('name', 'twitter:image')).toBe('__ORIGIN__/og-image.jpg')
    expect(meta('property', 'og:url')).toBe('__ORIGIN__/')
  })

  test('the share image is a JPEG of exactly the advertised size and a sensible weight', async () => {
    const info = await sharp('public/og-image.jpg').metadata()
    expect(info.format).toBe('jpeg')
    expect(`${info.width}x${info.height}`).toBe(`${meta('property', 'og:image:width')}x${meta('property', 'og:image:height')}`)
    expect(fs.statSync('public/og-image.jpg').size).toBeLessThan(300 * 1024)
  })

  test('every icon and manifest linked from the page exists in public/', () => {
    const hrefs = [...html.matchAll(/<link[^>]*rel="(?:icon|apple-touch-icon|manifest)"[^>]*href="(\/[^"]+)"/g)].map((m) => m[1])
    expect(hrefs).toEqual(expect.arrayContaining(['/favicon.svg', '/favicon.ico', '/apple-touch-icon.png', '/site.webmanifest']))
    for (const h of hrefs) expect(fs.existsSync(`public${h}`), h).toBe(true)
  })

  test('the manifest is valid JSON and its icons exist with the declared sizes', async () => {
    const m = JSON.parse(fs.readFileSync('public/site.webmanifest', 'utf8'))
    expect(m.name).toContain('Hồng Sơn')
    for (const icon of m.icons) {
      const info = await sharp(`public${icon.src}`).metadata()
      expect(`${info.width}x${info.height}`).toBe(icon.sizes)
    }
  })

  test('guest invitations are kept out of search engines', () => {
    expect(html).toMatch(/<meta name="robots" content="noindex,\s*nofollow"/)
  })
})
