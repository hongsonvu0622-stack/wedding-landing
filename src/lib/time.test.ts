import { formatEventDate, getRemaining } from './time'

const target = new Date('2026-12-19T11:00:00+07:00')

test('counts down to the exact instant', () => {
  const r = getRemaining(new Date('2026-12-17T10:58:55+07:00'), target)
  expect(r).toEqual({ days: 2, hours: 0, minutes: 1, seconds: 5, done: false })
})

test('never goes negative after the event', () => {
  const r = getRemaining(new Date('2027-01-01T00:00:00Z'), target)
  expect(r).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 0, done: true })
})

test('is independent of the viewer time zone (same instant, different offsets)', () => {
  const a = getRemaining(new Date('2026-12-19T03:00:00Z'), target)
  const b = getRemaining(new Date('2026-12-18T22:00:00-05:00'), target)
  expect(a).toEqual(b)
})

test('formats event dates in Vietnamese using Ho Chi Minh time', () => {
  expect(formatEventDate('2026-12-19T11:00:00+07:00')).toEqual({ weekday: 'Thứ Bảy', day: '19', monthYear: '12.2026', time: '11:00' })
  expect(formatEventDate('2026-12-20T11:00:00+07:00').weekday).toBe('Chủ Nhật')
  // 11:00 +07 is still the 19th in HCMC even though it is early morning UTC
  expect(formatEventDate('2026-12-19T04:00:00Z').day).toBe('19')
})
