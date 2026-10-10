# Thiệp cưới Hồng Sơn & Phương Lan — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a responsive, cinematic single-page wedding invitation with per-guest names (`?to=`), two events, an album, and RSVP.

**Architecture:** Vite + React + TypeScript static SPA. Plain CSS ported from the approved prototype (tokens + one CSS file per section). Pure-logic modules (`guests`, `time`, `ics`, `rsvp`) are unit-tested with Vitest. Photos are pre-optimized to WebP by a `sharp` script and referenced through a generated manifest.

**Tech Stack:** Vite, React 18, TypeScript (strict), Vitest + Testing Library + jsdom, sharp (dev only), plain CSS, `google-auth-library` (server only). **Amendment A:** guests and RSVP live in a Google Sheet reached through a service account, so a small server layer (`api/*.ts` Vercel-style functions + a Vite dev middleware) wraps it; the private key never reaches the browser bundle. **Deviation from spec §4:** Tailwind and Framer Motion are dropped; the approved prototype is plain CSS + IntersectionObserver and already delivers every effect. Fewer dependencies, identical look.

**Spec:** `docs/superpowers/specs/2026-10-10-wedding-invitation-design.md`
**Approved prototype (visual source of truth):** `/private/tmp/claude-501/-Users-hongson-Documents-chat-gemini-wedding/ff87bbc8-cf2c-44ca-a2e9-146d65fb1c88/scratchpad/proto/index.html` (Task 1 copies it into the repo as `reference/prototype.html`).

