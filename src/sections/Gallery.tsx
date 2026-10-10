import { useRef, useState } from 'react'
import { wedding } from '../config/wedding.config'
import { Photo } from '../components/Photo'
import { getPhoto } from '../lib/photos'
import { Lightbox } from './Lightbox'

export function Gallery() {
  const [open, setOpen] = useState<number | null>(null)
  const strip = useRef<HTMLDivElement>(null)
  const drag = useRef({ down: false, x: 0, left: 0, moved: false })

  const onDown = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse' || !strip.current) return
    drag.current = { down: true, x: e.clientX, left: strip.current.scrollLeft, moved: false }
    strip.current.style.scrollSnapType = 'none'
  }
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d.down || !strip.current) return
    const dx = e.clientX - d.x
    if (Math.abs(dx) > 5) d.moved = true
    strip.current.scrollLeft = d.left - dx
  }
  const onUp = () => {
    drag.current.down = false
    if (strip.current) strip.current.style.scrollSnapType = ''
  }

  return (
    <section className="gal" id="album">
      <div className="head">
        <div className="eyebrow rv">Album</div>
        <h2 className="h2 c rv d1" style={{ marginTop: 14 }}>
          <span className="s1">Khoảnh Khắc</span><span className="s2">Của Chúng Mình</span>
        </h2>
      </div>
      <div className="strip" ref={strip} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={onUp}>
        {wedding.gallery.map((id, i) => {
          const p = getPhoto(id)
          return (
            <figure key={id} className={p.w > p.h ? 'w' : undefined}>
              <button
                type="button" aria-label={`Xem ảnh ${i + 1}`} style={{ width: '100%', height: '100%', border: 0, padding: 0, background: 'none', cursor: 'zoom-in' }}
                onClick={() => { if (!drag.current.moved) setOpen(i) }}
              >
                <Photo id={id} sizes="(min-width:900px) 30vw, 70vw" />
              </button>
            </figure>
          )
        })}
      </div>
      <div className="hint">Kéo ngang để xem thêm</div>
      {open !== null && <Lightbox ids={wedding.gallery} index={open} onClose={() => setOpen(null)} onChange={setOpen} />}
    </section>
  )
}
