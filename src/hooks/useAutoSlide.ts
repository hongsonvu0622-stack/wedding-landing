import { useEffect, useRef, type RefObject } from 'react'

const INTERVAL = 4000
const RESUME_AFTER = 8000

/**
 * Tự trượt dải ảnh sang ảnh kế mỗi INTERVAL ms, hết ảnh thì quay về đầu.
 * Dừng khi khách đang hover/kéo/chạm (chạy lại sau RESUME_AFTER), khi dải ảnh khuất màn hình,
 * khi tab ẩn, khi `paused` (vd. đang mở lightbox), và tắt hẳn với prefers-reduced-motion.
 */
export function useAutoSlide(strip: RefObject<HTMLElement | null>, paused: boolean): void {
  const pausedRef = useRef(paused)
  pausedRef.current = paused

  useEffect(() => {
    const el = strip.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let visible = !('IntersectionObserver' in window)
    let hovering = false
    let idleUntil = 0

    const io = 'IntersectionObserver' in window
      ? new IntersectionObserver(([e]) => { visible = e.isIntersecting }, { threshold: 0.3 })
      : null
    io?.observe(el)

    const touch = () => { idleUntil = Date.now() + RESUME_AFTER }
    const enter = (e: PointerEvent) => { if (e.pointerType === 'mouse') hovering = true }
    const leave = () => { hovering = false; touch() }
    el.addEventListener('pointerdown', touch)
    el.addEventListener('wheel', touch, { passive: true })
    el.addEventListener('touchstart', touch, { passive: true })
    el.addEventListener('pointerenter', enter)
    el.addEventListener('pointerleave', leave)

    const tick = () => {
      if (pausedRef.current || hovering || !visible || document.hidden || Date.now() < idleUntil) return
      const center = el.scrollLeft + el.clientWidth / 2
      const figs = Array.from(el.children) as HTMLElement[]
      const next = figs.find((f) => f.offsetLeft + f.offsetWidth / 2 > center + 4)
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4
      const left = !next || atEnd ? 0 : next.offsetLeft + next.offsetWidth / 2 - el.clientWidth / 2
      el.scrollTo({ left, behavior: 'smooth' })
    }
    const timer = window.setInterval(tick, INTERVAL)

    return () => {
      window.clearInterval(timer)
      io?.disconnect()
      el.removeEventListener('pointerdown', touch)
      el.removeEventListener('wheel', touch)
      el.removeEventListener('touchstart', touch)
      el.removeEventListener('pointerenter', enter)
      el.removeEventListener('pointerleave', leave)
    }
  }, [strip])
}
