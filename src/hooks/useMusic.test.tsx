import { act, renderHook } from '@testing-library/react'
import { useMusic } from './useMusic'

function setup() {
  const hook = renderHook(() => useMusic())
  ;(hook.result.current.ref as { current: HTMLAudioElement | null }).current = document.createElement('audio')
  return hook
}

test('play() marks playing when the browser allows it', async () => {
  const { result } = setup()
  await act(async () => { await result.current.play() })
  expect(result.current.playing).toBe(true)
})

test('a blocked play() does not throw and leaves playing false', async () => {
  const { result } = setup()
  vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValueOnce(new DOMException('blocked', 'NotAllowedError'))
  await act(async () => { await result.current.play() })
  expect(result.current.playing).toBe(false)
})

test('toggle flips between playing and paused, even when tapped repeatedly', async () => {
  const { result } = setup()
  await act(async () => { await result.current.toggle() })
  expect(result.current.playing).toBe(true)
  await act(async () => { await result.current.toggle() })
  expect(result.current.playing).toBe(false)
  await act(async () => { await result.current.toggle() })
  expect(result.current.playing).toBe(true)
})