## Global Constraints
- Palette tokens: `--bg #FAF6EF`, `--bg2 #F1E9DC`, `--ink #2B2823`, `--mute #5E584E`, `--gold #B99E7B`, `--gold-l #D8C3A0`, `--pine #4F5640`, `--night #1E2318`, `--blush #E8CFC8`, `--rose #C9A78B`.
- Fonts: Cormorant Garamond (headings/body serif), Great Vibes (script, hero names, `&`), Montserrat (labels). All three verified to include the Vietnamese subset.
- Names: groom **Vũ Hồng Sơn**, bride **Thái Thị Phương Lan**. Parents: Ông Vũ Thanh Tùng, Bà Nguyễn Thị Ngân (nhà trai); Bà Trần Thị Tập (nhà gái).
- Event 1 "Lễ Vu Quy · Nhà gái": `2026-12-19T11:00:00+07:00`, Sảnh Amber, Trung Tâm Hội Nghị & Tiệc Cưới Pavilion Tân Sơn Nhất, 202 Hoàng Văn Thụ, Phường Đức Nhuận, TP. Hồ Chí Minh.
- Event 2 "Lễ Thành Hôn · Nhà trai": `2026-12-20T11:00:00+07:00`, "Tư gia nhà trai", no address and **no directions button**.
- Countdown targets event 1. Time zone is always `Asia/Ho_Chi_Minh` regardless of viewer.
- Breakpoints 375 / 768 / 1024 / 1440. No horizontal page scroll. Touch targets ≥ 44×44px. `prefers-reduced-motion` disables animation. No emoji as icons.
- Original photos are never modified. Guest name is rendered only through React text nodes (never `dangerouslySetInnerHTML`).
- Music never autoplays; it starts only from the "Mở thiệp" click.
- Google credentials (`GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `GOOGLE_SHEET_ID`) are read only on the server from `.env.local`/host env, never from a `VITE_`-prefixed variable, never logged, never committed (`.env.*` is git-ignored except `.env.example`).
- Sheet layout (verified against the live sheet): tab **`khách mời`** columns `ID, Name, Link, Link mời` (guest lookup uses ID and Name only; Name may have trailing spaces, trim). Tab **`Responses`** columns `Tên khách, Tham dự, Số người, Lời nhắn, Thời gian`; one row appended per RSVP as `[name, "Có"|"Không", total people (0 if declining), message, "HH:mm:ss d/M/yyyy" in Asia/Ho_Chi_Minh]`. No schema changes to the sheet. Writes use `valueInputOption=RAW` so a message such as `=HYPERLINK(...)` is stored as text, not evaluated.
- Guest links: `/<ID>` (matches the sheet's `Link mời` column) and `?to=<ID>` are both supported; `?to=<free text with spaces/diacritics>` shows that text as the name.

## Review Focus
1. `?to=` containing HTML/`<script>`, 500 characters, only whitespace, or emoji → shown escaped, truncated to 60 chars, or falls back to "Quý khách" (Task 3 tests).
2. Sheet API failing/slow, missing credentials, unknown ID, ID with trailing spaces or numeric ID (`123`), duplicate IDs, a wish starting with `=` → page still renders with "Quý khách", server returns generic errors with no secrets, formulas stored as text (Task 3 tests).
3. Browser blocks `audio.play()` or user taps the music button repeatedly → no crash, button state matches reality (Task 6 test).
4. Countdown after the event date, or with a viewer in another time zone → zeros never negative, same absolute instant (Task 4 tests).
5. RSVP double-click, network failure, "Rất tiếc" with a stale companions number, 500+ character wish → one submission, retry offered with data kept, companions ignored, validation message (Task 11 tests).

---

## File Structure
```
package.json, tsconfig.json, vite.config.ts, index.html, .gitignore, .env.example
reference/prototype.html                 # frozen copy of approved prototype
source/                                  # originals moved from public/asset (git-ignored, not deployed)
scripts/optimize-images.mjs              # sharp: WebP 640/1280/2000 + manifest
scripts/split-prototype-css.py           # one-off: prototype <style> -> src/styles/*.css
public/img/*.webp, public/audio/song.m4a
src/main.tsx, src/App.tsx
src/config/wedding.config.ts, src/config/photo-ids.json
src/generated/photos.json
src/lib/guests.ts, time.ts, ics.ts, rsvp.ts, photos.ts
server/sheets.ts, handlers.ts, http.ts, runtime.ts
api/guest.ts, rsvp.ts, wishes.ts   # Vercel-style serverless functions
vite-api-plugin.ts, vercel.json
src/hooks/useGuestName.ts, useMusic.ts, useReveal.ts, useParallax.ts, useCountdown.ts
src/components/Photo.tsx, Cover.tsx, MusicButton.tsx, Nav.tsx
src/sections/Hero.tsx, Marquee.tsx, Invitation.tsx, Families.tsx, Cinematic.tsx, Story.tsx, Events.tsx, Gallery.tsx, Lightbox.tsx, Rsvp.tsx, Gift.tsx, Footer.tsx
src/styles/base.css + one css file per section
src/test/setup.ts
```

---

### Task 1: Repository scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `.gitignore`, `.env.example`, `src/main.tsx`, `src/App.tsx`, `src/test/setup.ts`, `src/App.test.tsx`, `reference/prototype.html`
- Already done before execution: git init, `public/asset` → `source/asset`, `public/song.mp3` → `source/song.mp3`, `.gitignore`, `reference/prototype.html`, `google-auth-library` installed, `.env.local` present (git-ignored).

**Interfaces:**
- Produces: npm scripts `dev`, `build`, `test`, `photos`; Vitest globals + jsdom with stubs for `IntersectionObserver`, `matchMedia`, `scrollTo`, `HTMLMediaElement.play/pause`.

- [ ] **Step 1: Init git and move originals**

```bash
cd /Users/hongson/Documents/chat-gemini/wedding
git init
mkdir -p source reference
mv public/asset source/asset
mv public/song.mp3 source/song.mp3
cp /private/tmp/claude-501/-Users-hongson-Documents-chat-gemini-wedding/ff87bbc8-cf2c-44ca-a2e9-146d65fb1c88/scratchpad/proto/index.html reference/prototype.html
printf 'node_modules\ndist\nsource\n.env\n.DS_Store\n' > .gitignore
```

- [ ] **Step 2: Write `package.json`**

```json
{
  "name": "wedding-son-lan",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "photos": "node scripts/optimize-images.mjs"
  }
}
```

- [ ] **Step 3: Install dependencies**

```bash
npm install react react-dom
npm install google-auth-library
npm install -D vite @vitejs/plugin-react typescript @types/react @types/react-dom vitest jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom sharp
```

- [ ] **Step 4: Write config files**

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022", "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext", "moduleResolution": "bundler", "jsx": "react-jsx",
    "strict": true, "noUnusedLocals": true, "noUnusedParameters": true,
    "resolveJsonModule": true, "isolatedModules": true, "skipLibCheck": true,
    "types": ["vitest/globals", "@testing-library/jest-dom", "vite/client"]
  },
  "include": ["src", "vite.config.ts"]
}
```

`vite.config.ts`:
```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.mjs'],
  },
})
```

`.env.example` (copy to `.env.local`; server-side only, no `VITE_` prefix):
```
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEET_ID=
# Optional tab names (defaults shown)
GUEST_SHEET_NAME=khách mời
RSVP_SHEET_NAME=Responses
```

`index.html`:
```html
<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="theme-color" content="#1E2318" />
  <title>Thiệp cưới Hồng Sơn &amp; Phương Lan</title>
  <meta name="description" content="Trân trọng kính mời bạn đến dự lễ cưới của Hồng Sơn &amp; Phương Lan, ngày 19 và 20 tháng 12 năm 2026." />
  <meta property="og:title" content="Thiệp cưới Hồng Sơn &amp; Phương Lan" />
  <meta property="og:description" content="19 &amp; 20 . 12 . 2026" />
  <meta property="og:image" content="/img/6457-1280.webp" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Great+Vibes&family=Montserrat:wght@300;400&display=swap" rel="stylesheet" />
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>
```

`src/main.tsx`:
```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

`src/test/setup.ts`:
```ts
import '@testing-library/jest-dom/vitest'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

class IO {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('IntersectionObserver', IO)
window.scrollTo = vi.fn() as unknown as typeof window.scrollTo
window.matchMedia = ((q: string) => ({
  matches: false, media: q, onchange: null,
  addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false,
})) as unknown as typeof window.matchMedia
HTMLMediaElement.prototype.play = vi.fn(() => Promise.resolve())
HTMLMediaElement.prototype.pause = vi.fn()

afterEach(() => {
  cleanup()
  document.body.className = ''
  window.history.replaceState({}, '', '/')
})
```

`src/App.tsx` (placeholder, replaced in Task 6):
```tsx
export function App() {
  return <h1>Hồng Sơn &amp; Phương Lan</h1>
}
```

- [ ] **Step 5: Write the smoke test**

`src/App.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import { App } from './App'

test('renders the couple names', () => {
  render(<App />)
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Hồng Sơn')
})
```

- [ ] **Step 6: Run test and build**

Run: `npm test && npm run build`
Expected: 1 test passes; build succeeds.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite React TS project with Vitest"
```

---

### Task 2: Config, design tokens, section CSS

**Files:**
- Create: `src/config/wedding.config.ts`, `src/config/photo-ids.json`, `scripts/split-prototype-css.py`, `src/styles/*.css` (generated), `src/styles/nav.css`, `src/styles/gift.css`, `src/styles/lightbox.css`, `src/styles/form.css`
- Modify: `src/main.tsx` (import CSS)

**Interfaces:**
- Produces:
```ts
export interface WeddingEvent { id: string; title: string; side: string; startsAt: string; venue: string; address?: string; mapsQuery?: string }
export interface Person { full: string; first: string; role: string; parents: string[]; parentsLabel: string; photo: string }
export const wedding: { groom: Person; bride: Person; events: WeddingEvent[]; hero: { landscape: string; portrait: string }; invitation: { photo: string; lead: string }; quote: { photo: string; text: string }; story: { photo: string; title: string; text: string }[]; gallery: string[]; rsvpBackground: string; gift: { bank: string; accountName: string; accountNumber: string; note: string }; musicSrc: string }
```

- [ ] **Step 1: Write `src/config/photo-ids.json`** (every photo id used anywhere; the script and a test read it)

```json
[
  "6457","6485","7102","6784","6548","7177","7879","6689","6397","7958",
  "6519","7029","7295","7714","7925","8103","8233","6614","6660","6864",
  "7615","7663","6475","6526","6698","6823","7145","7468","7753","7931","8000","8064","8258"
]
```

- [ ] **Step 2: Write `src/config/wedding.config.ts`**

```ts
export interface WeddingEvent {
  id: string
  title: string
  side: string
  startsAt: string
  venue: string
  address?: string
  mapsQuery?: string
}

export interface Person {
  full: string
  first: string
  role: string
  parentsLabel: string
  parents: string[]
  photo: string
}

export const wedding = {
  groom: {
    full: 'Vũ Hồng Sơn', first: 'Hồng Sơn', role: 'Chú rể', parentsLabel: 'Nhà trai',
    parents: ['Ông Vũ Thanh Tùng', 'Bà Nguyễn Thị Ngân'], photo: '6689',
  } satisfies Person,
  bride: {
    full: 'Thái Thị Phương Lan', first: 'Phương Lan', role: 'Cô dâu', parentsLabel: 'Nhà gái',
    parents: ['Bà Trần Thị Tập'], photo: '6397',
  } satisfies Person,
  events: [
    {
      id: 'vu-quy', title: 'Lễ Vu Quy', side: 'Nhà gái', startsAt: '2026-12-19T11:00:00+07:00',
      venue: 'Sảnh Amber · Trung Tâm Hội Nghị & Tiệc Cưới Pavilion Tân Sơn Nhất',
      address: '202 Hoàng Văn Thụ, Phường Đức Nhuận, TP. Hồ Chí Minh',
      mapsQuery: 'Trung Tâm Hội Nghị & Tiệc Cưới Pavilion Tân Sơn Nhất 202 Hoàng Văn Thụ',
    },
    { id: 'thanh-hon', title: 'Lễ Thành Hôn', side: 'Nhà trai', startsAt: '2026-12-20T11:00:00+07:00', venue: 'Tư gia nhà trai' },
  ] satisfies WeddingEvent[],
  hero: { landscape: '6457', portrait: '6485' },
  invitation: {
    photo: '7102',
    lead: 'Giữa bao điều bình dị, chúng mình tìm thấy nhau. Trân trọng kính mời bạn đến chung vui và chứng kiến khoảnh khắc chúng mình nên duyên.',
  },
  quote: { photo: '6784', text: 'Giữa ngàn thông và sương sớm, chúng mình chọn nhau đến cuối đời.' },
  story: [
    { photo: '6548', title: 'Ngày gặp gỡ', text: 'Một cuộc gặp tình cờ, một nụ cười đủ để mọi thứ khác đi.' },
    { photo: '7177', title: 'Những mùa yêu', text: 'Cùng nhau đi qua nắng, qua mưa, qua những ngày bình thường nhất.' },
    { photo: '7879', title: 'Lời hẹn ước', text: 'Và hôm nay, chúng mình muốn bạn là người chứng kiến lời hẹn ấy.' },
  ],
  gallery: [
    '6485','6519','7029','7295','7714','7925','8103','8233','6614','6660','6864','7615',
    '7663','6475','6526','6698','6823','7145','7468','7753','7931','8000','8064','8258',
  ],
  rsvpBackground: '7958',
  gift: { bank: 'Đang cập nhật', accountName: 'Đang cập nhật', accountNumber: 'Đang cập nhật', note: 'Sự hiện diện của bạn là món quà quý nhất với chúng mình.' },
  musicSrc: '/audio/song.m4a',
}
```

- [ ] **Step 3: (removed by Amendment A, no env/mocks module is needed.)**

- [ ] **Step 4: Write the CSS splitter** `scripts/split-prototype-css.py`

```python
import pathlib, re

root = pathlib.Path(__file__).resolve().parent.parent
src = (root / 'reference' / 'prototype.html').read_text(encoding='utf8')
css = re.search(r'<style>(.*?)</style>', src, re.S).group(1)
parts = re.split(r'/\* -+ ([\w ]+?) -+ \*/', css)
out = root / 'src' / 'styles'
out.mkdir(parents=True, exist_ok=True)
(out / 'base.css').write_text(parts[0].strip() + '\n', encoding='utf8')
for i in range(1, len(parts), 2):
    name = parts[i].strip().replace(' ', '-')
    (out / f'{name}.css').write_text(parts[i + 1].strip() + '\n', encoding='utf8')
    print('wrote', name)
```

Run: `python3 scripts/split-prototype-css.py`
Expected output lines: `curtain, hero, marquee, invitation, cinematic, story, event, gallery-strip, rsvp`. Then rename: `mv src/styles/gallery-strip.css src/styles/gallery.css`. (`invitation.css` also holds the Families rules; `rsvp.css` also holds footer and reduced-motion rules. This is intentional.)

- [ ] **Step 6: Write the new CSS files the prototype did not have**

`src/styles/nav.css`:
```css
.nav{position:fixed;top:0;left:0;right:0;z-index:50;display:none;justify-content:space-between;align-items:center;padding:14px clamp(20px,5vw,72px);background:rgba(250,246,239,.9);backdrop-filter:blur(10px);border-bottom:1px solid rgba(185,158,123,.4);transform:translateY(-100%);transition:transform .6s var(--ease)}
.nav.show{transform:none}
@media(min-width:1024px){.nav{display:flex}}
.nav .logo{font-family:var(--script);font-size:30px;color:var(--pine);text-decoration:none;line-height:1}
.nav ul{display:flex;gap:clamp(18px,3vw,44px);list-style:none}
.nav a.l{font:400 11px var(--sans);letter-spacing:.28em;text-transform:uppercase;text-decoration:none;color:var(--mute);padding:12px 0;display:inline-block}
.nav a.l:hover{color:var(--pine)}
```

`src/styles/gift.css`:
```css
.gift{background:var(--bg);padding:clamp(70px,10vw,140px) clamp(20px,5vw,72px);text-align:center}
.gift .box{max-width:520px;margin:36px auto 0;border:1px solid var(--gold-l);padding:clamp(28px,5vw,48px)}
.gift .qr{width:180px;height:180px;margin:0 auto 24px;border:1px dashed var(--gold);display:flex;align-items:center;justify-content:center;font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:var(--mute)}
.gift dl{display:grid;gap:14px}.gift dt{font-size:11px;letter-spacing:.3em;text-transform:uppercase;color:var(--gold)}
.gift dd{font-family:var(--serif);font-size:24px;font-weight:500}
.gift .note{font-family:var(--serif);font-style:italic;font-size:20px;color:var(--mute);margin-top:28px}
```

`src/styles/lightbox.css`:
```css
.lb{position:fixed;inset:0;z-index:90;background:rgba(20,24,16,.94);display:flex;align-items:center;justify-content:center;touch-action:pan-y}
.lb img{max-width:92vw;max-height:86vh;width:auto;height:auto;object-fit:contain}
.lb button{position:absolute;width:48px;height:48px;border-radius:50%;border:1px solid var(--gold);background:rgba(30,35,24,.6);color:var(--gold-l);cursor:pointer;font-size:20px;display:flex;align-items:center;justify-content:center}
.lb .x{top:16px;right:16px}.lb .pv{left:12px;top:50%}.lb .nx{right:12px;top:50%}
.lb .ct{position:absolute;bottom:18px;left:0;right:0;text-align:center;font:300 12px var(--sans);letter-spacing:.3em;color:var(--gold-l)}
.strip figure{cursor:zoom-in;border:0;background:none;padding:0}
```

`src/styles/form.css`:
```css
.err{color:#9B2C2C;font-size:13px;margin-top:6px}
.status{font-family:var(--serif);font-size:24px;text-align:center;padding:24px 0}
.wishes{max-width:620px;margin:28px auto 0;position:relative;z-index:2;display:grid;gap:14px}
.wishes blockquote{background:rgba(250,246,239,.94);padding:18px 22px;font-family:var(--serif);font-size:20px;line-height:1.4}
.wishes cite{display:block;font:400 11px var(--sans);letter-spacing:.26em;text-transform:uppercase;color:var(--gold);margin-top:8px;font-style:normal}
```

- [ ] **Step 7: Import all CSS in `src/main.tsx`**

Add above the `App` import:
```tsx
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
```

- [ ] **Step 8: Verify and commit**

Run: `npm run build`
Expected: succeeds, CSS bundled (check `dist/assets/*.css` exists).

```bash
git add -A
git commit -m "feat: add wedding config, design tokens and section styles"
```

---

### Task 3: Guest lookup (Google Sheet via server API)

**Files:**
- Create: `src/lib/guests.ts`, `src/lib/guests.test.ts`, `src/hooks/useGuestName.ts`, `server/sheets.ts`, `server/sheets.test.ts`, `server/handlers.ts`, `server/handlers.test.ts`, `server/http.ts`, `server/runtime.ts`, `api/guest.ts`, `api/rsvp.ts`, `api/wishes.ts`, `vite-api-plugin.ts`, `vercel.json`
- Modify: `vite.config.ts`, `tsconfig.json` (include `server`, `api`, `vite-api-plugin.ts`; add `"node"` to `types`)

**Interfaces:**
- Produces (client):
```ts
export const DEFAULT_GUEST = 'Quý khách'
export function sanitizeName(raw: string | null | undefined): string | null
export function looksLikeId(s: string): boolean                       // /^[A-Za-z0-9_-]{1,40}$/
export interface GuestRef { id: string | null; freeText: string | null }
export function readGuestRef(loc: { pathname: string; search: string }): GuestRef
export function fetchGuestName(id: string, fetchImpl?: typeof fetch, timeoutMs?: number): Promise<string | null>
export function useGuestName(): { name: string; id: string | null }
```
- Produces (server):
```ts
export interface SheetsEnv { email: string; privateKey: string; sheetId: string; guestTab: string; responseTab: string }
export function readSheetsEnv(e: Record<string, string | undefined>): SheetsEnv      // throws Error on missing credentials
export function findGuestName(rows: string[][], id: string): string | null
export function formatSheetTime(d: Date): string                                       // "17:42:49 4/4/2026" (Asia/Ho_Chi_Minh)
export function buildResponseRow(p: { name: string; attending: boolean; companions: number; message: string }, now: Date): string[]
export interface SheetsApi { getGuestRows(): Promise<string[][]>; appendResponse(row: string[]): Promise<void>; getResponseRows(): Promise<string[][]> }
export type SheetsRequest = (o: { url: string; method?: 'GET' | 'POST'; params?: Record<string, string>; data?: unknown }) => Promise<{ data: any }>
export function createSheetsApi(env: SheetsEnv, request?: SheetsRequest): SheetsApi
export interface HttpResult { status: number; body: unknown }
export function createHandlers(api: SheetsApi, opts?: { now?: () => number }): { guest(id: string | undefined): Promise<HttpResult>; rsvp(body: unknown): Promise<HttpResult>; wishes(): Promise<HttpResult> }
```
- Consumes from Task 11: `validateRsvp` (`src/lib/rsvp.ts`). To keep Task 3 self-contained, Task 3 creates `src/lib/rsvp.ts` containing only `RsvpPayload` and `validateRsvp` (final form below); Task 11 adds the client to that file.

- [ ] **Step 1: Write failing client tests** `src/lib/guests.test.ts`

```ts
import { DEFAULT_GUEST, fetchGuestName, looksLikeId, readGuestRef, sanitizeName } from './guests'

describe('sanitizeName', () => {
  test('trims, collapses whitespace, strips control characters, truncates to 60', () => {
    expect(sanitizeName('  Anh \n  Minh\u0007 ')).toBe('Anh Minh')
    expect(sanitizeName('a'.repeat(500))).toHaveLength(60)
  })
  test('returns null for empty, whitespace-only or missing input', () => {
    expect(sanitizeName('   ')).toBeNull()
    expect(sanitizeName(null)).toBeNull()
    expect(sanitizeName(undefined)).toBeNull()
  })
  test('keeps HTML as inert text (React escapes it on render)', () => {
    expect(sanitizeName('<script>alert(1)</script>')).toBe('<script>alert(1)</script>')
  })
})

describe('looksLikeId', () => {
  test.each(['HaHxtn', '9WNYt0', '123', 'a_b-c'])('accepts %s', (v) => expect(looksLikeId(v)).toBe(true))
  test.each(['', 'Anh Minh', 'Chị', 'a.b', 'x'.repeat(41), '<b>'])('rejects %j', (v) => expect(looksLikeId(v)).toBe(false))
})

describe('readGuestRef', () => {
  test('takes the id from the first path segment', () => {
    expect(readGuestRef({ pathname: '/HaHxtn', search: '' })).toEqual({ id: 'HaHxtn', freeText: null })
    expect(readGuestRef({ pathname: '/HaHxtn/', search: '' }).id).toBe('HaHxtn')
  })
  test('takes the id from ?to= when the path is empty', () => {
    expect(readGuestRef({ pathname: '/', search: '?to=9WNYt0' })).toEqual({ id: '9WNYt0', freeText: null })
  })
  test('the path wins over ?to=', () => {
    expect(readGuestRef({ pathname: '/abc', search: '?to=xyz' }).id).toBe('abc')
  })
  test('?to= with spaces or diacritics is free text, never an id', () => {
    expect(readGuestRef({ pathname: '/', search: '?to=Anh%20Minh%20%26%20Ch%E1%BB%8B%20Lan' })).toEqual({ id: null, freeText: 'Anh Minh & Chị Lan' })
  })
  test('HTML in ?to= stays inert text and is truncated', () => {
    const r = readGuestRef({ pathname: '/', search: '?to=' + encodeURIComponent('<img src=x onerror=alert(1)>' + 'z'.repeat(100)) })
    expect(r.id).toBeNull()
    expect(r.freeText!.startsWith('<img src=x')).toBe(true)
    expect(r.freeText!.length).toBe(60)
  })
  test('no path and no query -> nothing', () => {
    expect(readGuestRef({ pathname: '/', search: '' })).toEqual({ id: null, freeText: null })
    expect(readGuestRef({ pathname: '/', search: '?to=%20%20' })).toEqual({ id: null, freeText: null })
  })
  test('a malformed percent-escape in the path does not throw', () => {
    expect(() => readGuestRef({ pathname: '/%E0%A4%A', search: '' })).not.toThrow()
  })
})

describe('fetchGuestName', () => {
  const ok = (body: unknown) => vi.fn().mockResolvedValue({ ok: true, json: async () => body })
  test('returns the sanitized name and encodes the id', async () => {
    const f = ok({ name: '  Ánh Nguyệt ' })
    expect(await fetchGuestName('a b', f as unknown as typeof fetch)).toBe('Ánh Nguyệt')
    expect(f.mock.calls[0][0]).toBe('/api/guest?id=a%20b')
  })
  test('null when the server has no such guest', async () => {
    expect(await fetchGuestName('x', ok({ name: null }) as unknown as typeof fetch)).toBeNull()
  })
  test('null on network error, non-OK status, bad JSON or timeout', async () => {
    expect(await fetchGuestName('x', vi.fn().mockRejectedValue(new Error('net')) as unknown as typeof fetch)).toBeNull()
    expect(await fetchGuestName('x', vi.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch)).toBeNull()
    expect(await fetchGuestName('x', vi.fn().mockResolvedValue({ ok: true, json: async () => { throw new Error('bad') } }) as unknown as typeof fetch)).toBeNull()
    const hang = vi.fn((_u: string, init?: RequestInit) => new Promise((_r, rej) => init?.signal?.addEventListener('abort', () => rej(new Error('abort')))))
    expect(await fetchGuestName('x', hang as unknown as typeof fetch, 20)).toBeNull()
  })
  test('DEFAULT_GUEST is the polite fallback', () => expect(DEFAULT_GUEST).toBe('Quý khách'))
})
```

- [ ] **Step 2: Write failing server tests**

`server/sheets.test.ts`:
```ts
import { buildResponseRow, createSheetsApi, findGuestName, formatSheetTime, readSheetsEnv, type SheetsEnv } from './sheets'

const rows = [
  ['ID', 'Name', 'Link', 'Link mời'],
  ['123', 'Ánh Nguyệt ', '', 'http://x/123'],
  ['9WNYt0', ' Châu Nguyệt ', '', ''],
  ['dup', 'Người Đầu', '', ''],
  ['dup', 'Người Sau', '', ''],
  ['noname', '', '', ''],
]

describe('findGuestName', () => {
  test('finds by exact ID (numeric IDs too) and trims the name', () => {
    expect(findGuestName(rows, '123')).toBe('Ánh Nguyệt')
    expect(findGuestName(rows, '9WNYt0')).toBe('Châu Nguyệt')
  })
  test('IDs are case-sensitive, the header row is not a guest, first duplicate wins', () => {
    expect(findGuestName(rows, '9wnyt0')).toBeNull()
    expect(findGuestName(rows, 'ID')).toBeNull()
    expect(findGuestName(rows, 'dup')).toBe('Người Đầu')
  })
  test('unknown id or a row without a name -> null', () => {
    expect(findGuestName(rows, 'nope')).toBeNull()
    expect(findGuestName(rows, 'noname')).toBeNull()
    expect(findGuestName([], '123')).toBeNull()
  })
})

describe('formatSheetTime', () => {
  test('matches the sheet format in Ho Chi Minh time', () => {
    expect(formatSheetTime(new Date('2026-04-04T10:42:49Z'))).toBe('17:42:49 4/4/2026')
    expect(formatSheetTime(new Date('2026-12-19T17:05:09Z'))).toBe('00:05:09 20/12/2026')
  })
})

describe('buildResponseRow', () => {
  const now = new Date('2026-04-04T10:42:49Z')
  test('attending: total people = 1 + companions', () => {
    expect(buildResponseRow({ name: ' Anh Minh ', attending: true, companions: 2, message: ' Chúc mừng ' }, now))
      .toEqual(['Anh Minh', 'Có', '3', 'Chúc mừng', '17:42:49 4/4/2026'])
  })
  test('declining: 0 people, companions ignored', () => {
    expect(buildResponseRow({ name: 'Chị Lan', attending: false, companions: 5, message: '' }, now))
      .toEqual(['Chị Lan', 'Không', '0', '', '17:42:49 4/4/2026'])
  })
})

describe('readSheetsEnv', () => {
  test('requires all credentials, turns \\n into newlines and applies tab defaults', () => {
    const e = readSheetsEnv({ GOOGLE_SERVICE_ACCOUNT_EMAIL: 'a@b', GOOGLE_PRIVATE_KEY: 'k1\\nk2', GOOGLE_SHEET_ID: 'sid' })
    expect(e).toEqual({ email: 'a@b', privateKey: 'k1\nk2', sheetId: 'sid', guestTab: 'khách mời', responseTab: 'Responses' })
  })
  test('throws without echoing secrets when something is missing', () => {
    expect(() => readSheetsEnv({ GOOGLE_PRIVATE_KEY: 'SECRETKEY' })).toThrow(/GOOGLE_SERVICE_ACCOUNT_EMAIL/)
    try { readSheetsEnv({ GOOGLE_PRIVATE_KEY: 'SECRETKEY' }) } catch (e) { expect(String(e)).not.toContain('SECRETKEY') }
  })
})

describe('createSheetsApi', () => {
  const env: SheetsEnv = { email: 'a@b', privateKey: 'k', sheetId: 'SID', guestTab: "khách mời", responseTab: 'Responses' }
  test('reads the guest tab A:B with the tab name quoted and encoded', async () => {
    const request = vi.fn().mockResolvedValue({ data: { values: [['ID', 'Name']] } })
    expect(await createSheetsApi(env, request).getGuestRows()).toEqual([['ID', 'Name']])
    expect(request.mock.calls[0][0].url).toBe(`https://sheets.googleapis.com/v4/spreadsheets/SID/values/${encodeURIComponent("'khách mời'!A:B")}`)
  })
  test('appends a RAW row so a leading = is stored as text, never a formula', async () => {
    const request = vi.fn().mockResolvedValue({ data: {} })
    await createSheetsApi(env, request).appendResponse(['A', 'Có', '1', '=HYPERLINK("http://evil")', 't'])
    const o = request.mock.calls[0][0]
    expect(o.method).toBe('POST')
    expect(o.url).toContain(`/values/${encodeURIComponent("'Responses'!A:E")}:append`)
    expect(o.params).toEqual({ valueInputOption: 'RAW', insertDataOption: 'INSERT_ROWS' })
    expect(o.data).toEqual({ values: [['A', 'Có', '1', '=HYPERLINK("http://evil")', 't']] })
  })
  test('an empty tab yields []', async () => {
    const request = vi.fn().mockResolvedValue({ data: {} })
    expect(await createSheetsApi(env, request).getResponseRows()).toEqual([])
  })
})
```

`server/handlers.test.ts`:
```ts
import { createHandlers } from './handlers'
import type { SheetsApi } from './sheets'

const guests = [['ID', 'Name'], ['HaHxtn', 'Ánh Nguyệt '], ['123', 'Chi']]
function fakeApi(over: Partial<SheetsApi> = {}): SheetsApi & { appended: string[][] } {
  const appended: string[][] = []
  return {
    appended,
    getGuestRows: async () => guests,
    getResponseRows: async () => [
      ['Tên khách', 'Tham dự', 'Số người', 'Lời nhắn', 'Thời gian'],
      ['Châu Nguyệt ', 'Có', '1', 'tham gia', '17:42:49 4/4/2026'],
      ['Im Lặng', 'Có', '1', '', 't'],
      ['Chị Lan', 'Không', '0', 'Tiếc quá', 't2'],
    ],
    appendResponse: async (row) => { appended.push(row) },
    ...over,
  }
}

describe('guest', () => {
  test('returns the trimmed name for a known ID', async () => {
    expect(await createHandlers(fakeApi()).guest('HaHxtn')).toEqual({ status: 200, body: { name: 'Ánh Nguyệt' } })
  })
  test('unknown ID -> 200 with name null (the page falls back to Quý khách)', async () => {
    expect(await createHandlers(fakeApi()).guest('zzz')).toEqual({ status: 200, body: { name: null } })
  })
  test('missing or malformed id -> 400', async () => {
    expect((await createHandlers(fakeApi()).guest(undefined)).status).toBe(400)
    expect((await createHandlers(fakeApi()).guest('a b<script>')).status).toBe(400)
  })
  test('a sheet failure -> 502 with a generic message, no details leaked', async () => {
    const api = fakeApi({ getGuestRows: async () => { throw new Error('invalid_grant: SECRET') } })
    const r = await createHandlers(api).guest('HaHxtn')
    expect(r.status).toBe(502)
    expect(JSON.stringify(r.body)).not.toContain('SECRET')
  })
  test('caches the sheet for 60 seconds', async () => {
    let calls = 0
    let t = 0
    const api = fakeApi({ getGuestRows: async () => { calls++; return guests } })
    const h = createHandlers(api, { now: () => t })
    await h.guest('123'); await h.guest('HaHxtn')
    expect(calls).toBe(1)
    t = 61_000
    await h.guest('123')
    expect(calls).toBe(2)
  })
})

describe('rsvp', () => {
  const good = { name: 'Anh Minh', attending: true, companions: 1, message: 'Chúc mừng' }
  test('appends one row and answers ok', async () => {
    const api = fakeApi()
    const r = await createHandlers(api).rsvp(good)
    expect(r).toEqual({ status: 200, body: { ok: true } })
    expect(api.appended).toHaveLength(1)
    expect(api.appended[0].slice(0, 4)).toEqual(['Anh Minh', 'Có', '2', 'Chúc mừng'])
  })
  test('declining stores 0 people', async () => {
    const api = fakeApi()
    await createHandlers(api).rsvp({ ...good, attending: false, companions: 7 })
    expect(api.appended[0].slice(1, 3)).toEqual(['Không', '0'])
  })
  test.each([
    [null], ['text'], [{}], [{ ...good, name: '' }], [{ ...good, name: 'x'.repeat(61) }],
    [{ ...good, companions: 10 }], [{ ...good, companions: 'two' }], [{ ...good, attending: 'yes' }],
    [{ ...good, message: 'x'.repeat(501) }],
  ])('rejects invalid body %#', async (body) => {
    const api = fakeApi()
    const r = await createHandlers(api).rsvp(body)
    expect(r.status).toBe(400)
    expect(api.appended).toHaveLength(0)
  })
  test('a message beginning with = is passed through untouched (RAW storage makes it inert)', async () => {
    const api = fakeApi()
    await createHandlers(api).rsvp({ ...good, message: '=SUM(1+1)' })
    expect(api.appended[0][3]).toBe('=SUM(1+1)')
  })
  test('a sheet failure -> 502 generic', async () => {
    const api = fakeApi({ appendResponse: async () => { throw new Error('quota SECRET') } })
    const r = await createHandlers(api).rsvp(good)
    expect(r.status).toBe(502)
    expect(JSON.stringify(r.body)).not.toContain('SECRET')
  })
})

describe('wishes', () => {
  test('returns newest first, skips empty messages, trims names, at most 30', async () => {
    const r = await createHandlers(fakeApi()).wishes()
    expect(r.status).toBe(200)
    expect(r.body).toEqual([
      { name: 'Chị Lan', message: 'Tiếc quá', at: 't2' },
      { name: 'Châu Nguyệt', message: 'tham gia', at: '17:42:49 4/4/2026' },
    ])
  })
  test('failure -> 200 with [] so the page just hides the wall', async () => {
    const api = fakeApi({ getResponseRows: async () => { throw new Error('x') } })
    expect(await createHandlers(api).wishes()).toEqual({ status: 200, body: [] })
  })
})
```

- [ ] **Step 3: Run to confirm failure**

Run: `npx vitest run src/lib/guests.test.ts server`
Expected: FAIL (modules missing).

- [ ] **Step 4: Implement `src/lib/guests.ts`**

```ts
export const DEFAULT_GUEST = 'Quý khách'
const MAX_NAME = 60
const ID_LIKE = /^[A-Za-z0-9_-]{1,40}$/

export function sanitizeName(raw: string | null | undefined): string | null {
  if (!raw) return null
  // eslint-disable-next-line no-control-regex
  const cleaned = raw.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, MAX_NAME).trim()
  return cleaned || null
}

export function looksLikeId(s: string): boolean {
  return ID_LIKE.test(s)
}

export interface GuestRef { id: string | null; freeText: string | null }

function safeDecode(s: string): string {
  try { return decodeURIComponent(s) } catch { return s }
}

export function readGuestRef(loc: { pathname: string; search: string }): GuestRef {
  const seg = safeDecode(loc.pathname.split('/').filter(Boolean)[0] ?? '')
  if (looksLikeId(seg)) return { id: seg, freeText: null }
  const q = sanitizeName(new URLSearchParams(loc.search).get('to'))
  if (!q) return { id: null, freeText: null }
  return looksLikeId(q) ? { id: q, freeText: null } : { id: null, freeText: q }
}

export async function fetchGuestName(id: string, fetchImpl: typeof fetch = fetch, timeoutMs = 4000): Promise<string | null> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetchImpl(`/api/guest?id=${encodeURIComponent(id)}`, { signal: ctrl.signal })
    if (!res.ok) return null
    const data = await res.json()
    return sanitizeName(typeof data?.name === 'string' ? data.name : null)
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}
```

`src/hooks/useGuestName.ts`:
```ts
import { useEffect, useState } from 'react'
import { DEFAULT_GUEST, fetchGuestName, readGuestRef } from '../lib/guests'

export function useGuestName(): { name: string; id: string | null } {
  const [ref] = useState(() => readGuestRef(window.location))
  // Free-text names show immediately; an ID waits for the lookup so the wrong name never flashes.
  const [name, setName] = useState(ref.freeText ?? DEFAULT_GUEST)
  useEffect(() => {
    if (!ref.id) return
    let alive = true
    void fetchGuestName(ref.id).then((n) => { if (alive && n) setName(n) })
    return () => { alive = false }
  }, [ref.id])
  return { name, id: ref.id }
}
```

- [ ] **Step 5: Implement `src/lib/rsvp.ts`** (validation only for now; Task 11 adds the API client below it)

```ts
export interface RsvpPayload { name: string; attending: boolean; companions: number; message: string }   // companions = people coming WITH the guest (0-9); total = 1 + companions

export function validateRsvp(p: RsvpPayload): Partial<Record<'name' | 'companions' | 'message', string>> {
  const e: Partial<Record<'name' | 'companions' | 'message', string>> = {}
  const name = p.name.trim()
  if (!name) e.name = 'Vui lòng nhập họ tên.'
  else if (name.length > 60) e.name = 'Họ tên tối đa 60 ký tự.'
  if (p.attending && (!Number.isInteger(p.companions) || p.companions < 0 || p.companions > 9)) e.companions = 'Số người đi cùng từ 0 đến 9.'
  if (p.message.length > 500) e.message = 'Lời chúc tối đa 500 ký tự.'
  return e
}
```

- [ ] **Step 6: Implement `server/sheets.ts`**

```ts
import { JWT } from 'google-auth-library'

export interface SheetsEnv { email: string; privateKey: string; sheetId: string; guestTab: string; responseTab: string }

export function readSheetsEnv(e: Record<string, string | undefined>): SheetsEnv {
  const need = (k: string) => {
    const v = e[k]
    if (!v) throw new Error(`Missing environment variable ${k}`)
    return v
  }
  return {
    email: need('GOOGLE_SERVICE_ACCOUNT_EMAIL'),
    privateKey: need('GOOGLE_PRIVATE_KEY').replace(/\\n/g, '\n'),
    sheetId: need('GOOGLE_SHEET_ID'),
    guestTab: e.GUEST_SHEET_NAME || 'khách mời',
    responseTab: e.RSVP_SHEET_NAME || 'Responses',
  }
}

export function findGuestName(rows: string[][], id: string): string | null {
  for (const r of rows.slice(1)) {
    if ((r[0] ?? '').trim() === id) {
      const name = (r[1] ?? '').trim()
      return name || null
    }
  }
  return null
}

export function formatSheetTime(d: Date): string {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Ho_Chi_Minh', hourCycle: 'h23', day: 'numeric', month: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).formatToParts(d).map((x) => [x.type, x.value]),
  )
  return `${p.hour}:${p.minute}:${p.second} ${p.day}/${p.month}/${p.year}`
}

export function buildResponseRow(
  p: { name: string; attending: boolean; companions: number; message: string },
  now: Date,
): string[] {
  const total = p.attending ? 1 + p.companions : 0
  return [p.name.trim(), p.attending ? 'Có' : 'Không', String(total), p.message.trim(), formatSheetTime(now)]
}

export interface SheetsApi {
  getGuestRows(): Promise<string[][]>
  appendResponse(row: string[]): Promise<void>
  getResponseRows(): Promise<string[][]>
}

export type SheetsRequest = (o: { url: string; method?: 'GET' | 'POST'; params?: Record<string, string>; data?: unknown }) => Promise<{ data: any }>

const BASE = 'https://sheets.googleapis.com/v4/spreadsheets'

function defaultRequest(env: SheetsEnv): SheetsRequest {
  const auth = new JWT({ email: env.email, key: env.privateKey, scopes: ['https://www.googleapis.com/auth/spreadsheets'] })
  return (o) => auth.request({ url: o.url, method: o.method ?? 'GET', params: o.params, data: o.data, timeout: 8000 }) as Promise<{ data: any }>
}

export function createSheetsApi(env: SheetsEnv, request: SheetsRequest = defaultRequest(env)): SheetsApi {
  const range = (tab: string, cols: string) => encodeURIComponent(`'${tab.replace(/'/g, "''")}'!${cols}`)
  const values = async (tab: string, cols: string) => {
    const r = await request({ url: `${BASE}/${env.sheetId}/values/${range(tab, cols)}` })
    return (r.data?.values ?? []) as string[][]
  }
  return {
    getGuestRows: () => values(env.guestTab, 'A:B'),
    getResponseRows: () => values(env.responseTab, 'A:E'),
    async appendResponse(row) {
      await request({
        url: `${BASE}/${env.sheetId}/values/${range(env.responseTab, 'A:E')}:append`,
        method: 'POST',
        params: { valueInputOption: 'RAW', insertDataOption: 'INSERT_ROWS' },
        data: { values: [row] },
      })
    },
  }
}
```

- [ ] **Step 7: Implement `server/handlers.ts`**

```ts
import { looksLikeId, sanitizeName } from '../src/lib/guests'
import { validateRsvp } from '../src/lib/rsvp'
import { buildResponseRow, findGuestName, type SheetsApi } from './sheets'

export interface HttpResult { status: number; body: unknown }

const GUEST_TTL = 60_000
const WISH_TTL = 30_000
const BAD_GATEWAY: HttpResult = { status: 502, body: { error: 'Không kết nối được bảng tính. Vui lòng thử lại sau.' } }

function cached<T>(ttl: number, now: () => number, load: () => Promise<T>) {
  let value: T | undefined
  let at = -Infinity
  return async () => {
    if (value === undefined || now() - at >= ttl) {
      value = await load()
      at = now()
    }
    return value
  }
}

export function createHandlers(api: SheetsApi, opts: { now?: () => number } = {}) {
  const now = opts.now ?? Date.now
  const guestRows = cached(GUEST_TTL, now, () => api.getGuestRows())
  const responseRows = cached(WISH_TTL, now, () => api.getResponseRows())

  return {
    async guest(id: string | undefined): Promise<HttpResult> {
      if (!id || !looksLikeId(id)) return { status: 400, body: { error: 'Invalid id' } }
      try {
        return { status: 200, body: { name: findGuestName(await guestRows(), id) } }
      } catch {
        return BAD_GATEWAY
      }
    },

    async rsvp(body: unknown): Promise<HttpResult> {
      const b = body as Record<string, unknown> | null
      if (
        !b || typeof b !== 'object' || typeof b.name !== 'string' || typeof b.attending !== 'boolean' ||
        typeof b.companions !== 'number' || typeof b.message !== 'string'
      ) return { status: 400, body: { error: 'Invalid body' } }
      const payload = { name: b.name, attending: b.attending, companions: b.companions, message: b.message }
      const errors = validateRsvp(payload)
      if (Object.keys(errors).length) return { status: 400, body: { errors } }
      try {
        await api.appendResponse(buildResponseRow({ ...payload, name: sanitizeName(payload.name) ?? payload.name }, new Date(now())))
        return { status: 200, body: { ok: true } }
      } catch {
        return BAD_GATEWAY
      }
    },

    async wishes(): Promise<HttpResult> {
      try {
        const rows = (await responseRows()).slice(1)
        const wishes = rows
          .map((r) => ({ name: (r[0] ?? '').trim(), message: (r[3] ?? '').trim(), at: r[4] ?? '' }))
          .filter((w) => w.message)
          .slice(-30)
          .reverse()
        return { status: 200, body: wishes }
      } catch {
        return { status: 200, body: [] }
      }
    },
  }
}
```

Note: the `now` passed to `new Date(now())` in the rsvp handler is the injected clock (defaults to `Date.now`), so the sheet timestamp is real in production and controllable in tests.

- [ ] **Step 8: Run server and client tests**

Run: `npx vitest run src/lib/guests.test.ts server`
Expected: all pass. If the `wishes` test fails on the header typo in `fakeApi` (`'Lời nhắn'`), that is only a header cell the code skips, so it must not matter; if it does, the implementation is wrong.

- [ ] **Step 9: Implement the HTTP glue**

`server/http.ts`:
```ts
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { HttpResult } from './handlers'

export function send(res: ServerResponse, r: HttpResult): void {
  res.statusCode = r.status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(r.body))
}

export async function readJson(req: IncomingMessage & { body?: unknown }, limit = 10_000): Promise<unknown> {
  if (req.body !== undefined) return typeof req.body === 'string' ? JSON.parse(req.body) : req.body // Vercel pre-parses
  const chunks: Buffer[] = []
  let size = 0
  for await (const c of req) {
    size += (c as Buffer).length
    if (size > limit) throw new Error('Body too large')
    chunks.push(c as Buffer)
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}
```

`server/runtime.ts`:
```ts
import { createHandlers } from './handlers'
import { createSheetsApi, readSheetsEnv } from './sheets'

let handlers: ReturnType<typeof createHandlers> | undefined

export function getHandlers() {
  handlers ??= createHandlers(createSheetsApi(readSheetsEnv(process.env)))
  return handlers
}
```

`api/guest.ts`:
```ts
import type { IncomingMessage, ServerResponse } from 'node:http'
import { getHandlers } from '../server/runtime'
import { send } from '../server/http'

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'GET') return send(res, { status: 405, body: { error: 'Method not allowed' } })
  try {
    const id = new URL(req.url ?? '', 'http://localhost').searchParams.get('id') ?? undefined
    send(res, await getHandlers().guest(id))
  } catch {
    send(res, { status: 500, body: { error: 'Server not configured' } })
  }
}
```

`api/rsvp.ts`:
```ts
import type { IncomingMessage, ServerResponse } from 'node:http'
import { getHandlers } from '../server/runtime'
import { readJson, send } from '../server/http'

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') return send(res, { status: 405, body: { error: 'Method not allowed' } })
  let body: unknown
  try {
    body = await readJson(req)
  } catch {
    return send(res, { status: 400, body: { error: 'Invalid body' } })
  }
  try {
    send(res, await getHandlers().rsvp(body))
  } catch {
    send(res, { status: 500, body: { error: 'Server not configured' } })
  }
}
```

`api/wishes.ts`:
```ts
import type { IncomingMessage, ServerResponse } from 'node:http'
import { getHandlers } from '../server/runtime'
import { send } from '../server/http'

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'GET') return send(res, { status: 405, body: { error: 'Method not allowed' } })
  try {
    send(res, await getHandlers().wishes())
  } catch {
    send(res, { status: 200, body: [] })
  }
}
```

`vite-api-plugin.ts`:
```ts
import { loadEnv, type Plugin } from 'vite'

// Serves /api/* from the same handlers Vercel runs in production, so `npm run dev` talks to the real sheet.
export function apiPlugin(): Plugin {
  return {
    name: 'wedding-api',
    configureServer(server) {
      Object.assign(process.env, loadEnv(server.config.mode, process.cwd(), '')) // server-side only; no VITE_ prefix means it never reaches the client
      server.middlewares.use(async (req, res, next) => {
        const m = req.url?.match(/^\/api\/(guest|rsvp|wishes)(?:\?|$)/)
        if (!m) return next()
        try {
          const mod = await server.ssrLoadModule(`/api/${m[1]}.ts`)
          await mod.default(req, res)
        } catch (e) {
          server.config.logger.error(`[api/${m[1]}] ${e instanceof Error ? e.message : 'error'}`)
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Internal error' }))
        }
      })
    },
  }
}
```

`vercel.json`:
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```
(Vercel serves static files and `/api/*` functions before applying rewrites, so this only catches guest paths like `/HaHxtn`.)

Modify `vite.config.ts`: add `import { apiPlugin } from './vite-api-plugin'` and `plugins: [react(), apiPlugin()]`. Modify `tsconfig.json`: `"include": ["src", "server", "api", "vite.config.ts", "vite-api-plugin.ts"]` and `"types": ["vitest/globals", "@testing-library/jest-dom", "vite/client", "node"]`; run `npm install -D @types/node`. Add `"server/**/*.test.ts"` to the vitest `include` list.

- [ ] **Step 10: Verify against the real sheet (no secrets printed)**

Run `npm run dev` in the background, then:
```bash
curl -s "http://localhost:5173/api/guest?id=HaHxtn"
curl -s "http://localhost:5173/api/guest?id=nope"
curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:5173/api/guest?id=a%20b"
curl -s "http://localhost:5173/api/wishes"
```
Expected: `{"name":"<the name in the sheet for HaHxtn>"}`, `{"name":null}`, `400`, a JSON array. (If the port differs, use the one Vite prints.) Do not POST test RSVPs to the real sheet in this task; Task 11 does one clearly marked test row and removes it.

- [ ] **Step 11: Run the suite and commit**

Run: `npm test`
Expected: all pass.

```bash
git add -A
git commit -m "feat: guest lookup and RSVP server API backed by Google Sheets"
```

---

### Task 4: Time utilities (countdown, event date, .ics)

**Files:**
- Create: `src/lib/time.ts`, `src/lib/time.test.ts`, `src/lib/ics.ts`, `src/lib/ics.test.ts`, `src/hooks/useCountdown.ts`

**Interfaces:**
- Consumes: `WeddingEvent` from `src/config/wedding.config.ts`
- Produces:
```ts
export interface Remaining { days: number; hours: number; minutes: number; seconds: number; done: boolean }
export function getRemaining(now: Date, target: Date): Remaining
export function formatEventDate(iso: string): { weekday: string; day: string; monthYear: string; time: string }
export function buildIcs(ev: Pick<WeddingEvent,'id'|'title'|'startsAt'|'venue'|'address'>, now?: Date): string
export function downloadIcs(ev: WeddingEvent): void
export function useCountdown(targetIso: string): Remaining
```

- [ ] **Step 1: Write failing tests** `src/lib/time.test.ts`

```ts
import { formatEventDate, getRemaining } from './time'

const target = new Date('2026-12-19T11:00:00+07:00')

test('counts down to the exact instant', () => {
  const r = getRemaining(new Date('2026-12-17T10:58:55+07:00'), target)
  expect(r).toEqual({ days: 2, hours: 0, minutes: 1, seconds: 5, done: false })
})

test('never goes negative after the event', () => {
  const r = getRemaining(new Date('2027-01-01T00:00:00Z'), target)
  expect(r).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 0, done: true })
})

test('is independent of the viewer time zone (same instant, different offsets)', () => {
  const a = getRemaining(new Date('2026-12-19T03:00:00Z'), target)
  const b = getRemaining(new Date('2026-12-18T22:00:00-05:00'), target)
  expect(a).toEqual(b)
})

test('formats event dates in Vietnamese using Ho Chi Minh time', () => {
  expect(formatEventDate('2026-12-19T11:00:00+07:00')).toEqual({ weekday: 'Thứ Bảy', day: '19', monthYear: '12.2026', time: '11:00' })
  expect(formatEventDate('2026-12-20T11:00:00+07:00').weekday).toBe('Chủ Nhật')
  // 11:00 +07 is still the 19th in HCMC even though it is early morning UTC
  expect(formatEventDate('2026-12-19T04:00:00Z').day).toBe('19')
})
```

`src/lib/ics.test.ts`:
```ts
import { buildIcs } from './ics'

const ev = {
  id: 'vu-quy', title: 'Lễ Vu Quy', startsAt: '2026-12-19T11:00:00+07:00',
  venue: 'Sảnh Amber, Pavilion; Tân Sơn Nhất', address: '202 Hoàng Văn Thụ',
}

test('builds a valid calendar with UTC times and a 3 hour duration', () => {
  const ics = buildIcs(ev, new Date('2026-10-10T00:00:00Z'))
  expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true)
  expect(ics).toContain('DTSTART:20261219T040000Z')
  expect(ics).toContain('DTEND:20261219T070000Z')
  expect(ics).toContain('UID:vu-quy@son-lan-wedding')
  expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true)
})

test('escapes commas, semicolons and newlines in text fields', () => {
  const ics = buildIcs(ev)
  expect(ics).toContain('LOCATION:Sảnh Amber\\, Pavilion\\; Tân Sơn Nhất\\, 202 Hoàng Văn Thụ')
})

test('omits the address from LOCATION when there is none', () => {
  const ics = buildIcs({ ...ev, address: undefined, venue: 'Tư gia nhà trai' })
  expect(ics).toContain('LOCATION:Tư gia nhà trai\r\n')
})
```

- [ ] **Step 2: Run to confirm failure**

Run: `npx vitest run src/lib`
Expected: FAIL (`./time`, `./ics` missing).

- [ ] **Step 3: Implement `src/lib/time.ts`**

```ts
export interface Remaining { days: number; hours: number; minutes: number; seconds: number; done: boolean }

export function getRemaining(now: Date, target: Date): Remaining {
  const ms = Math.max(0, target.getTime() - now.getTime())
  return {
    days: Math.floor(ms / 864e5),
    hours: Math.floor(ms / 36e5) % 24,
    minutes: Math.floor(ms / 6e4) % 60,
    seconds: Math.floor(ms / 1e3) % 60,
    done: ms === 0,
  }
}

const TZ = 'Asia/Ho_Chi_Minh'

export function formatEventDate(iso: string) {
  const d = new Date(iso)
  const parts = (opts: Intl.DateTimeFormatOptions) =>
    Object.fromEntries(new Intl.DateTimeFormat('vi-VN', { timeZone: TZ, ...opts }).formatToParts(d).map((p) => [p.type, p.value]))
  const date = parts({ weekday: 'long', day: 'numeric', month: 'numeric', year: 'numeric' })
  const clock = parts({ hour: '2-digit', minute: '2-digit', hour12: false })
  const weekday = String(date.weekday).replace(/(^|\s)\S/g, (m) => m.toUpperCase())
  return {
    weekday,
    day: String(Number(date.day)),
    monthYear: `${String(date.month).padStart(2, '0')}.${date.year}`,
    time: `${clock.hour}:${clock.minute}`,
  }
}
```

- [ ] **Step 4: Implement `src/lib/ics.ts`**

```ts
import type { WeddingEvent } from '../config/wedding.config'

const pad = (n: number) => String(n).padStart(2, '0')
const utc = (d: Date) =>
  `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')

export function buildIcs(
  ev: Pick<WeddingEvent, 'id' | 'title' | 'startsAt' | 'venue' | 'address'>,
  now: Date = new Date(),
): string {
  const start = new Date(ev.startsAt)
  const end = new Date(start.getTime() + 3 * 3600_000)
  const location = ev.address ? `${ev.venue}, ${ev.address}` : ev.venue
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Son Lan Wedding//VI', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${ev.id}@son-lan-wedding`,
    `DTSTAMP:${utc(now)}`,
    `DTSTART:${utc(start)}`,
    `DTEND:${utc(end)}`,
    `SUMMARY:${esc(`${ev.title} Hồng Sơn & Phương Lan`)}`,
    `LOCATION:${esc(location)}`,
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n') + '\r\n'
}

export function downloadIcs(ev: WeddingEvent): void {
  const blob = new Blob([buildIcs(ev)], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${ev.id}.ics`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
```

- [ ] **Step 5: Implement `src/hooks/useCountdown.ts`**

```ts
import { useEffect, useState } from 'react'
import { getRemaining, type Remaining } from '../lib/time'

export function useCountdown(targetIso: string): Remaining {
  const target = new Date(targetIso)
  const [r, setR] = useState(() => getRemaining(new Date(), target))
  useEffect(() => {
    const t = setInterval(() => setR(getRemaining(new Date(), new Date(targetIso))), 1000)
    return () => clearInterval(t)
  }, [targetIso])
  return r
}
```

- [ ] **Step 6: Run tests and commit**

Run: `npx vitest run src/lib`
Expected: all pass.

```bash
git add -A
git commit -m "feat: countdown, Vietnamese event dates and .ics export"
```

---

### Task 5: Image pipeline and `Photo` component

> **Amendment A:** the converter `scripts/optimize-images.mjs`, `src/config/photo-ids.json` and the generated WebP files already exist (built at the user's request before execution; it also supports `--all`, `--quality`, `--src`). Remaining work for this task: switch the default source to `source/asset`, make the non-`--all` run delete WebP files for photos no longer in the list (so unused images are not deployed), convert the audio, then do Steps 3-6 below. Skip Step 1's file creation.

**Files:**
- Create: `scripts/optimize-images.mjs`, `src/lib/photos.ts`, `src/lib/photos.test.ts`, `src/components/Photo.tsx`, `public/img/*` (generated), `src/generated/photos.json` (generated), `public/audio/song.m4a` (generated)

**Interfaces:**
- Consumes: `src/config/photo-ids.json`, `src/config/wedding.config.ts`
- Produces:
```ts
export interface PhotoEntry { w: number; h: number; widths: number[] }
export function getPhoto(id: string): PhotoEntry          // throws Error('Photo <id> missing ...')
export function photoSrcSet(id: string): string           // "/img/<id>-640.webp 640w, ..."
export function Photo(props: { id: string; alt?: string; sizes?: string; eager?: boolean; className?: string; style?: React.CSSProperties }): JSX.Element
```

- [ ] **Step 1: Write `scripts/optimize-images.mjs`**

```js
import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const WIDTHS = [640, 1280, 2000]
const force = process.argv.includes('--force')
const ids = JSON.parse(await fs.readFile('src/config/photo-ids.json', 'utf8'))
const dirs = ['source/asset/fix', 'source/asset/file le fix'] // retouched "fix" versions win
await fs.mkdir('public/img', { recursive: true })
await fs.mkdir('src/generated', { recursive: true })

async function findSource(id) {
  for (const d of dirs) {
    const p = path.join(d, `0B1A${id}.jpg`)
    try { await fs.access(p); return p } catch { /* try next */ }
  }
  throw new Error(`Source photo 0B1A${id}.jpg not found in ${dirs.join(' or ')}`)
}

const manifest = {}
for (const id of ids) {
  const src = await findSource(id)
  const meta = await sharp(src).metadata()
  const swap = (meta.orientation ?? 1) >= 5
  const w = swap ? meta.height : meta.width
  const h = swap ? meta.width : meta.height
  const widths = WIDTHS.filter((x) => x <= w)
  if (widths.length === 0) widths.push(w)
  for (const width of widths) {
    const out = `public/img/${id}-${width}.webp`
    if (!force) { try { await fs.access(out); continue } catch { /* build it */ } }
    await sharp(src).rotate().resize({ width, withoutEnlargement: true }).webp({ quality: 74 }).toFile(out)
  }
  manifest[id] = { w, h, widths }
  console.log('ok', id, `${w}x${h}`, widths.join('/'))
}
await fs.writeFile('src/generated/photos.json', JSON.stringify(manifest, null, 2) + '\n')
console.log(`manifest: ${Object.keys(manifest).length} photos`)
```

- [ ] **Step 2: Generate images and compressed audio**

```bash
npm run photos
mkdir -p public/audio
afconvert -f m4af -d aac -b 96000 source/song.mp3 public/audio/song.m4a
du -sh public/img public/audio/song.m4a
```
Expected: `manifest: 33 photos`; `public/img` roughly 10–25 MB; `song.m4a` under ~3 MB.

- [ ] **Step 3: Write failing tests** `src/lib/photos.test.ts`

```ts
import ids from '../config/photo-ids.json'
import { wedding } from '../config/wedding.config'
import { getPhoto, photoSrcSet } from './photos'

test('throws a clear error for an unknown photo id', () => {
  expect(() => getPhoto('0000')).toThrow(/Photo 0000 missing/)
})

test('builds a srcset from the manifest widths', () => {
  const set = photoSrcSet('6457')
  expect(set).toContain('/img/6457-640.webp 640w')
  expect(set).toContain('/img/6457-1280.webp 1280w')
})

test('every photo used in the config is optimized and listed in photo-ids.json', () => {
  const used = [
    wedding.hero.landscape, wedding.hero.portrait, wedding.invitation.photo, wedding.quote.photo,
    wedding.groom.photo, wedding.bride.photo, wedding.rsvpBackground,
    ...wedding.story.map((s) => s.photo), ...wedding.gallery,
  ]
  for (const id of used) {
    expect(ids).toContain(id)
    expect(() => getPhoto(id)).not.toThrow()
  }
})
```

- [ ] **Step 4: Run to confirm failure**

Run: `npx vitest run src/lib/photos.test.ts`
Expected: FAIL (`./photos` missing).

- [ ] **Step 5: Implement `src/lib/photos.ts` and `src/components/Photo.tsx`**

`src/lib/photos.ts`:
```ts
import manifest from '../generated/photos.json'

export interface PhotoEntry { w: number; h: number; widths: number[] }

export function getPhoto(id: string): PhotoEntry {
  const p = (manifest as Record<string, PhotoEntry>)[id]
  if (!p) throw new Error(`Photo ${id} missing; add it to src/config/photo-ids.json and run npm run photos`)
  return p
}

export function photoSrcSet(id: string): string {
  return getPhoto(id).widths.map((w) => `/img/${id}-${w}.webp ${w}w`).join(', ')
}

export function photoSrc(id: string, width?: number): string {
  const { widths } = getPhoto(id)
  const w = width ? widths.find((x) => x >= width) ?? widths[widths.length - 1] : widths[Math.floor(widths.length / 2)]
  return `/img/${id}-${w}.webp`
}
```

`src/components/Photo.tsx`:
```tsx
import type { CSSProperties } from 'react'
import { getPhoto, photoSrc, photoSrcSet } from '../lib/photos'

interface Props {
  id: string
  alt?: string
  sizes?: string
  eager?: boolean
  className?: string
  style?: CSSProperties
}

export function Photo({ id, alt = '', sizes = '100vw', eager = false, className, style }: Props) {
  const { w, h } = getPhoto(id)
  return (
    <img
      src={photoSrc(id)}
      srcSet={photoSrcSet(id)}
      sizes={sizes}
      width={w}
      height={h}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      className={className}
      style={style}
    />
  )
}
```

- [ ] **Step 6: Run tests and commit**

Run: `npx vitest run src/lib/photos.test.ts`
Expected: pass.

```bash
git add -A
git commit -m "feat: optimized photo pipeline, manifest and Photo component"
```

---

### Task 6: App shell — cover, music, reveal, nav

**Files:**
- Create: `src/hooks/useMusic.ts`, `src/hooks/useMusic.test.tsx`, `src/hooks/useReveal.ts`, `src/hooks/useParallax.ts`, `src/components/Cover.tsx`, `src/components/MusicButton.tsx`, `src/components/Nav.tsx`
- Modify: `src/App.tsx`, `src/App.test.tsx`

**Interfaces:**
- Consumes: `useGuestName()`, `wedding`
- Produces:
```ts
export function useMusic(): { ref: RefObject<HTMLAudioElement>; playing: boolean; play(): Promise<void>; toggle(): Promise<void> }
export function useReveal(): void          // adds .in to .rv elements when visible
export function useParallax(): void        // translates [data-par] children
export function Cover(props: { guestName: string; open: boolean; onOpen(): void }): JSX.Element
export function MusicButton(props: { playing: boolean; onToggle(): void }): JSX.Element
export function Nav(): JSX.Element
```

- [ ] **Step 1: Write failing tests**

`src/hooks/useMusic.test.tsx`:
```tsx
import { act, renderHook } from '@testing-library/react'
import { useMusic } from './useMusic'

function setup() {
  const hook = renderHook(() => useMusic())
  ;(hook.result.current.ref as { current: HTMLAudioElement | null }).current = document.createElement('audio')
  return hook
}

test('play() marks playing when the browser allows it', async () => {
  const { result } = setup()
  await act(async () => { await result.current.play() })
  expect(result.current.playing).toBe(true)
})

test('a blocked play() does not throw and leaves playing false', async () => {
  const { result } = setup()
  vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValueOnce(new DOMException('blocked', 'NotAllowedError'))
  await act(async () => { await result.current.play() })
  expect(result.current.playing).toBe(false)
})

test('toggle flips between playing and paused, even when tapped repeatedly', async () => {
  const { result } = setup()
  await act(async () => { await result.current.toggle() })
  expect(result.current.playing).toBe(true)
  await act(async () => { await result.current.toggle() })
  expect(result.current.playing).toBe(false)
  await act(async () => { await result.current.toggle() })
  expect(result.current.playing).toBe(true)
})
```

`src/App.test.tsx` (replace):
```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from './App'

test('cover greets a free-text guest name and opens the invitation', async () => {
  window.history.replaceState({}, '', '/?to=Anh%20Minh%20%26%20Ch%E1%BB%8B%20Lan')
  render(<App />)
  expect(screen.getByText('Anh Minh & Chị Lan')).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Mở thiệp' }))
  expect(document.body).toHaveClass('open')
  expect(HTMLMediaElement.prototype.play).toHaveBeenCalled()
})

test('a script-looking name is rendered as inert text', () => {
  window.history.replaceState({}, '', '/?to=' + encodeURIComponent('<img src=x onerror=alert(1)>'))
  const { container } = render(<App />)
  expect(container.querySelector('#curtain img')).toBeNull()
  expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument()
})

test('no ?to= falls back to Quý khách', () => {
  render(<App />)
  expect(screen.getByText('Quý khách')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run to confirm failure**

Run: `npx vitest run`
Expected: FAIL (hooks and components missing).

- [ ] **Step 3: Implement hooks**

`src/hooks/useMusic.ts`:
```ts
import { useCallback, useRef, useState } from 'react'

export function useMusic() {
  const ref = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)

  const play = useCallback(async () => {
    const a = ref.current
    if (!a) return
    a.volume = 0.6
    try {
      await a.play()
      setPlaying(true)
    } catch {
      setPlaying(false)
    }
  }, [])

  const toggle = useCallback(async () => {
    const a = ref.current
    if (!a) return
    if (playing) {
      a.pause()
      setPlaying(false)
    } else {
      await play()
    }
  }, [playing, play])

  return { ref, playing, play, toggle }
}
```

`src/hooks/useReveal.ts`:
```ts
import { useEffect } from 'react'

export function useReveal(): void {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('.rv'))
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce || !('IntersectionObserver' in window)) {
      els.forEach((e) => e.classList.add('in'))
      return
    }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target) }
      }),
      { threshold: 0.15 },
    )
    els.forEach((e) => io.observe(e))
    return () => io.disconnect()
  }, [])
}
```

`src/hooks/useParallax.ts`:
```ts
import { useEffect } from 'react'

