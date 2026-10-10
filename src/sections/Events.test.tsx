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
