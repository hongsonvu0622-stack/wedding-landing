import { useEffect, useState } from 'react'

const links = [
  ['#inv', 'Lời mời'], ['#fam', 'Gia đình'], ['#event', 'Sự kiện'], ['#album', 'Album'], ['#rsvp', 'RSVP'],
] as const

export function Nav() {
  const [show, setShow] = useState(false)
  useEffect(() => {
    const on = () => setShow(window.scrollY > window.innerHeight * 0.8)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  return (
    <nav className={`nav${show ? ' show' : ''}`} aria-label="Điều hướng">
      <a className="logo" href="#top">S &amp; L</a>
      <ul>{links.map(([href, label]) => <li key={href}><a className="l" href={href}>{label}</a></li>)}</ul>
    </nav>
  )
}