export function useParallax(): void {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-par]'))
    let raf = 0
    const update = () => {
      raf = 0
      els.forEach((el) => {
        const r = el.parentElement!.getBoundingClientRect()
        el.style.transform = `translate3d(0,${r.top * -0.18}px,0)`
      })
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update) }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => { window.removeEventListener('scroll', onScroll); if (raf) cancelAnimationFrame(raf) }
  }, [])
}
```

- [ ] **Step 4: Implement components**

`src/components/Cover.tsx`:
```tsx
import { useEffect, useState } from 'react'

interface Props { guestName: string; open: boolean; onOpen: () => void }

export function Cover({ guestName, open, onOpen }: Props) {
  const [gone, setGone] = useState(false)
  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => setGone(true), 2000)
    return () => clearTimeout(t)
  }, [open])
  if (gone) return null
  return (
    <div id="curtain" role="dialog" aria-label="Mở thiệp">
      <div className="p l" />
      <div className="p r" />
      <div className="frame" />
      <div className="c">
        <div className="eyebrow">Trân trọng kính mời</div>
        <div className="to" id="guest">{guestName}</div>
        <div className="orn" aria-hidden="true"><i /><b /><i /></div>
        <div className="mono">S <span style={{ fontSize: '.6em' }}>&amp;</span> L</div>
        <div className="eyebrow" style={{ margin: '2px 0 40px' }}>19 — 20 · 12 · 2026</div>
        <button className="seal" onClick={onOpen} aria-label="Mở thiệp" autoFocus>Mở<br />thiệp</button>
      </div>
    </div>
  )
}
```

`src/components/MusicButton.tsx`:
```tsx
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
```

`src/components/Nav.tsx`:
```tsx
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
```

- [ ] **Step 5: Write `src/App.tsx`** (sections are added in Tasks 7–11; each is imported as it is built)

```tsx
import { useEffect, useState } from 'react'
import { wedding } from './config/wedding.config'
import { Cover } from './components/Cover'
import { MusicButton } from './components/MusicButton'
import { Nav } from './components/Nav'
import { useGuestName } from './hooks/useGuestName'
import { useMusic } from './hooks/useMusic'
import { useParallax } from './hooks/useParallax'
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
      <main>{/* sections are mounted here by Tasks 7-11 */}</main>
    </>
  )
}
```

- [ ] **Step 6: Run tests, build, commit**

Run: `npm test && npm run build`
Expected: all pass.

```bash
git add -A
git commit -m "feat: app shell with curtain cover, music control, reveal and nav"
```

---

### Task 7: Hero, marquee, invitation, families

**Files:**
- Create: `src/sections/Hero.tsx`, `src/sections/Marquee.tsx`, `src/sections/Invitation.tsx`, `src/sections/Families.tsx`, `src/sections/Families.test.tsx`
- Modify: `src/App.tsx` (mount in `<main>`)

**Interfaces:**
- Consumes: `wedding`, `Photo`, `photoSrcSet`
- Produces: `Hero`, `Marquee`, `Invitation`, `Families` (no props)

- [ ] **Step 1: Write failing test** `src/sections/Families.test.tsx`

```tsx
import { render, screen } from '@testing-library/react'
import { Families } from './Families'

