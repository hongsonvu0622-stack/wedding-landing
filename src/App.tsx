import { useEffect, useState } from 'react'
import { wedding } from './config/wedding.config'
import { Cover } from './components/Cover'
import { MusicButton } from './components/MusicButton'
import { Nav } from './components/Nav'
import { useGuestName } from './hooks/useGuestName'
import { useMusic } from './hooks/useMusic'
import { useParallax } from './hooks/useParallax'
import { Hero } from './sections/Hero'
import { Marquee } from './sections/Marquee'
import { Invitation } from './sections/Invitation'
import { Families } from './sections/Families'
import { Cinematic } from './sections/Cinematic'
import { Story } from './sections/Story'
import { useReveal } from './hooks/useReveal'

export function App() {
  const { name } = useGuestName()
  const music = useMusic()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    document.body.classList.toggle('open', open)
    if (open) window.scrollTo(0, 0)
  }, [open])

  useReveal()
  useParallax()

  const handleOpen = () => {
    setOpen(true)
    void music.play()
  }

  return (
    <>
      <Cover guestName={name} open={open} onOpen={handleOpen} />
      <MusicButton playing={music.playing} onToggle={() => void music.toggle()} />
      <audio ref={music.ref} src={wedding.musicSrc} loop preload="none" />
      <Nav />
      <main>
        <Hero />
        <Marquee />
        <Invitation />
        <Families />
        <Cinematic />
        <Story />
      </main>
    </>
  )
}
