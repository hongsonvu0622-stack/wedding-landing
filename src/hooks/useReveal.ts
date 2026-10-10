import { useEffect } from 'react'

export function useReveal(): void {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('.rv'))
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce || !('IntersectionObserver' in window)) {
      els.forEach((e) => e.classList.add('in'))
      return
    }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target) }
      }),
      { threshold: 0.15 },
    )
    els.forEach((e) => io.observe(e))
    return () => io.disconnect()
  }, [])
}