test('shows both full names and both families', () => {
  render(<Families />)
  expect(screen.getByRole('heading', { name: 'Vũ Hồng Sơn' })).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Thái Thị Phương Lan' })).toBeInTheDocument()
  expect(screen.getByText('Nhà trai')).toBeInTheDocument()
  expect(screen.getByText('Nhà gái')).toBeInTheDocument()
  expect(screen.getByText(/Vũ Thanh Tùng/)).toBeInTheDocument()
  expect(screen.getByText(/Nguyễn Thị Ngân/)).toBeInTheDocument()
  expect(screen.getByText(/Trần Thị Tập/)).toBeInTheDocument()
})
```

- [ ] **Step 2: Run to confirm failure**

Run: `npx vitest run src/sections/Families.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement sections**

`src/sections/Hero.tsx`:
```tsx
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
          <span>19 &amp; 20 . 12 . 2026</span>
          <span>Vu quy 19.12 · Thành hôn 20.12 · 11:00</span>
          <a className="scroll" href="#inv" style={{ textDecoration: 'none' }}><i />Cuộn xuống</a>
        </div>
      </div>
    </header>
  )
}
```

`src/sections/Marquee.tsx`:
```tsx
import { wedding } from '../config/wedding.config'

export function Marquee() {
  const unit = (
    <>
      <span>{wedding.groom.first}</span><b>&amp;</b><span>{wedding.bride.first}</span><b>✦</b>
      <span>19 &amp; 20 · 12 · 2026</span><b>✦</b><span>Chúng mình sắp cưới</span><b>✦</b>
    </>
  )
  return (
    <div className="marq" aria-hidden="true">
      <div>{unit}{unit}{unit}{unit}</div>
    </div>
  )
}
```

