// @vitest-environment node
import { looksLikeId } from '../../src/lib/guests'
import { ALPHABET, cleanName, generate, slugify, toTsv } from './guests-gen.mjs'

describe('cleanName', () => {
  test('expands the A / C shorthand to Anh / Chị', () => {
    expect(cleanName('A Thành').name).toBe('Anh Thành')
    expect(cleanName('C Oanh').name).toBe('Chị Oanh')
    expect(cleanName('c trang').name).toBe('Chị trang')
  })
  test('does not touch names that merely start with A or C', () => {
    for (const n of ['Ánh', 'An', 'Anh Thư', 'Cường', 'Châu', 'A', 'C', 'Ân']) expect(cleanName(n).name).toBe(n)
  })
  test('expansion can be switched off', () => {
    expect(cleanName('A Thành', { expand: false }).name).toBe('A Thành')
  })
  test('removes the (*) marker from the name and keeps it as a note', () => {
    expect(cleanName('A Kiên(*)')).toEqual({ name: 'Anh Kiên', note: '(*)' })
    expect(cleanName('Hưng').note).toBe('')
  })
  test('trims and collapses whitespace, including odd unicode spaces', () => {
    expect(cleanName('  Thu   Hoàng ').name).toBe('Thu Hoàng')
    expect(cleanName('Thu Hoàng\t').name).toBe('Thu Hoàng')
  })
})

describe('slugify', () => {
  test('removes Vietnamese diacritics, maps đ and joins words with a dash', () => {
    expect(slugify('Anh Đạt & Chị Thủy')).toBe('anh-dat-chi-thuy')
    expect(slugify('Thu Hoàng')).toBe('thu-hoang')
    expect(slugify('Ngọc-Ánh')).toBe('ngoc-anh')
    expect(slugify('Ữ Ự Ỡ ữ ự ỡ')).toBe('u-u-o-u-u-o')
  })
  test('returns an empty string when nothing usable is left', () => {
    expect(slugify('♡♡ (*)')).toBe('')
  })
  test('truncates long names without leaving a trailing dash', () => {
    const s = slugify('Gia đình bác Nguyễn Văn Trường Giang và các bạn đồng nghiệp', 30)
    expect(s.length).toBeLessThanOrEqual(30)
    expect(s.endsWith('-')).toBe(false)
  })
})

const seq = (...vals) => { let i = 0; return () => vals[i++ % vals.length] }
const lines = ['A Thành', 'C Oanh', '', '# ghi chú', 'A Kiên(*)', '  ', 'Hưng']

describe('generate', () => {
  test('skips blank and # comment lines and builds id, name, link, note', () => {
    const { rows } = generate(lines, { base: 'https://wedding.hson.io.vn/' })
    expect(rows.map((r) => r.name)).toEqual(['Anh Thành', 'Chị Oanh', 'Anh Kiên', 'Hưng'])
    expect(rows[2].note).toBe('(*)')
    for (const r of rows) {
      expect(r.id).toMatch(/^[a-z0-9-]+-[abcdefghjkmnpqrstuvwxyz23456789]{5}$/)
      expect(r.link).toBe(`https://wedding.hson.io.vn/${r.id}`)
    }
    expect(rows[0].id.startsWith('anh-thanh-')).toBe(true)
  })

  test('every ID passes the server rule (letters, digits, - and _ only, at most 40 characters)', () => {
    const many = Array.from({ length: 300 }, (_, i) => `Gia đình bác Nguyễn Văn Trường Giang số ${i}`)
    const { rows } = generate(many, { base: 'https://x' })
    for (const r of rows) expect(looksLikeId(r.id), r.id).toBe(true)
  })

  test('IDs are unique even when the same name appears many times', () => {
    const { rows } = generate(Array.from({ length: 2000 }, () => 'A Minh'), { base: 'https://x' })
    expect(new Set(rows.map((r) => r.id)).size).toBe(2000)
  })

  test('a name with no usable letters still gets a valid ID', () => {
    const { rows } = generate(['♡♡'], { base: 'https://x' })
    expect(rows[0].id).toMatch(/^khach-[a-z0-9]{5}$/)
  })

  test('re-running with the saved state keeps every issued ID and only adds new ones', () => {
    const first = generate(lines, { base: 'https://x' })
    const second = generate([...lines, 'Ngân'], { base: 'https://x', state: first.state })
    expect(second.rows.slice(0, 4).map((r) => r.id)).toEqual(first.rows.map((r) => r.id))
    expect(second.rows.slice(0, 4).every((r) => r.reused)).toBe(true)
    expect(second.rows[4].name).toBe('Ngân')
    expect(second.rows[4].reused).toBe(false)
  })

  test('the same name twice gets two different, individually stable IDs', () => {
    const a = generate(['A Minh', 'A Minh'], { base: 'https://x' })
    expect(a.rows[0].id).not.toBe(a.rows[1].id)
    const b = generate(['A Minh', 'A Minh'], { base: 'https://x', state: a.state })
    expect(b.rows.map((r) => r.id)).toEqual(a.rows.map((r) => r.id))
  })

  test('an ID already in the saved state is never handed out again', () => {
    const random = seq(0, 0, 0, 0, 0, 1, 1, 1, 1, 1) // first suffix collides with the saved one, the second does not
    const state = { ids: { 'ai do#1': `anh-minh-${ALPHABET[0].repeat(5)}` } }
    const { rows } = generate(['A Minh'], { base: 'https://x', state, random })
    expect(rows[0].id).toBe(`anh-minh-${ALPHABET[1].repeat(5)}`)
  })

  test('gives up with a clear error instead of looping forever if it cannot find a free ID', () => {
    expect(() => generate(['A Minh', 'A Minh'], { base: 'https://x', random: () => 0 })).toThrow(/duy nhất|unique/i)
  })

  test('reordering the list does not change the IDs of names that stay', () => {
    const a = generate(['A Thành', 'C Oanh'], { base: 'https://x' })
    const b = generate(['C Oanh', 'A Thành'], { base: 'https://x', state: a.state })
    expect(b.rows[0].id).toBe(a.rows[1].id)
    expect(b.rows[1].id).toBe(a.rows[0].id)
  })

  test('the random source is used per character and covers only the safe alphabet', () => {
    const calls = []
    const random = (n) => { calls.push(n); return n - 1 }
    const { rows } = generate(['Hưng'], { base: 'https://x', random })
    expect(calls).toEqual([31, 31, 31, 31, 31])
    expect(rows[0].id).toBe(`hung-${ALPHABET.at(-1).repeat(5)}`)
    expect(ALPHABET).toHaveLength(31)
    expect(ALPHABET).not.toMatch(/[ilo01]/)
  })
})

describe('toTsv', () => {
  test('produces a header and one tab-separated line per guest, ready to paste into Google Sheets', () => {
    const { rows } = generate(['A Thành', 'A Kiên(*)'], { base: 'https://wedding.hson.io.vn' })
    const tsv = toTsv(rows)
    const out = tsv.trimEnd().split('\n')
    expect(out[0]).toBe('ID\tName\tLink mời\tGhi chú')
    expect(out).toHaveLength(3)
    expect(out[1].split('\t')).toEqual([rows[0].id, 'Anh Thành', rows[0].link, ''])
    expect(out[2].split('\t')[3]).toBe('(*)')
  })
  test('can omit the header when pasting under an existing header row', () => {
    const { rows } = generate(['A Thành'], { base: 'https://x' })
    expect(toTsv(rows, { header: false }).split('\n')[0].startsWith(rows[0].id)).toBe(true)
  })
})
