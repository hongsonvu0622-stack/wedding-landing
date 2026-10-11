import { useEffect, useRef, useState } from 'react'
import { wedding, type GiftAccount } from '../config/wedding.config'
import { copyText, formatAccountNumber } from '../lib/gift'

type CopyState = 'idle' | 'done' | 'failed'

function AccountCard({ a, delay }: { a: GiftAccount; delay?: string }) {
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
    <article className={`acct rv${delay ? ` ${delay}` : ''}`}>
      <div className="role">{a.role}</div>
      <div className="qrbox">
        <img src={a.qr} width={631} height={631} loading="lazy" decoding="async" alt={`Mã QR chuyển khoản ${a.bank} của ${a.accountName}`} />
      </div>
      <a className="save" href={a.qr} download={`ma-qr-mung-cuoi-${a.role.toLowerCase().replace(/\s+/g, '-')}.png`}>Lưu ảnh QR</a>
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
  if (accounts.length === 0) return null
  return (
    <section className="gift" id="gift">
      <div className="eyebrow rv">Mừng cưới</div>
      <h2 className="h2 c rv d1" style={{ marginTop: 14 }}>
        <span className="s1">Hộp Mừng Cưới</span><span className="s2">Gửi Yêu Thương</span>
      </h2>
      <p className="intro rv d2">{wedding.gift.note}</p>
      <div className="accts">
        {accounts.map((a, i) => <AccountCard key={a.accountNumber} a={a} delay={i ? 'd1' : undefined} />)}
      </div>
    </section>
  )
}
