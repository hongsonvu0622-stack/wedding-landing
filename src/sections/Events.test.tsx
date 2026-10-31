import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { Events } from './Events'
import * as ics from '../lib/ics'

// Fixed clock: 70 days 4 hours before the first event, so countdown cells (70/04/00/00) never collide with the dates 19 and 20.
beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-10-10T00:00:00Z')) })
afterEach(() => { vi.useRealTimers() })

test('shows both events with their dates and times', () => {
  render(<Events />)
  expect(screen.getByText('Lễ Vu Quy · Nhà gái')).toBeInTheDocument()
  expect(screen.getByText('Lễ Thành Hôn · Nhà trai')).toBeInTheDocument()
  expect(screen.getByText('19')).toBeInTheDocument()
  expect(screen.getByText('20')).toBeInTheDocument()
  expect(screen.getByText(/Sảnh Amber/)).toBeInTheDocument()
  expect(screen.getByText('Tư gia nhà trai')).toBeInTheDocument()
})

test('each event has a directions link, preferring the explicit maps URL', () => {
  render(<Events />)
  const links = screen.getAllByRole('link', { name: 'Chỉ đường' })
  expect(links).toHaveLength(2)
  expect(links[0]).toHaveAttribute('href', expect.stringContaining('google.com/maps/search'))
  expect(links[1]).toHaveAttribute('href', 'https://maps.app.goo.gl/L7WrCQHRCs4nhmxz8')
  for (const l of links) expect(l).toHaveAttribute('rel', expect.stringContaining('noopener'))
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
  expect(nums).toEqual([70, 4, 0, 0])
})