`src/sections/Invitation.tsx`:
```tsx
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
```

`src/sections/Families.tsx`:
```tsx
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
```

- [ ] **Step 4: Mount in `src/App.tsx`**

Add imports and replace the `<main>` placeholder:
```tsx
import { Hero } from './sections/Hero'
import { Marquee } from './sections/Marquee'
import { Invitation } from './sections/Invitation'
import { Families } from './sections/Families'
// ...
<main>
  <Hero />
  <Marquee />
  <Invitation />
  <Families />
</main>
```

- [ ] **Step 5: Run tests, build, visual check, commit**

Run: `npm test && npm run build`
Expected: pass.
Then `npm run dev`, open the printed URL with `#`-less path, click "Mở thiệp", and compare the hero, invitation and families section against `reference/prototype.html` at 375px and 1440px widths. Differences in photo crop or spacing must be fixed in the section CSS, not accepted.

```bash
git add -A
git commit -m "feat: hero, marquee, invitation and two-families sections"
```

---

### Task 8: Cinematic quote and story

**Files:**
- Create: `src/sections/Cinematic.tsx`, `src/sections/Story.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `wedding.quote`, `wedding.story`, `Photo`
- Produces: `Cinematic`, `Story`

- [ ] **Step 1: Implement**

`src/sections/Cinematic.tsx`:
```tsx
import { wedding } from '../config/wedding.config'
import { Photo } from '../components/Photo'

