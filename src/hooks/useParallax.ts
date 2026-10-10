import { useEffect } from 'react'

export function useParallax(): void {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-par]'))
    let raf = 0
    const update = () => {
      raf = 0
      els.forEach((el) => {
        const r = el.parentElement!.getBoundingClientRect()
        el.style.transform = `translate3d(0,${r.top * -0.18}px,0)`
      })
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update) }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => { window.removeEventListener('scroll', onScroll); if (raf) cancelAnimationFrame(raf) }
  }, [])
}
