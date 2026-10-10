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
