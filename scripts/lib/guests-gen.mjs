import { randomInt } from 'node:crypto'

// Bỏ i, l, o, 0, 1 để không nhầm khi đọc hoặc gõ tay.
export const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'
const MAX_ATTEMPTS = 200

// Chuẩn hoá tên hiển thị: gộp khoảng trắng, bỏ ký hiệu (*), đổi "A"/"C" đứng đầu thành "Anh"/"Chị".
export function cleanName(raw, { expand = true } = {}) {
  let s = String(raw).replace(/\s+/g, ' ').trim()
  let note = ''
  if (/\(\*\)/.test(s)) {
    note = '(*)'
    s = s.replace(/\(\*\)/g, '').replace(/\s+/g, ' ').trim()
  }
  if (expand) s = s.replace(/^a\s+(?=\S)/i, 'Anh ').replace(/^c\s+(?=\S)/i, 'Chị ')
  return { name: s, note }
}

// Tên -> chuỗi không dấu, chữ thường, nối bằng "-".
export function slugify(name, max = 30) {
  let s = String(name)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  if (s.length > max) s = s.slice(0, max).replace(/-+$/, '')
  return s
}

// Tạo một ID chưa dùng (và ghi nó vào `used`): tên không dấu + hậu tố ngẫu nhiên.
export function makeId(name, { used, suffixLength = 5, random = randomInt }) {
  const slug = slugify(name) || 'khach'
  for (let attempt = 0; ; attempt++) {
    if (attempt >= MAX_ATTEMPTS) throw new Error(`Không tạo được ID duy nhất cho "${name}" sau ${MAX_ATTEMPTS} lần thử`)
    const suffix = Array.from({ length: suffixLength }, () => ALPHABET[random(ALPHABET.length)]).join('')
    const id = `${slug}-${suffix}`
    if (!used.has(id)) {
      used.add(id)
      return id
    }
  }
}

const keyOf = (raw) => String(raw).replace(/\s+/g, ' ').trim().toLowerCase()

// lines: các dòng tên gốc. state: { ids: { "<tên gốc>#<lần thứ n>": id } } để giữ nguyên ID đã phát khi chạy lại.
export function generate(lines, { base, state = { ids: {} }, suffixLength = 5, expand = true, random = randomInt } = {}) {
  const ids = { ...(state.ids ?? {}) }
  const used = new Set(Object.values(ids))
  const seen = new Map()
  const root = String(base ?? '').replace(/\/+$/, '')
  const rows = []

  for (const raw of lines) {
    const line = String(raw).trim()
    if (!line || line.startsWith('#')) continue
    const n = (seen.get(keyOf(line)) ?? 0) + 1
    seen.set(keyOf(line), n)
    const key = `${keyOf(line)}#${n}`
    const { name, note } = cleanName(line, { expand })

    let id = ids[key]
    const reused = id !== undefined
    if (!reused) {
      id = makeId(name, { used, suffixLength, random })
      ids[key] = id
    }
    rows.push({ id, name, note, link: `${root}/${id}`, reused })
  }
  return { rows, state: { ids } }
}

const field = (v) => String(v ?? '').replace(/[\t\r\n]+/g, ' ')

// Bảng phân tách bằng Tab: dán thẳng vào Google Sheet là tự chia cột.
export function toTsv(rows, { header = true } = {}) {
  const out = header ? ['ID\tName\tLink mời\tGhi chú'] : []
  for (const r of rows) out.push([r.id, r.name, r.link, r.note].map(field).join('\t'))
  return out.join('\n') + '\n'
}