export function Cinematic() {
  return (
    <section className="cine">
      <div className="bg" data-par>
        <Photo id={wedding.quote.photo} alt="Hai người giữa đồi thông phủ sương" sizes="100vw" />
      </div>
      <div className="q rv">
        <div className="eyebrow" style={{ color: 'var(--gold-l)', marginBottom: 20 }}>Đà Lạt · 2026</div>
        <p>“{wedding.quote.text}”</p>
      </div>
    </section>
  )
}
```

`src/sections/Story.tsx`:
```tsx
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
```

- [ ] **Step 2: Mount after `<Families />` in `src/App.tsx`**, then run `npm run build`.

Expected: succeeds. In the browser, confirm the cinematic section's photo moves slower than the page when scrolling, and that story rows alternate sides at ≥ 900px.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: cinematic quote and story sections"
```

---

### Task 9: Events

**Files:**
- Create: `src/sections/Events.tsx`, `src/sections/Events.test.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `wedding.events`, `useCountdown`, `formatEventDate`, `downloadIcs`
- Produces: `Events`

- [ ] **Step 1: Write failing test** `src/sections/Events.test.tsx`

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Events } from './Events'
import * as ics from '../lib/ics'

test('shows both events with their dates and times', () => {
  render(<Events />)
  expect(screen.getByText('Lễ Vu Quy · Nhà gái')).toBeInTheDocument()
  expect(screen.getByText('Lễ Thành Hôn · Nhà trai')).toBeInTheDocument()
  expect(screen.getByText('19')).toBeInTheDocument()
  expect(screen.getByText('20')).toBeInTheDocument()
  expect(screen.getByText(/Sảnh Amber/)).toBeInTheDocument()
  expect(screen.getByText('Tư gia nhà trai')).toBeInTheDocument()
})

test('only the event with an address has a directions link', () => {
  render(<Events />)
  const links = screen.getAllByRole('link', { name: 'Chỉ đường' })
  expect(links).toHaveLength(1)
  expect(links[0]).toHaveAttribute('href', expect.stringContaining('google.com/maps/search'))
  expect(links[0]).toHaveAttribute('rel', expect.stringContaining('noopener'))
})

test('each event has its own add-to-calendar button', async () => {
  const spy = vi.spyOn(ics, 'downloadIcs').mockImplementation(() => {})
  render(<Events />)
  const buttons = screen.getAllByRole('button', { name: 'Thêm vào lịch' })
  expect(buttons).toHaveLength(2)
  await userEvent.click(buttons[1])
  expect(spy).toHaveBeenCalledWith(expect.objectContaining({ id: 'thanh-hon' }))
})

test('countdown renders four non-negative numeric cells', () => {
  render(<Events />)
  const nums = Array.from(document.querySelectorAll('#cd strong')).map((n) => Number(n.textContent))
  expect(nums).toHaveLength(4)
  nums.forEach((n) => expect(n).toBeGreaterThanOrEqual(0))
})
```

- [ ] **Step 2: Run to confirm failure**

Run: `npx vitest run src/sections/Events.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement `src/sections/Events.tsx`**

```tsx
import { wedding, type WeddingEvent } from '../config/wedding.config'
import { useCountdown } from '../hooks/useCountdown'
import { downloadIcs } from '../lib/ics'
import { formatEventDate } from '../lib/time'

const pad = (n: number) => String(n).padStart(2, '0')

