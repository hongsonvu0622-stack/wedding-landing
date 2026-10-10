import { wedding } from '../config/wedding.config'
import { Photo } from '../components/Photo'

export function Cinematic() {
  return (
    <section className="cine">
      <div className="bg" data-par>
        <Photo id={wedding.quote.photo} alt="Hai người giữa đồi thông phủ sương" sizes="100vw" />
      </div>
      <div className="q rv">
        <div className="eyebrow" style={{ color: 'var(--gold-l)', marginBottom: 20 }}>Đà Lạt · 2026</div>
        <p>“{wedding.quote.text}”</p>
      </div>
    </section>
  )
}
