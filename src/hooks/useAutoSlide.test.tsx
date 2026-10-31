import { act, fireEvent, render } from '@testing-library/react'
import { useRef } from 'react'
import { afterEach, beforeEach } from 'vitest'
import { useAutoSlide } from './useAutoSlide'

let ioCallback: IntersectionObserverCallback = () => {}
const scrollTo = vi.fn()

function Strip({ paused = false }: { paused?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  useAutoSlide(ref, paused)
  return <div data-testid="strip" ref={ref}><figure /><figure /><figure /></div>
}

// jsdom has no layout: give the strip 3 figures of 300px in a 300px-wide viewport.
function layout(strip: HTMLElement, scrollLeft = 0) {
  Object.defineProperties(strip, {
    clientWidth: { configurable: true, value: 300 },
    scrollWidth: { configurable: true, value: 900 },
    scrollLeft: { configurable: true, value: scrollLeft },
    scrollTo: { configurable: true, value: scrollTo },
  })
  Array.from(strip.children).forEach((f, i) => Object.defineProperties(f, {
    offsetLeft: { configurable: true, value: i * 300 },
    offsetWidth: { configurable: true, value: 300 },
  }))
}

function setup(paused = false) {
  const r = render(<Strip paused={paused} />)
  const strip = r.getByTestId('strip')
  layout(strip)
  act(() => ioCallback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver))
  return { ...r, strip }
}

beforeEach(() => {
  vi.useFakeTimers()
  scrollTo.mockClear()
  vi.stubGlobal('IntersectionObserver', class {
    constructor(cb: IntersectionObserverCallback) { ioCallback = cb }
    observe() {}
    disconnect() {}
  })
})
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

test('slides smoothly to the next photo every few seconds', () => {
  setup()
  act(() => { vi.advanceTimersByTime(4000) })
  expect(scrollTo).toHaveBeenCalledWith({ left: 300, behavior: 'smooth' })
})

test('loops back to the first photo at the end', () => {
  const { strip } = setup()
  layout(strip, 600)
  act(() => { vi.advanceTimersByTime(4000) })
  expect(scrollTo).toHaveBeenCalledWith({ left: 0, behavior: 'smooth' })
})

test('pauses while hovered and for a while after the guest interacts', () => {
  const { strip } = setup()
  fireEvent.pointerEnter(strip, { pointerType: 'mouse' })
  act(() => { vi.advanceTimersByTime(8000) })
  expect(scrollTo).not.toHaveBeenCalled()
  fireEvent.pointerLeave(strip)
  act(() => { vi.advanceTimersByTime(4000) })
  expect(scrollTo).not.toHaveBeenCalled()
  act(() => { vi.advanceTimersByTime(8000) })
  expect(scrollTo).toHaveBeenCalled()
})

test('does nothing when paused (lightbox open)', () => {
  setup(true)
  act(() => { vi.advanceTimersByTime(8000) })
  expect(scrollTo).not.toHaveBeenCalled()
})

test('does nothing off-screen', () => {
  setup()
  act(() => ioCallback([{ isIntersecting: false } as IntersectionObserverEntry], {} as IntersectionObserver))
  act(() => { vi.advanceTimersByTime(8000) })
  expect(scrollTo).not.toHaveBeenCalled()
})

test('respects prefers-reduced-motion', () => {
  const mm = window.matchMedia
  window.matchMedia = ((q: string) => ({ ...mm(q), matches: q.includes('reduce') })) as typeof window.matchMedia
  try {
    setup()
    act(() => { vi.advanceTimersByTime(8000) })
    expect(scrollTo).not.toHaveBeenCalled()
  } finally { window.matchMedia = mm }
})
