import { wedding, type WeddingEvent } from '../config/wedding.config'
import { useCountdown } from '../hooks/useCountdown'
import { downloadIcs } from '../lib/ics'
import { formatEventDate } from '../lib/time'

const pad = (n: number) => String(n).padStart(2, '0')

function EventCard({ ev }: { ev: WeddingEvent }) {
  const d = formatEventDate(ev.startsAt)
  return (
    <article>
      <div className="k">{ev.title} · {ev.side}</div>
      <div className="dt">{d.day}<small>{d.weekday} · {d.monthYear}</small></div>
      <div className="v">{d.time} trưa</div>
      <div className="s">
        {ev.venue}
        {ev.address && <><br />{ev.address}</>}
      </div>
      <div className="ctas">
        {ev.mapsQuery && (
          <a className="btn" target="_blank" rel="noopener noreferrer"
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ev.mapsQuery)}`}>Chỉ đường</a>
        )}
        <button className="btn" type="button" onClick={() => downloadIcs(ev)}>Thêm vào lịch</button>
      </div>
    </article>
  )
}

export function Events() {
  const r = useCountdown(wedding.events[0].startsAt)
  return (
    <section className="event" id="event">
      <div className="wrap">
        <div className="eyebrow rv">Lễ cưới</div>
        <h2 className="h2 c rv d1" style={{ marginTop: 14, color: 'var(--bg)' }}>
          <span className="s1">Hai Ngày</span><span className="s2">Trọn Niềm Vui</span>
        </h2>
        <div className="cd rv d2" id="cd" role="timer" aria-label="Đếm ngược đến lễ vu quy">
          <div><strong>{pad(r.days)}</strong><span>Ngày</span></div>
          <div><strong>{pad(r.hours)}</strong><span>Giờ</span></div>
          <div><strong>{pad(r.minutes)}</strong><span>Phút</span></div>
          <div><strong>{pad(r.seconds)}</strong><span>Giây</span></div>
        </div>
        <div className="two rv d2">
          {wedding.events.map((ev) => <EventCard key={ev.id} ev={ev} />)}
        </div>
      </div>
    </section>
  )
}
