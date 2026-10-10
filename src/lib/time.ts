export interface Remaining { days: number; hours: number; minutes: number; seconds: number; done: boolean }

export function getRemaining(now: Date, target: Date): Remaining {
  const ms = Math.max(0, target.getTime() - now.getTime())
  return {
    days: Math.floor(ms / 864e5),
    hours: Math.floor(ms / 36e5) % 24,
    minutes: Math.floor(ms / 6e4) % 60,
    seconds: Math.floor(ms / 1e3) % 60,
    done: ms === 0,
  }
}

const TZ = 'Asia/Ho_Chi_Minh'

export function formatEventDate(iso: string) {
  const d = new Date(iso)
  const parts = (opts: Intl.DateTimeFormatOptions) =>
    Object.fromEntries(new Intl.DateTimeFormat('vi-VN', { timeZone: TZ, ...opts }).formatToParts(d).map((p) => [p.type, p.value]))
  const date = parts({ weekday: 'long', day: 'numeric', month: 'numeric', year: 'numeric' })
  const clock = parts({ hour: '2-digit', minute: '2-digit', hour12: false })
  const weekday = String(date.weekday).replace(/(^|\s)\S/g, (m) => m.toUpperCase())
  return {
    weekday,
    day: String(Number(date.day)),
    monthYear: `${String(date.month).padStart(2, '0')}.${date.year}`,
    time: `${clock.hour}:${clock.minute}`,
  }
}
