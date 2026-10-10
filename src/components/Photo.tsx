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
