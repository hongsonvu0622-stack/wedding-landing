import { useEffect, useRef } from 'react'
import { getPhoto, photoSrc, photoSrcSet } from '../lib/photos'

interface Props { ids: string[]; index: number; onClose: () => void; onChange: (i: number) => void }

export function Lightbox({ ids, index, onClose, onChange }: Props) {
  const n = ids.length
  const go = (d: number) => onChange((index + d + n) % n)
  const startX = useRef<number | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight') onChange((index + 1) % n)
      else if (e.key === 'ArrowLeft') onChange((index - 1 + n) % n)
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [index, n, onClose, onChange])

  const id = ids[index]
  const { w, h } = getPhoto(id)
  return (
    <div
      className="lb" role="dialog" aria-modal="true" aria-label="Xem ảnh"
      onPointerDown={(e) => { startX.current = e.clientX }}
      onPointerUp={(e) => {
        if (startX.current === null) return
        const dx = e.clientX - startX.current
        startX.current = null
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1)
      }}
    >
      <img src={photoSrc(id, 1280)} srcSet={photoSrcSet(id)} sizes="92vw" width={w} height={h} alt="" />
      <button className="x" onClick={onClose} aria-label="Đóng" autoFocus>✕</button>
      <button className="pv" onClick={() => go(-1)} aria-label="Ảnh trước">‹</button>
      <button className="nx" onClick={() => go(1)} aria-label="Ảnh sau">›</button>
      <div className="ct">{index + 1} / {n}</div>
    </div>
  )
}
