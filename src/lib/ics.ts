import type { WeddingEvent } from '../config/wedding.config'

const pad = (n: number) => String(n).padStart(2, '0')
const utc = (d: Date) =>
  `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')

export function buildIcs(
  ev: Pick<WeddingEvent, 'id' | 'title' | 'startsAt' | 'venue' | 'address'>,
  now: Date = new Date(),
): string {
  const start = new Date(ev.startsAt)
  const end = new Date(start.getTime() + 3 * 3600_000)
  const location = ev.address ? `${ev.venue}, ${ev.address}` : ev.venue
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Son Lan Wedding//VI', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${ev.id}@son-lan-wedding`,
    `DTSTAMP:${utc(now)}`,
    `DTSTART:${utc(start)}`,
    `DTEND:${utc(end)}`,
    `SUMMARY:${esc(`${ev.title} Hồng Sơn & Phương Lan`)}`,
    `LOCATION:${esc(location)}`,
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n') + '\r\n'
}

export function downloadIcs(ev: WeddingEvent): void {
  const blob = new Blob([buildIcs(ev)], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${ev.id}.ics`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
