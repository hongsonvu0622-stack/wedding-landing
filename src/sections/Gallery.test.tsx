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
