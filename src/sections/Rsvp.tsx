import { useEffect, useMemo, useState } from 'react'
import { wedding } from '../config/wedding.config'
import { Photo } from '../components/Photo'
import { useGuestName } from '../hooks/useGuestName'
import { DEFAULT_GUEST } from '../lib/guests'
import { WishWall } from './WishWall'
import { createApiClient, validateRsvp, type RsvpClient, type Wish } from '../lib/rsvp'

type Status = 'idle' | 'sending' | 'done' | 'error'

export function Rsvp({ client }: { client?: RsvpClient }) {
  const api = useMemo(() => client ?? createApiClient(), [client])
  const { name: guest } = useGuestName()
  const [name, setName] = useState(guest === DEFAULT_GUEST ? '' : guest)
  const [attending, setAttending] = useState(true)
  const [companions, setCompanions] = useState(0)
  const [message, setMessage] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [status, setStatus] = useState<Status>('idle')
  const [wishes, setWishes] = useState<Wish[]>([])

  useEffect(() => { if (guest !== DEFAULT_GUEST) setName((n) => n || guest) }, [guest])
  useEffect(() => { void api.wishes().then(setWishes) }, [api, status])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (status === 'sending') return
    const payload = { name, attending, companions: attending ? companions : 0, message }
    const errs = validateRsvp(payload)
    setErrors(errs)
    if (Object.keys(errs).length) return
    setStatus('sending')
    try {
      await api.submit(payload)
      setStatus('done')
    } catch {
      setStatus('error')
    }
  }

  return (
    <section className="rsvp" id="rsvp">
      <div className="bg"><Photo id={wedding.rsvpBackground} sizes="100vw" style={{ objectPosition: '50% 25%' }} /></div>
      <div className="card rv">
        <div className="eyebrow">RSVP</div>
        <h2 className="h2 c" style={{ fontSize: 'clamp(32px,4vw,50px)', marginTop: 12 }}>
          <span className="s1">Xác Nhận</span><span className="s2">Tham Dự</span>
        </h2>
        {status === 'done' ? (
          <p className="status" role="status">Cảm ơn bạn! Hẹn gặp bạn ngày 19.12 ♡</p>
        ) : (
          <form onSubmit={onSubmit} noValidate>
            <div>
              <label htmlFor="rsvp-name">Họ và tên</label>
              <input id="rsvp-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" aria-invalid={!!errors.name} />
              {errors.name && <div className="err">{errors.name}</div>}
            </div>
            <div className="seg" role="radiogroup" aria-label="Bạn có tham dự không">
              <div>
                <input type="radio" name="att" id="att-yes" checked={attending} onChange={() => setAttending(true)} />
                <label htmlFor="att-yes">Sẽ tham dự</label>
              </div>
              <div>
                <input type="radio" name="att" id="att-no" checked={!attending} onChange={() => setAttending(false)} />
                <label htmlFor="att-no">Rất tiếc</label>
              </div>
            </div>
            {attending && (
              <div>
                <span className="lab" id="rsvp-comp-label">Số người đi cùng</span>
                <div className="step" role="group" aria-labelledby="rsvp-comp-label">
                  <button type="button" aria-label="Giảm số người đi cùng" disabled={companions <= 0}
                    onClick={() => setCompanions((c) => Math.max(0, c - 1))}>&minus;</button>
                  <output aria-live="polite">{companions === 0 ? 'Chỉ mình tôi' : `${companions} người`}</output>
                  <button type="button" aria-label="Tăng số người đi cùng" disabled={companions >= 9}
                    onClick={() => setCompanions((c) => Math.min(9, c + 1))}>+</button>
                </div>
                {errors.companions && <div className="err">{errors.companions}</div>}
              </div>
            )}
            <div>
              <label htmlFor="rsvp-msg">Lời chúc</label>
              <textarea id="rsvp-msg" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Gửi lời chúc đến cô dâu chú rể" />
              {errors.message && <div className="err">{errors.message}</div>}
            </div>
            {status === 'error' && <div className="err" role="alert">Chưa gửi được. Bạn kiểm tra mạng và thử lại nhé, nội dung vẫn được giữ nguyên.</div>}
            <button className="btn solid" type="submit" disabled={status === 'sending'} style={{ justifyContent: 'center' }}>
              {status === 'sending' ? 'Đang gửi…' : 'Gửi lời chúc'}
            </button>
          </form>
        )}
      </div>
      <WishWall wishes={wishes} />
    </section>
  )
}
