import { wedding, type Person } from '../config/wedding.config'
import { Photo } from '../components/Photo'

function Side({ p, delay }: { p: Person; delay?: string }) {
  return (
    <article className={`side rv${delay ? ` ${delay}` : ''}`}>
      <div className="pt"><Photo id={p.photo} alt={p.full} sizes="(min-width:900px) 300px, 70vw" style={{ objectPosition: '50% 22%' }} /></div>
      <div className="tag">{p.role}</div>
      <h3 className="who">{p.full}</h3>
      <div className="orn" />
      <div className="of">{p.parentsLabel}</div>
      <div className="par">
        {p.parents.map((line) => <div key={line}>{line}</div>)}
      </div>
    </article>
  )
}

export function Families() {
  return (
    <section className="fam" id="fam">
      <div className="head">
        <div className="eyebrow rv">Trân trọng báo tin</div>
        <h2 className="h2 c rv d1" style={{ marginTop: 14 }}>
          <span className="s1">Hai Gia Đình</span><span className="s2">Hai Trái Tim</span>
        </h2>
        <p className="rv d2">Lễ thành hôn của hai con chúng tôi</p>
      </div>
      <div className="grid">
        <div className="amp2" aria-hidden="true">&amp;</div>
        <Side p={wedding.groom} />
        <Side p={wedding.bride} delay="d1" />
      </div>
    </section>
  )
}
