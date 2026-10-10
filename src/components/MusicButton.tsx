export function MusicButton({ playing, onToggle }: { playing: boolean; onToggle: () => void }) {
  return (
    <button className="musicbtn" onClick={onToggle} aria-label={playing ? 'Tắt nhạc' : 'Bật nhạc'} aria-pressed={playing}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path d="M9 18V6l10-2v12" /><circle cx="6.5" cy="18" r="2.5" /><circle cx="16.5" cy="16" r="2.5" />
        {!playing && <path d="M3 3l18 18" />}
      </svg>
    </button>
  )
}
