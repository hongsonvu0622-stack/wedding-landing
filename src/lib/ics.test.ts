import { buildIcs } from './ics'

const ev = {
  id: 'vu-quy', title: 'Lễ Vu Quy', startsAt: '2026-12-19T11:00:00+07:00',
  venue: 'Sảnh Amber, Pavilion; Tân Sơn Nhất', address: '202 Hoàng Văn Thụ',
}

test('builds a valid calendar with UTC times and a 3 hour duration', () => {
  const ics = buildIcs(ev, new Date('2026-10-10T00:00:00Z'))
  expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true)
  expect(ics).toContain('DTSTART:20261219T040000Z')
  expect(ics).toContain('DTEND:20261219T070000Z')
  expect(ics).toContain('UID:vu-quy@son-lan-wedding')
  expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true)
})

test('escapes commas, semicolons and newlines in text fields', () => {
  const ics = buildIcs(ev)
  expect(ics).toContain('LOCATION:Sảnh Amber\\, Pavilion\\; Tân Sơn Nhất\\, 202 Hoàng Văn Thụ')
})

test('omits the address from LOCATION when there is none', () => {
  const ics = buildIcs({ ...ev, address: undefined, venue: 'Tư gia nhà trai' })
  expect(ics).toContain('LOCATION:Tư gia nhà trai\r\n')
})
