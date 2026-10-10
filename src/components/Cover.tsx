import { useEffect, useState } from 'react'

interface Props { guestName: string; open: boolean; onOpen: () => void }

export function Cover({ guestName, open, onOpen }: Props) {
  const [gone, setGone] = useState(false)
  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => setGone(true), 2000)
    return () => clearTimeout(t)
  }, [open])
  if (gone) return null
  return (
    <div id="curtain" role="dialog" aria-label="Mở thiệp">
      <div className="p l" />
      <div className="p r" />
      <div className="frame" />
      <div className="c">
        <div className="eyebrow">Trân trọng kính mời</div>
        <div className="to" id="guest">{guestName}</div>
        <div className="orn" aria-hidden="true"><i /><b /><i /></div>
        <div className="mono">S <span style={{ fontSize: '.6em' }}>&amp;</span> L</div>
        <div className="eyebrow" style={{ margin: '2px 0 40px' }}>19 — 20 · 12 · 2026</div>
        <button className="seal" onClick={onOpen} aria-label="Mở thiệp" autoFocus>Mở<br />thiệp</button>
      </div>
    </div>
  )
}