function EventCard({ ev }: { ev: WeddingEvent }) {
  const d = formatEventDate(ev.startsAt)
  return (
    <article>
      <div className="k">{ev.title} · {ev.side}</div>
      <div className="dt">{d.day}<small>{d.weekday} · {d.monthYear}</small></div>
      <div className="v">{d.time} trưa</div>
      <div className="s">
        {ev.venue}
        {ev.address && <><br />{ev.address}</>}
      </div>
      <div className="ctas">
        {ev.mapsQuery && (
          <a className="btn" target="_blank" rel="noopener noreferrer"
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ev.mapsQuery)}`}>Chỉ đường</a>
        )}
        <button className="btn" type="button" onClick={() => downloadIcs(ev)}>Thêm vào lịch</button>
      </div>
    </article>
  )
}

export function Events() {
  const r = useCountdown(wedding.events[0].startsAt)
  return (
    <section className="event" id="event">
      <div className="wrap">
        <div className="eyebrow rv">Lễ cưới</div>
        <h2 className="h2 c rv d1" style={{ marginTop: 14, color: 'var(--bg)' }}>
          <span className="s1">Hai Ngày</span><span className="s2">Trọn Niềm Vui</span>
        </h2>
        <div className="cd rv d2" id="cd" role="timer" aria-label="Đếm ngược đến lễ vu quy">
          <div><strong>{pad(r.days)}</strong><span>Ngày</span></div>
          <div><strong>{pad(r.hours)}</strong><span>Giờ</span></div>
          <div><strong>{pad(r.minutes)}</strong><span>Phút</span></div>
          <div><strong>{pad(r.seconds)}</strong><span>Giây</span></div>
        </div>
        <div className="two rv d2">
          {wedding.events.map((ev) => <EventCard key={ev.id} ev={ev} />)}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Mount after `<Story />`, run tests, commit**

Run: `npm test && npm run build`
Expected: pass. In the browser, tap "Thêm vào lịch" for each event and confirm a `.ics` file downloads and opens with the right date.

```bash
git add -A
git commit -m "feat: two-event section with countdown and calendar export"
```

---

### Task 10: Gallery and lightbox

**Files:**
- Create: `src/sections/Gallery.tsx`, `src/sections/Lightbox.tsx`, `src/sections/Gallery.test.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `wedding.gallery`, `Photo`, `photoSrc`
- Produces:
```ts
export function Gallery(): JSX.Element
export function Lightbox(props: { ids: string[]; index: number; onClose(): void; onChange(i: number): void }): JSX.Element
```

- [ ] **Step 1: Write failing test** `src/sections/Gallery.test.tsx`

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Gallery } from './Gallery'
import { wedding } from '../config/wedding.config'

test('opens the lightbox, navigates with the keyboard and closes with Escape', async () => {
  render(<Gallery />)
  await userEvent.click(screen.getAllByRole('button', { name: /Xem ảnh/ })[0])
  expect(screen.getByRole('dialog')).toBeInTheDocument()
  expect(screen.getByText(`1 / ${wedding.gallery.length}`)).toBeInTheDocument()
  await userEvent.keyboard('{ArrowRight}')
  expect(screen.getByText(`2 / ${wedding.gallery.length}`)).toBeInTheDocument()
  await userEvent.keyboard('{ArrowLeft}{ArrowLeft}')
  expect(screen.getByText(`${wedding.gallery.length} / ${wedding.gallery.length}`)).toBeInTheDocument()
  await userEvent.keyboard('{Escape}')
  expect(screen.queryByRole('dialog')).toBeNull()
})

test('visible buttons also navigate (no gesture-only controls)', async () => {
  render(<Gallery />)
  await userEvent.click(screen.getAllByRole('button', { name: /Xem ảnh/ })[0])
  await userEvent.click(screen.getByRole('button', { name: 'Ảnh sau' }))
  expect(screen.getByText(`2 / ${wedding.gallery.length}`)).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Đóng' }))
  expect(screen.queryByRole('dialog')).toBeNull()
})
```

- [ ] **Step 2: Run to confirm failure**

Run: `npx vitest run src/sections/Gallery.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

`src/sections/Lightbox.tsx`:
```tsx
import { useEffect, useRef } from 'react'
import { getPhoto, photoSrc, photoSrcSet } from '../lib/photos'

interface Props { ids: string[]; index: number; onClose: () => void; onChange: (i: number) => void }

export function Lightbox({ ids, index, onClose, onChange }: Props) {
  const n = ids.length
  const go = (d: number) => onChange((index + d + n) % n)
  const startX = useRef<number | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight') onChange((index + 1) % n)
      else if (e.key === 'ArrowLeft') onChange((index - 1 + n) % n)
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [index, n, onClose, onChange])

  const id = ids[index]
  const { w, h } = getPhoto(id)
  return (
    <div
      className="lb" role="dialog" aria-modal="true" aria-label="Xem ảnh"
      onPointerDown={(e) => { startX.current = e.clientX }}
      onPointerUp={(e) => {
        if (startX.current === null) return
        const dx = e.clientX - startX.current
        startX.current = null
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1)
      }}
    >
      <img src={photoSrc(id, 1280)} srcSet={photoSrcSet(id)} sizes="92vw" width={w} height={h} alt="" />
      <button className="x" onClick={onClose} aria-label="Đóng" autoFocus>✕</button>
      <button className="pv" onClick={() => go(-1)} aria-label="Ảnh trước">‹</button>
      <button className="nx" onClick={() => go(1)} aria-label="Ảnh sau">›</button>
      <div className="ct">{index + 1} / {n}</div>
    </div>
  )
}
```

`src/sections/Gallery.tsx`:
```tsx
import { useRef, useState } from 'react'
import { wedding } from '../config/wedding.config'
import { Photo } from '../components/Photo'
import { getPhoto } from '../lib/photos'
import { Lightbox } from './Lightbox'

export function Gallery() {
  const [open, setOpen] = useState<number | null>(null)
  const strip = useRef<HTMLDivElement>(null)
  const drag = useRef({ down: false, x: 0, left: 0, moved: false })

  const onDown = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse' || !strip.current) return
    drag.current = { down: true, x: e.clientX, left: strip.current.scrollLeft, moved: false }
    strip.current.style.scrollSnapType = 'none'
  }
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d.down || !strip.current) return
    const dx = e.clientX - d.x
    if (Math.abs(dx) > 5) d.moved = true
    strip.current.scrollLeft = d.left - dx
  }
  const onUp = () => {
    drag.current.down = false
    if (strip.current) strip.current.style.scrollSnapType = ''
  }

  return (
    <section className="gal" id="album">
      <div className="head">
        <div className="eyebrow rv">Album</div>
        <h2 className="h2 c rv d1" style={{ marginTop: 14 }}>
          <span className="s1">Khoảnh Khắc</span><span className="s2">Của Chúng Mình</span>
        </h2>
      </div>
      <div className="strip" ref={strip} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={onUp}>
        {wedding.gallery.map((id, i) => {
          const p = getPhoto(id)
          return (
            <figure key={id} className={p.w > p.h ? 'w' : undefined}>
              <button
                type="button" aria-label={`Xem ảnh ${i + 1}`} style={{ width: '100%', height: '100%', border: 0, padding: 0, background: 'none', cursor: 'zoom-in' }}
                onClick={() => { if (!drag.current.moved) setOpen(i) }}
              >
                <Photo id={id} sizes="(min-width:900px) 30vw, 70vw" />
              </button>
            </figure>
          )
        })}
      </div>
      <div className="hint">Kéo ngang để xem thêm</div>
      {open !== null && <Lightbox ids={wedding.gallery} index={open} onClose={() => setOpen(null)} onChange={setOpen} />}
    </section>
  )
}
```

- [ ] **Step 4: Mount after `<Events />`, run tests, build, commit**

Run: `npm test && npm run build`
Expected: pass. Manual: on a 375px viewport, swipe the strip with touch emulation; in the lightbox swipe left/right and confirm image changes.

```bash
git add -A
git commit -m "feat: draggable album strip with accessible lightbox"
```

---

### Task 11: RSVP form, gift, footer

**Files:**
- Modify: `src/lib/rsvp.ts` (add the API client under the validation from Task 3), `src/App.tsx`, `src/styles/form.css`
- Create: `src/lib/rsvp.test.ts`, `src/sections/Rsvp.tsx`, `src/sections/Rsvp.test.tsx`, `src/sections/Gift.tsx`, `src/sections/Footer.tsx`

**Interfaces:**
- Consumes: `RsvpPayload`, `validateRsvp` (Task 3), `useGuestName()` (Task 3), `wedding.rsvpBackground`, `/api/rsvp` and `/api/wishes` (Task 3)
- Produces:
```ts
export interface Wish { name: string; message: string; at: string }
export interface RsvpClient { submit(p: RsvpPayload): Promise<void>; wishes(): Promise<Wish[]> }
export function createApiClient(fetchImpl?: typeof fetch): RsvpClient
export function Rsvp(props: { client?: RsvpClient }): JSX.Element
```

- [ ] **Step 1: Write failing tests**

`src/lib/rsvp.test.ts`:
```ts
import { createApiClient, validateRsvp, type RsvpPayload } from './rsvp'

const ok: RsvpPayload = { name: 'Anh Minh', attending: true, companions: 1, message: 'Chúc mừng!' }

describe('validateRsvp', () => {
  test('accepts a complete payload', () => expect(validateRsvp(ok)).toEqual({}))
  test('requires a name and caps it at 60 characters', () => {
    expect(validateRsvp({ ...ok, name: '   ' }).name).toBeDefined()
    expect(validateRsvp({ ...ok, name: 'a'.repeat(61) }).name).toBeDefined()
  })
  test('companions must be an integer 0-9, only checked when attending', () => {
    expect(validateRsvp({ ...ok, companions: 0 })).toEqual({})
    expect(validateRsvp({ ...ok, companions: 9 })).toEqual({})
    expect(validateRsvp({ ...ok, companions: -1 }).companions).toBeDefined()
    expect(validateRsvp({ ...ok, companions: 10 }).companions).toBeDefined()
    expect(validateRsvp({ ...ok, companions: 1.5 }).companions).toBeDefined()
    expect(validateRsvp({ ...ok, attending: false, companions: 99 })).toEqual({})
  })
  test('message is limited to 500 characters', () => {
    expect(validateRsvp({ ...ok, message: 'x'.repeat(501) }).message).toBeDefined()
    expect(validateRsvp({ ...ok, message: 'x'.repeat(500) })).toEqual({})
  })
})

describe('createApiClient', () => {
  test('POSTs JSON to /api/rsvp', async () => {
    const f = vi.fn().mockResolvedValue({ ok: true })
    await createApiClient(f as unknown as typeof fetch).submit(ok)
    const [url, init] = f.mock.calls[0]
    expect(url).toBe('/api/rsvp')
    expect(init.method).toBe('POST')
    expect(init.headers['Content-Type']).toBe('application/json')
    expect(JSON.parse(init.body)).toEqual(ok)
  })
  test('rejects on a non-OK status so the form can offer a retry', async () => {
    const f = vi.fn().mockResolvedValue({ ok: false, status: 502 })
    await expect(createApiClient(f as unknown as typeof fetch).submit(ok)).rejects.toThrow()
  })
  test('rejects when the network fails', async () => {
    const f = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(createApiClient(f as unknown as typeof fetch).submit(ok)).rejects.toThrow()
  })
  test('wishes() returns the list, or [] on any failure or a non-array reply', async () => {
    const good = vi.fn().mockResolvedValue({ ok: true, json: async () => [{ name: 'A', message: 'B', at: 'C' }] })
    expect(await createApiClient(good as unknown as typeof fetch).wishes()).toEqual([{ name: 'A', message: 'B', at: 'C' }])
    const bad = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ not: 'array' }) })
    expect(await createApiClient(bad as unknown as typeof fetch).wishes()).toEqual([])
    expect(await createApiClient(vi.fn().mockRejectedValue(new Error('x')) as unknown as typeof fetch).wishes()).toEqual([])
  })
})
```

`src/sections/Rsvp.test.tsx`:
```tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Rsvp } from './Rsvp'
import type { RsvpClient } from '../lib/rsvp'

function fakeClient(submit: RsvpClient['submit']): RsvpClient {
  return { submit, wishes: async () => [] }
}

test('companions stepper is hidden when declining and sent as 0', async () => {
  const submit = vi.fn().mockResolvedValue(undefined)
  render(<Rsvp client={fakeClient(submit)} />)
  await userEvent.type(screen.getByLabelText('Họ và tên'), 'Anh Minh')
  const inc = screen.getByRole('button', { name: 'Tăng số người đi cùng' })
  for (let i = 0; i < 4; i++) await userEvent.click(inc)
  expect(screen.getByText('4 người')).toBeInTheDocument()
  await userEvent.click(screen.getByLabelText('Rất tiếc'))
  expect(screen.queryByRole('group', { name: 'Số người đi cùng' })).toBeNull()
  await userEvent.click(screen.getByRole('button', { name: 'Gửi lời chúc' }))
  await waitFor(() => expect(submit).toHaveBeenCalledTimes(1))
  expect(submit.mock.calls[0][0]).toMatchObject({ attending: false, companions: 0 })
})

test('companions defaults to 0 (Chỉ mình tôi), is bounded 0-9 and is sent when attending', async () => {
  const submit = vi.fn().mockResolvedValue(undefined)
  render(<Rsvp client={fakeClient(submit)} />)
  await userEvent.type(screen.getByLabelText('Họ và tên'), 'Anh Minh')
  expect(screen.getByText('Chỉ mình tôi')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Giảm số người đi cùng' })).toBeDisabled()
  const inc = screen.getByRole('button', { name: 'Tăng số người đi cùng' })
  for (let i = 0; i < 12; i++) await userEvent.click(inc)
  expect(screen.getByText('9 người')).toBeInTheDocument()
  expect(inc).toBeDisabled()
  await userEvent.click(screen.getByRole('button', { name: 'Giảm số người đi cùng' }))
  await userEvent.click(screen.getByRole('button', { name: 'Gửi lời chúc' }))
  await waitFor(() => expect(submit).toHaveBeenCalledTimes(1))
  expect(submit.mock.calls[0][0]).toMatchObject({ attending: true, companions: 8, name: 'Anh Minh' })
})

test('a double click submits once', async () => {
  let resolve!: () => void
  const submit = vi.fn(() => new Promise<void>((r) => { resolve = r }))
  render(<Rsvp client={fakeClient(submit)} />)
  await userEvent.type(screen.getByLabelText('Họ và tên'), 'Anh Minh')
  await userEvent.dblClick(screen.getByRole('button', { name: 'Gửi lời chúc' }))
  expect(submit).toHaveBeenCalledTimes(1)
  resolve()
  expect(await screen.findByText(/Cảm ơn bạn/)).toBeInTheDocument()
})

test('a failed send keeps the entered data and offers a retry', async () => {
  const submit = vi.fn().mockRejectedValueOnce(new Error('net')).mockResolvedValueOnce(undefined)
  render(<Rsvp client={fakeClient(submit)} />)
  await userEvent.type(screen.getByLabelText('Họ và tên'), 'Anh Minh')
  await userEvent.type(screen.getByLabelText('Lời chúc'), 'Chúc mừng')
  await userEvent.click(screen.getByRole('button', { name: 'Gửi lời chúc' }))
  expect(await screen.findByRole('alert')).toHaveTextContent(/thử lại/i)
  expect(screen.getByLabelText('Lời chúc')).toHaveValue('Chúc mừng')
  await userEvent.click(screen.getByRole('button', { name: 'Gửi lời chúc' }))
  expect(await screen.findByText(/Cảm ơn bạn/)).toBeInTheDocument()
  expect(submit).toHaveBeenCalledTimes(2)
})

test('shows a validation message next to an empty name and does not send', async () => {
  const submit = vi.fn()
  render(<Rsvp client={fakeClient(submit)} />)
  await userEvent.click(screen.getByRole('button', { name: 'Gửi lời chúc' }))
  expect(await screen.findByText('Vui lòng nhập họ tên.')).toBeInTheDocument()
  expect(submit).not.toHaveBeenCalled()
})

test('a message over 500 characters is rejected with a message near the field', async () => {
  const submit = vi.fn()
  render(<Rsvp client={fakeClient(submit)} />)
  await userEvent.type(screen.getByLabelText('Họ và tên'), 'Anh Minh')
  await userEvent.click(screen.getByLabelText('Lời chúc'))
  await userEvent.paste('x'.repeat(501))
  await userEvent.click(screen.getByRole('button', { name: 'Gửi lời chúc' }))
  expect(await screen.findByText('Lời chúc tối đa 500 ký tự.')).toBeInTheDocument()
  expect(submit).not.toHaveBeenCalled()
})

test('prefills the name from a free-text ?to=', () => {
  window.history.replaceState({}, '', '/?to=Anh%20Minh')
  render(<Rsvp client={fakeClient(vi.fn())} />)
  expect(screen.getByLabelText('Họ và tên')).toHaveValue('Anh Minh')
})

test('renders wishes returned by the client', async () => {
  const client: RsvpClient = { submit: vi.fn(), wishes: async () => [{ name: 'Chị Lan', message: 'Trăm năm hạnh phúc', at: 't' }] }
  render(<Rsvp client={client} />)
  expect(await screen.findByText('Trăm năm hạnh phúc')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run to confirm failure**

Run: `npx vitest run src/lib/rsvp.test.ts src/sections/Rsvp.test.tsx`
Expected: FAIL (`createApiClient`, `Rsvp` missing).

- [ ] **Step 3: Add the API client to `src/lib/rsvp.ts`** (append below `validateRsvp`)

```ts
export interface Wish { name: string; message: string; at: string }
export interface RsvpClient { submit(p: RsvpPayload): Promise<void>; wishes(): Promise<Wish[]> }

export function createApiClient(fetchImpl: typeof fetch = fetch): RsvpClient {
  return {
    async submit(p) {
      const res = await fetchImpl('/api/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(p),
      })
      if (!res.ok) throw new Error(`RSVP failed (${res.status})`)
    },
    async wishes() {
      try {
        const res = await fetchImpl('/api/wishes')
        if (!res.ok) return []
        const data = await res.json()
        return Array.isArray(data) ? data : []
      } catch {
        return []
      }
    },
  }
}
```

- [ ] **Step 4: Implement `src/sections/Rsvp.tsx`**

```tsx
import { useEffect, useMemo, useState } from 'react'
import { wedding } from '../config/wedding.config'
import { Photo } from '../components/Photo'
import { useGuestName } from '../hooks/useGuestName'
import { DEFAULT_GUEST } from '../lib/guests'
import { createApiClient, validateRsvp, type RsvpClient, type Wish } from '../lib/rsvp'

