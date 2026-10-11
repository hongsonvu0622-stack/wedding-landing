import { useEffect, useRef, useState } from 'react'
import { wedding, type GiftAccount } from '../config/wedding.config'
import { copyText, formatAccountNumber } from '../lib/gift'

type Side = GiftAccount['side']
type CopyState = 'idle' | 'done' | 'failed'

const SIDES: Record<Side, { pick: () => string; role: () => string }> = {
  groom: { pick: () => `Bạn chú rể ${wedding.groom.first}`, role: () => `Chú rể · ${wedding.groom.full}` },
  bride: { pick: () => `Bạn cô dâu ${wedding.bride.first}`, role: () => `Cô dâu · ${wedding.bride.full}` },
}

function AccountCard({ a }: { a: GiftAccount }) {
  const [state, setState] = useState<CopyState>('idle')
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])

  const copy = async () => {
    const ok = await copyText(a.accountNumber.replace(/\D/g, ''))
    setState(ok ? 'done' : 'failed')
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setState('idle'), ok ? 2500 : 6000)
  }

  return (
    <article className="acct">
      {a.testOnly && <div className="testtag">Thử nghiệm · chưa phải tài khoản thật</div>}
      <div className="role">{SIDES[a.side].role()}</div>
      <div className="qrbox">
        <img src={a.qr} width={631} height={631} decoding="async" alt={`Mã QR chuyển khoản ${a.bank} của ${a.accountName}`} />
      </div>
      <a className="save" href={a.qr} download={`ma-qr-mung-cuoi-${a.side}.png`}>Lưu ảnh QR</a>
      <div className="orn" aria-hidden="true" />
      <div className="bank">{a.bank}</div>
      <div className="holder">{a.accountName}</div>
      <div className="num">{formatAccountNumber(a.accountNumber)}</div>
      <button type="button" className={`copy${state === 'done' ? ' done' : ''}`} onClick={copy}>
        Sao chép số tài khoản
      </button>
      <div className="copy-msg" role="status" aria-live="polite">
        {state === 'done' && 'Đã sao chép'}
        {state === 'failed' && 'Không sao chép được, bạn chạm giữ vào số tài khoản để sao chép nhé.'}
      </div>
    </article>
  )
}

export function Gift() {
  const accounts = wedding.gift.accounts
  const [open, setOpen] = useState(false)
  const [pick, setPick] = useState<Side | null>(null)
  const panel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    panel.current?.scrollIntoView?.({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest' })
  }, [open])

  if (accounts.length === 0) return null

  // Chỉ hỏi "bạn của ai" khi có từ hai tài khoản trở lên; một tài khoản thì hiện thẳng.
  const needsChoice = accounts.length > 1
  const selected = needsChoice ? accounts.find((a) => a.side === pick) ?? null : accounts[0]
  const toggle = () => { setOpen((o) => !o); setPick(null) }

  return (
    <section className="gift" id="gift">
      <div className="eyebrow rv">Mừng cưới</div>
      <h2 className="h2 c rv d1" style={{ marginTop: 14 }}>
        <span className="s1">Hộp Mừng Cưới</span><span className="s2">Gửi Yêu Thương</span>
      </h2>
      <p className="intro rv d2">{wedding.gift.note}</p>
      <button type="button" className="giftbtn rv d3" aria-expanded={open} aria-controls="gift-panel" onClick={toggle}>
        Gửi quà mừng
      </button>

      <div className={`panel${open ? ' open' : ''}`} id="gift-panel" ref={panel}>
        <div className="inner">
          {open && (
            <div className="reveal">
              {needsChoice && (
                <>
                  <p className="ask" id="gift-ask">Bạn là bạn của ai?</p>
                  <div className="choose" role="radiogroup" aria-labelledby="gift-ask" aria-label="Bạn là bạn của ai?">
                    {accounts.map((a) => (
                      <div key={a.side}>
                        <input type="radio" name="gift-side" id={`gift-${a.side}`} checked={pick === a.side} onChange={() => setPick(a.side)} />
                        <label htmlFor={`gift-${a.side}`}>{SIDES[a.side].pick()}</label>
                      </div>
                    ))}
                  </div>
                </>
              )}
              {selected && <AccountCard key={selected.side} a={selected} />}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
