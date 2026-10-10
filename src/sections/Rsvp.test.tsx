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
