import { wedding } from '../config/wedding.config'
import { Photo } from '../components/Photo'
import { photoSrcSet } from '../lib/photos'

export function Hero() {
  return (
    <header className="hero" id="top">
      <picture>
        <source media="(max-width:800px)" srcSet={photoSrcSet(wedding.hero.portrait)} sizes="100vw" />
        <Photo id={wedding.hero.landscape} eager alt={`${wedding.groom.first} và ${wedding.bride.first} giữa nắng bình minh Đà Lạt`} />
      </picture>
      <div className="top"><span>Save the date</span><span>Thứ Bảy</span></div>
      <div className="in">
        <h1 className="names">
          <span className="b">{wedding.groom.first}</span>
          <span className="b r"><span className="amp">&amp;</span>{wedding.bride.first}</span>
        </h1>
        <div className="meta">
          <span>19 &amp; 20 . 12 . 2026 · 11:00</span>
          <span>Vu quy 19.12 · Thành hôn 20.12</span>
          <a className="scroll" href="#inv" style={{ textDecoration: 'none' }}><i />Cuộn xuống</a>
        </div>
      </div>
    </header>
  )
}
