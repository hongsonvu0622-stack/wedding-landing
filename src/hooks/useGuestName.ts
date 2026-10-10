import { useEffect, useState } from 'react'
import { DEFAULT_GUEST, fetchGuestName, readGuestRef } from '../lib/guests'

export function useGuestName(): { name: string; id: string | null } {
  const [ref] = useState(() => readGuestRef(window.location))
  // Free-text names show immediately; an ID waits for the lookup so the wrong name never flashes.
  const [name, setName] = useState(ref.freeText ?? DEFAULT_GUEST)
  useEffect(() => {
    if (!ref.id) return
    let alive = true
    void fetchGuestName(ref.id).then((n) => { if (alive && n) setName(n) })
    return () => { alive = false }
  }, [ref.id])
  return { name, id: ref.id }
}
