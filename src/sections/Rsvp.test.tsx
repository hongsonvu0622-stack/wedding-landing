import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Rsvp } from './Rsvp'
import { RsvpError, type RsvpClient } from '../lib/rsvp'

function fakeClient(submit: RsvpClient['submit'], wishes: RsvpClient['wishes'] = async () => []): RsvpClient {
  return { submit, wishes }
}
const stubGuest = (name = 'Bạn Ánh Nguyệt') =>
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ name }) }))
const send = () => userEvent.click(screen.getByRole('button', { name: 'Gửi lời chúc' }))

beforeEach(() => { window.history.replaceState({}, '', '/4NUV42'); stubGuest() })
afterEach(() => { vi.unstubAllGlobals() })

describe('a guest with a personal link', () => {
  test('sees whom the answer is for and is not asked for a name', async () => {
    render(<Rsvp client={fakeClient(vi.fn())} />)
    expect(await screen.findByText('Bạn Ánh Nguyệt')).toBeInTheDocument()
    expect(screen.queryByLabelText('Họ và tên')).toBeNull()
  })

  test('the answer is sent under the ID from the link, with the companions and the message', async () => {
    const submit = vi.fn().mockResolvedValue(undefined)
    render(<Rsvp client={fakeClient(submit)} />)
    const inc = screen.getByRole('button', { name: 'Tăng số người đi cùng' })
    await userEvent.click(inc); await userEvent.click(inc)
    await userEvent.type(screen.getByLabelText('Lời chúc'), 'Chúc mừng')
    await send()
    await waitFor(() => expect(submit).toHaveBeenCalledTimes(1))
    expect(submit.mock.calls[0][0]).toEqual({ id: '4NUV42', attending: true, companions: 2, message: 'Chúc mừng' })
  })

  test('works with the ?khach= link format used by the guest workbook', async () => {
    window.history.replaceState({}, '', '/?khach=9XMPV8')
    const submit = vi.fn().mockResolvedValue(undefined)
    render(<Rsvp client={fakeClient(submit)} />)
    await send()
    await waitFor(() => expect(submit).toHaveBeenCalled())
    expect(submit.mock.calls[0][0].id).toBe('9XMPV8')
  })

  test('companions is hidden when declining and sent as 0', async () => {
    const submit = vi.fn().mockResolvedValue(undefined)
    render(<Rsvp client={fakeClient(submit)} />)
    const inc = screen.getByRole('button', { name: 'Tăng số người đi cùng' })
    for (let i = 0; i < 4; i++) await userEvent.click(inc)
    expect(screen.getByText('4 người')).toBeInTheDocument()
    await userEvent.click(screen.getByLabelText('Rất tiếc'))
    expect(screen.queryByRole('group', { name: 'Số người đi cùng' })).toBeNull()
    await send()
    await waitFor(() => expect(submit).toHaveBeenCalledTimes(1))
    expect(submit.mock.calls[0][0]).toMatchObject({ attending: false, companions: 0 })
  })

  test('companions defaults to 0 (Chỉ mình tôi) and is bounded 0-9', async () => {
    render(<Rsvp client={fakeClient(vi.fn())} />)
    expect(screen.getByText('Chỉ mình tôi')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Giảm số người đi cùng' })).toBeDisabled()
    const inc = screen.getByRole('button', { name: 'Tăng số người đi cùng' })
    for (let i = 0; i < 12; i++) await userEvent.click(inc)
    expect(screen.getByText('9 người')).toBeInTheDocument()
    expect(inc).toBeDisabled()
  })

  test('a double click submits once', async () => {
    let resolve!: () => void
    const submit = vi.fn(() => new Promise<void>((r) => { resolve = r }))
    render(<Rsvp client={fakeClient(submit)} />)
    await userEvent.dblClick(screen.getByRole('button', { name: 'Gửi lời chúc' }))
    expect(submit).toHaveBeenCalledTimes(1)
    resolve()
    expect(await screen.findByText(/Cảm ơn bạn/)).toBeInTheDocument()
  })

  test('a failed send keeps the typed message and offers a retry', async () => {
    const submit = vi.fn().mockRejectedValueOnce(new RsvpError(502)).mockResolvedValueOnce(undefined)
    render(<Rsvp client={fakeClient(submit)} />)
    await userEvent.type(screen.getByLabelText('Lời chúc'), 'Chúc mừng')
    await send()
    expect(await screen.findByRole('alert')).toHaveTextContent(/thử lại/i)
    expect(screen.getByLabelText('Lời chúc')).toHaveValue('Chúc mừng')
    await send()
    expect(await screen.findByText(/Cảm ơn bạn/)).toBeInTheDocument()
    expect(submit).toHaveBeenCalledTimes(2)
  })

  test('an ID the server does not know gets a specific message (and no pointless retry advice)', async () => {
    render(<Rsvp client={fakeClient(vi.fn().mockRejectedValue(new RsvpError(404, 'unknown_guest')))} />)
    await send()
    expect(await screen.findByRole('alert')).toHaveTextContent(/liên hệ|không có trong danh sách/i)
  })

  test('being rate limited says to wait a few minutes', async () => {
    render(<Rsvp client={fakeClient(vi.fn().mockRejectedValue(new RsvpError(429)))} />)
    await send()
    expect(await screen.findByRole('alert')).toHaveTextContent(/ít phút/i)
  })

  test('a message over 500 characters is rejected with a message near the field', async () => {
    const submit = vi.fn()
    render(<Rsvp client={fakeClient(submit)} />)
    await userEvent.click(screen.getByLabelText('Lời chúc'))
    await userEvent.paste('x'.repeat(501))
    await send()
    expect(await screen.findByText('Lời chúc tối đa 500 ký tự.')).toBeInTheDocument()
    expect(submit).not.toHaveBeenCalled()
  })

  test('renders wishes returned by the client', async () => {
    const client = fakeClient(vi.fn(), async () => [{ name: 'Anh Minh', message: 'Trăm năm hạnh phúc', at: 't' }])
    render(<Rsvp client={client} />)
    expect(await screen.findByText('Trăm năm hạnh phúc')).toBeInTheDocument()
  })
})

describe('a visitor without a personal link', () => {
  beforeEach(() => { window.history.replaceState({}, '', '/') })

  test('is told to use the personal link instead of getting a form that cannot be saved', () => {
    render(<Rsvp client={fakeClient(vi.fn())} />)
    expect(screen.getByText(/đường link riêng/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Gửi lời chúc' })).toBeNull()
    expect(screen.queryByLabelText('Lời chúc')).toBeNull()
  })

  test('a free-text ?to= name is not an identity either', () => {
    window.history.replaceState({}, '', '/?to=Anh%20Minh')
    render(<Rsvp client={fakeClient(vi.fn())} />)
    expect(screen.getByText(/đường link riêng/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Gửi lời chúc' })).toBeNull()
  })

  test('the wishes wall is still shown', async () => {
    const client = fakeClient(vi.fn(), async () => [{ name: 'Anh Minh', message: 'Trăm năm hạnh phúc', at: 't' }])
    render(<Rsvp client={client} />)
    expect(await screen.findByText('Trăm năm hạnh phúc')).toBeInTheDocument()
  })
})
