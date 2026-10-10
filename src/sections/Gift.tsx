import { wedding } from '../config/wedding.config'

export function Gift() {
  const g = wedding.gift
  return (
    <section className="gift" id="gift">
      <div className="eyebrow rv">Mừng cưới</div>
      <h2 className="h2 c rv d1" style={{ marginTop: 14 }}>
        <span className="s1">Hộp Mừng Cưới</span><span className="s2">Gửi Yêu Thương</span>
      </h2>
      <div className="box rv d2">
        <div className="qr" role="img" aria-label="Mã QR đang cập nhật">QR đang cập nhật</div>
        <dl>
          <div><dt>Ngân hàng</dt><dd>{g.bank}</dd></div>
          <div><dt>Chủ tài khoản</dt><dd>{g.accountName}</dd></div>
          <div><dt>Số tài khoản</dt><dd>{g.accountNumber}</dd></div>
        </dl>
        <p className="note">{g.note}</p>
      </div>
    </section>
  )
}