type Status = 'idle' | 'sending' | 'done' | 'error'

export function Rsvp({ client }: { client?: RsvpClient }) {
  const api = useMemo(() => client ?? createApiClient(), [client])
  const { name: guest } = useGuestName()
  const [name, setName] = useState(guest === DEFAULT_GUEST ? '' : guest)
  const [attending, setAttending] = useState(true)
  const [companions, setCompanions] = useState(0)
  const [message, setMessage] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [status, setStatus] = useState<Status>('idle')
  const [wishes, setWishes] = useState<Wish[]>([])

  useEffect(() => { if (guest !== DEFAULT_GUEST) setName((n) => n || guest) }, [guest])
  useEffect(() => { void api.wishes().then(setWishes) }, [api, status])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (status === 'sending') return
    const payload = { name, attending, companions: attending ? companions : 0, message }
    const errs = validateRsvp(payload)
    setErrors(errs)
    if (Object.keys(errs).length) return
    setStatus('sending')
    try {
      await api.submit(payload)
      setStatus('done')
    } catch {
      setStatus('error')
    }
  }

  return (
    <section className="rsvp" id="rsvp">
      <div className="bg"><Photo id={wedding.rsvpBackground} sizes="100vw" style={{ objectPosition: '50% 25%' }} /></div>
      <div className="card rv">
        <div className="eyebrow">RSVP</div>
        <h2 className="h2 c" style={{ fontSize: 'clamp(32px,4vw,50px)', marginTop: 12 }}>
          <span className="s1">Xác Nhận</span><span className="s2">Tham Dự</span>
        </h2>
        {status === 'done' ? (
          <p className="status" role="status">Cảm ơn bạn! Hẹn gặp bạn ngày 19.12 ♡</p>
        ) : (
          <form onSubmit={onSubmit} noValidate>
            <div>
              <label htmlFor="rsvp-name">Họ và tên</label>
              <input id="rsvp-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" aria-invalid={!!errors.name} />
              {errors.name && <div className="err">{errors.name}</div>}
            </div>
            <div className="seg" role="radiogroup" aria-label="Bạn có tham dự không">
              <div>
                <input type="radio" name="att" id="att-yes" checked={attending} onChange={() => setAttending(true)} />
                <label htmlFor="att-yes">Sẽ tham dự</label>
              </div>
              <div>
                <input type="radio" name="att" id="att-no" checked={!attending} onChange={() => setAttending(false)} />
                <label htmlFor="att-no">Rất tiếc</label>
              </div>
            </div>
            {attending && (
              <div>
                <span className="lab" id="rsvp-comp-label">Số người đi cùng</span>
                <div className="step" role="group" aria-labelledby="rsvp-comp-label">
                  <button type="button" aria-label="Giảm số người đi cùng" disabled={companions <= 0}
                    onClick={() => setCompanions((c) => Math.max(0, c - 1))}>&minus;</button>
                  <output aria-live="polite">{companions === 0 ? 'Chỉ mình tôi' : `${companions} người`}</output>
                  <button type="button" aria-label="Tăng số người đi cùng" disabled={companions >= 9}
                    onClick={() => setCompanions((c) => Math.min(9, c + 1))}>+</button>
                </div>
                {errors.companions && <div className="err">{errors.companions}</div>}
              </div>
            )}
            <div>
              <label htmlFor="rsvp-msg">Lời chúc</label>
              <textarea id="rsvp-msg" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Gửi đôi lời chúc đến cô dâu chú rể" />
              {errors.message && <div className="err">{errors.message}</div>}
            </div>
            {status === 'error' && <div className="err" role="alert">Chưa gửi được. Bạn kiểm tra mạng và thử lại nhé, nội dung vẫn được giữ nguyên.</div>}
            <button className="btn solid" type="submit" disabled={status === 'sending'} style={{ justifyContent: 'center' }}>
              {status === 'sending' ? 'Đang gửi…' : 'Gửi lời chúc'}
            </button>
          </form>
        )}
      </div>
      {wishes.length > 0 && (
        <div className="wishes">
          {wishes.slice(0, 6).map((w, i) => (
            <blockquote key={`${w.at}-${i}`}>{w.message}<cite>{w.name}</cite></blockquote>
          ))}
        </div>
      )}
    </section>
  )
}
```

The double-click test relies on the first click turning the button into the disabled "Đang gửi…" state.

- [ ] **Step 5: Append the stepper styles to `src/styles/form.css`**

```css
.lab{display:block;font-size:11px;letter-spacing:.28em;text-transform:uppercase;color:var(--mute);margin-bottom:6px}
.step{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--gold);padding:6px 0}
.step output{font-family:var(--serif);font-size:26px;font-weight:500;color:var(--ink)}
.step button{width:44px;height:44px;border-radius:50%;border:1px solid var(--gold);background:transparent;color:var(--pine);font:300 24px/1 var(--serif);cursor:pointer;transition:background .4s var(--ease),color .4s var(--ease)}
.step button:hover:not(:disabled){background:var(--pine);border-color:var(--pine);color:var(--bg)}
.step button:disabled{opacity:.3;cursor:default}
.btn:disabled{opacity:.6;cursor:progress}
```

- [ ] **Step 6: Implement `Gift.tsx` and `Footer.tsx`**

`src/sections/Gift.tsx`:
```tsx
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
```

`src/sections/Footer.tsx`:
```tsx
export function Footer() {
  return (
    <footer>
      <div className="m">S <span style={{ fontSize: '.6em' }}>&amp;</span> L</div>
      <p>Cảm ơn bạn đã đến, đã yêu thương.</p>
    </footer>
  )
}
```

- [ ] **Step 7: Mount in `src/App.tsx`** after `<Gallery />` in this order: `<Rsvp />`, `<Gift />`, then `<Footer />` after `</main>`.

- [ ] **Step 8: Run tests, build**

Run: `npm test && npm run build`
Expected: all pass.

- [ ] **Step 9: End-to-end check against the real sheet (one clearly marked row)**

With `npm run dev` running, POST one test RSVP and confirm it appears, then tell the user to delete that row (the service account must not delete anything):
```bash
curl -s -X POST http://localhost:5173/api/rsvp -H 'Content-Type: application/json' \
  -d '{"name":"[TEST - xoá dòng này]","attending":true,"companions":1,"message":"=1+1 kiểm tra RAW"}'
curl -s http://localhost:5173/api/wishes | head -c 400
```
Expected: `{"ok":true}`; the wishes list contains the test message; in the sheet the message cell shows the literal text `=1+1 kiểm tra RAW` (not `2`). Record the row in the ledger so the final message tells the user to delete it.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: RSVP form writing to the Responses sheet, gift and footer"
```

---

### Task 12: README and final verification

> **Amendment A:** the planned link generator and slugify are dropped (YAGNI): the sheet already holds each guest's `ID` and a `Link mời` column. Only the README and verification remain.

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write `README.md`**

```markdown
# Thiệp cưới Hồng Sơn & Phương Lan

- `npm run dev` chạy thử (có cả API đọc và ghi Google Sheet), `npm test` kiểm thử, `npm run build` đóng gói (thư mục `dist`).
- Ảnh gốc nằm trong `source/` (không đưa lên web). Sau khi thêm hoặc đổi ảnh: sửa `src/config/photo-ids.json` rồi chạy `npm run photos`.
- Nội dung (tên, giờ, địa điểm, lời mời, ảnh từng phần): `src/config/wedding.config.ts`.
- Khách mời: tab `khách mời` trong Google Sheet (cột `ID`, `Name`). Link mời có dạng `https://ten-mien/<ID>` hoặc `https://ten-mien/?to=<ID>`. Không tìm thấy ID thì hiện "Quý khách".
- RSVP ghi vào tab `Responses` (Tên khách, Tham dự, Số người, Lời nhắn, Thời gian). "Số người" là tổng số người đến (1 + số người đi cùng), 0 nếu không tham dự.
- Bí mật: copy `.env.example` thành `.env.local` và điền `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `GOOGLE_SHEET_ID`. Chia sẻ Sheet cho email tài khoản dịch vụ với quyền chỉnh sửa. Không bao giờ commit `.env.local`.
- Triển khai: Vercel (thư mục `api/` chạy thành hàm serverless; nhập 3 biến môi trường ở trên trong cài đặt dự án). `vercel.json` đã có rewrite để link `/<ID>` vào đúng trang.
```

- [ ] **Step 2: Run the whole suite and a production build**

Run: `npm test && npm run build && du -sh dist && ls dist`
Expected: all tests pass; build succeeds; `dist` has `img/` and `audio/`, no `asset/`, no `song.mp3`, and `grep -r "PRIVATE KEY" dist` finds nothing.

- [ ] **Step 3: Verify in the browser** (`npm run dev`)
1. `/HaHxtn` and `/?to=HaHxtn` show the sheet's name for that ID on the cover; `/` and `/zzz` show "Quý khách"; `/?to=<b>x</b>` shows the literal text.
2. Click "Mở thiệp": doors open, music starts, music button toggles.
3. Widths 375, 768, 1024, 1440: no horizontal scroll (`document.documentElement.scrollWidth === innerWidth`), nav appears only at ≥ 1024 after scrolling.
4. Keyboard only: Tab reaches the cover button, nav, event buttons, gallery items and form fields with a visible focus ring; Esc closes the lightbox.
5. Emulate `prefers-reduced-motion: reduce`: content visible with no animation.
6. Network tab: no image over ~500 KB above the fold at 375px; no request exposes credentials.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "docs: README and final verification"
```

---

## Self-Review

**Amendment A coverage:** the sheet layout, server API, `/<ID>` links and Responses columns were verified against the live sheet before execution.\n\n**Spec coverage:** §1 info → Task 2 config. §2/2b palette, fonts, cinematic effects → Tasks 2, 6, 7, 8. §3 sections: cover/hero/invitation/families (6, 7), story/cinematic (8), events (9), album (10), RSVP/gift/footer (11), music button and reduced motion (6). §3b responsive: CSS carried from prototype, verified Task 12 step 6 and nav Task 6. §4 architecture and image pipeline → Tasks 1, 5 (Tailwind/Framer Motion deviation stated in header). §5 guests → Task 3, mock in Task 2, link tool Task 12. §6 RSVP → Task 11. §7 YAGNI respected. §8 tests: unit (Tasks 3, 4, 11), manual browser (Task 12); Lighthouse scores are not scripted, so Task 12 step 6 checks image weight and a11y manually instead.

**Placeholder scan:** gift bank details intentionally show "Đang cập nhật" per the spec (QR simulated); no TBD steps.

**Type consistency:** `WeddingEvent`, `Person`, `Remaining`, `RsvpClient`, `PhotoEntry` names match across tasks. `photoSrc(id, width?)` is defined in Task 5 and used in `Lightbox` (Task 10). `useGuestName()` returns `{name, slug}` in Task 3 and is consumed that way in Tasks 6 and 11. The `.s1/.s2/.h2.c` heading classes and `.fam`, `.two`, `.cd` styles come from the prototype CSS split in Task 2.

**Known manual risk:** Task 2's CSS split depends on the prototype's `/* ---------- name ---------- */` markers; if a split file name differs from the imports in Step 7, rename the file rather than editing the import list.
