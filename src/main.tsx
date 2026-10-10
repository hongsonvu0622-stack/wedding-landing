import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './styles/base.css'
import './styles/curtain.css'
import './styles/hero.css'
import './styles/marquee.css'
import './styles/invitation.css'
import './styles/cinematic.css'
import './styles/story.css'
import './styles/event.css'
import './styles/gallery.css'
import './styles/rsvp.css'
import './styles/nav.css'
import './styles/gift.css'
import './styles/lightbox.css'
import './styles/form.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
