import { useEffect, useState } from 'react'
import { getRemaining, type Remaining } from '../lib/time'

export function useCountdown(targetIso: string): Remaining {
  const target = new Date(targetIso)
  const [r, setR] = useState(() => getRemaining(new Date(), target))
  useEffect(() => {
    const t = setInterval(() => setR(getRemaining(new Date(), new Date(targetIso))), 1000)
    return () => clearInterval(t)
  }, [targetIso])
  return r
}
