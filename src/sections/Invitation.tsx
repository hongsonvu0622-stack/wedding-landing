import { wedding } from '../config/wedding.config'
import { Photo } from '../components/Photo'

export function Invitation() {
  return (
    <section className="inv" id="inv">
      <div className="arch rv">
        <div className="im">
          <Photo id={wedding.invitation.photo} alt="Cô dâu chú rể dưới tấm voan" sizes="(min-width:900px) 45vw, 90vw" style={{ objectPosition: '50% 30%' }} />
        </div>
        <div className="num">19</div>
      </div>
      <div>
        <div className="eyebrow rv">Thư mời</div>
        <h2 className="h2 rv d1" style={{ marginTop: 14 }}>
          <span className="s1">Hạnh Phúc Trọn Vẹn</span><span className="s2">Khi Có Bạn</span>
        </h2>
        <p className="lead rv d2">{wedding.invitation.lead}</p>
        <div className="sign rv d3">Sơn <span style={{ fontSize: '.7em' }}>&amp;</span> Lan</div>
      </div>
    </section>
  )
}
