import type { Wish } from '../lib/rsvp'

function List({ wishes, copy }: { wishes: Wish[]; copy?: boolean }) {
  return (
    <div className={copy ? 'list copy' : 'list'} aria-hidden={copy ? true : undefined}>
      {wishes.map((w, i) => (
        <blockquote key={`${w.at}-${i}`}>{w.message}<cite>{w.name}</cite></blockquote>
      ))}
    </div>
  )
}

export function WishWall({ wishes }: { wishes: Wish[] }) {
  if (wishes.length === 0) return null
  const still = wishes.length < 3
  const seconds = Math.max(20, wishes.length * 6)
  return (
    <div className={`wishwall${still ? ' still' : ''}`} aria-label="Lời chúc từ khách mời" role="group">
      <div className="track" style={{ ['--dur' as string]: `${seconds}s` }}>
        <List wishes={wishes} />
        {!still && <List wishes={wishes} copy />}
      </div>
    </div>
  )
}
