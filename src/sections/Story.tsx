import { wedding } from '../config/wedding.config'
import { Photo } from '../components/Photo'

export function Story() {
  return (
    <section className="story" id="story">
      <div className="head">
        <div className="eyebrow rv">Hành trình</div>
        <h2 className="h2 c rv d1" style={{ marginTop: 14 }}>
          <span className="s1">Câu Chuyện</span><span className="s2">Của Chúng Mình</span>
        </h2>
      </div>
      <div className="rows">
        {wedding.story.map((item, i) => (
          <div key={item.title} className={`row${i % 2 ? ' rev' : ''}`}>
            <div className="ph rv"><Photo id={item.photo} sizes="(min-width:900px) 40vw, 92vw" /></div>
            <div className="tx rv d1">
              <div className="no">{String(i + 1).padStart(2, '0')}</div>
              <h3>{item.title}</h3>
              <div className="ln" />
              <p>{item.text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
