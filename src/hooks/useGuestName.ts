import { useEffect, useState } from 'react'
import { DEFAULT_GUEST, fetchGuestName, readGuestRef } from '../lib/guests'

// `pending` is true while an ID is being looked up; the name is '' until the answer arrives,
// so the page shows a placeholder instead of flashing "Quý khách" and then switching.
export function useGuestName(): { name: string; id: string | null; pending: boolean } {
  const [ref] = useState(() => readGuestRef(window.location))
  const [name, setName] = useState(ref.freeText ?? DEFAULT_GUEST)
  const [pending, setPending] = useState(ref.id !== null)
  useEffect(() => {
    if (!ref.id) return
    let alive = true
    void fetchGuestName(ref.id).then((n) => {
      if (!alive) return
      if (n) setName(n)
      setPending(false)
    })
    return () => { alive = false }
  }, [ref.id])
  return { name: pending ? '' : name, id: ref.id, pending }
}
