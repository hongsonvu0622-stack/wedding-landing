import { render, screen } from '@testing-library/react'
import { WishWall } from './WishWall'

const w = (n: number) => Array.from({ length: n }, (_, i) => ({ name: `Khách ${i + 1}`, message: `Lời chúc ${i + 1}`, at: `t${i}` }))

test('renders nothing when there are no wishes', () => {
  const { container } = render(<WishWall wishes={[]} />)
  expect(container).toBeEmptyDOMElement()
})

test('with only one or two wishes it stays still and shows each once', () => {
  const { container } = render(<WishWall wishes={w(2)} />)
  expect(screen.getAllByText(/^Lời chúc/)).toHaveLength(2)
  expect(container.querySelector('.wishwall')).toHaveClass('still')
  expect(container.querySelector('.copy')).toBeNull()
})

test('with 3+ wishes the list is duplicated for a seamless loop, the copy hidden from assistive tech', () => {
  const { container } = render(<WishWall wishes={w(5)} />)
  expect(screen.getAllByText('Lời chúc 1')).toHaveLength(2)
  const copy = container.querySelector('.copy')!
  expect(copy).toHaveAttribute('aria-hidden', 'true')
  expect(container.querySelector('.wishwall')).not.toHaveClass('still')
})

test('scroll speed scales with the number of wishes (6s each, at least 20s)', () => {
  const { container, rerender } = render(<WishWall wishes={w(3)} />)
  const dur = () => (container.querySelector('.track') as HTMLElement).style.getPropertyValue('--dur')
  expect(dur()).toBe('20s')
  rerender(<WishWall wishes={w(10)} />)
  expect(dur()).toBe('60s')
})

test('names and messages are rendered as text, never as HTML', () => {
  const { container } = render(<WishWall wishes={[{ name: '<b>x</b>', message: '<img src=x onerror=alert(1)>', at: 't' }]} />)
  expect(container.querySelector('img')).toBeNull()
  expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument()
})
