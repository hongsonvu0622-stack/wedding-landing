import { wedding } from '../config/wedding.config'

export function Marquee() {
  const unit = (
    <>
      <span>{wedding.groom.first}</span><b>&amp;</b><span>{wedding.bride.first}</span><b>✦</b>
      <span>19 &amp; 20 · 12 · 2026</span><b>✦</b><span>Chúng mình sắp cưới</span><b>✦</b>
    </>
  )
  return (
    <div className="marq" aria-hidden="true">
      <div>{unit}{unit}{unit}{unit}</div>
    </div>
  )
}
