import { useCallback, useRef, useState } from 'react'

export function useMusic() {
  const ref = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)

  const play = useCallback(async () => {
    const a = ref.current
    if (!a) return
    a.volume = 0.6
    try {
      await a.play()
      setPlaying(true)
    } catch {
      setPlaying(false)
    }
  }, [])

  const toggle = useCallback(async () => {
    const a = ref.current
    if (!a) return
    if (playing) {
      a.pause()
      setPlaying(false)
    } else {
      await play()
    }
  }, [playing, play])

  return { ref, playing, play, toggle }
}
