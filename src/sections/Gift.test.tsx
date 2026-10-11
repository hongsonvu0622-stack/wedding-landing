import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Gift } from './Gift'
import { wedding } from '../config/wedding.config'

afterEach(() => { vi.restoreAllMocks() })

const acc = wedding.gift.accounts[0]

test('shows the bank, account holder and the account number in readable groups', () => {
  render(<Gift />)
  expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Hộp Mừng Cưới')
  expect(screen.getByText(acc.bank)).toBeInTheDocument()
  expect(screen.getByText(acc.accountName)).toBeInTheDocument()
  expect(screen.getByText('2135 7045 656')).toBeInTheDocument()
})

test('the QR image has a useful alt text and a download link', () => {
  render(<Gift />)
  const img = screen.getByRole('img', { name: /Mã QR.*TPBank/i })
  expect(img).toHaveAttribute('src', acc.qr)
  expect(img).toHaveAttribute('width')
  expect(img).toHaveAttribute('height')
  const link = screen.getByRole('link', { name: /Lưu ảnh QR/i })
  expect(link).toHaveAttribute('href', acc.qr)
  expect(link).toHaveAttribute('download')
})

test('the copy button copies the bare digits and confirms', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
  render(<Gift />)
  await userEvent.click(screen.getByRole('button', { name: /Sao chép số tài khoản/i }))
  expect(writeText).toHaveBeenCalledWith(acc.accountNumber.replace(/\D/g, ''))
  expect(await screen.findByText('Đã sao chép')).toBeInTheDocument()
})

test('the confirmation disappears again after a moment', async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  Object.defineProperty(navigator, 'clipboard', { value: { writeText: vi.fn().mockResolvedValue(undefined) }, configurable: true })
  render(<Gift />)
  await userEvent.click(screen.getByRole('button', { name: /Sao chép số tài khoản/i }))
  expect(await screen.findByText('Đã sao chép')).toBeInTheDocument()
  await act(async () => { await vi.advanceTimersByTimeAsync(3000) })
  expect(screen.queryByText('Đã sao chép')).toBeNull()
  vi.useRealTimers()
})

test('when copying is impossible the guest is told how to copy by hand', async () => {
  Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true })
  Object.assign(document, { execCommand: vi.fn().mockReturnValue(false) })
  render(<Gift />)
  await userEvent.click(screen.getByRole('button', { name: /Sao chép số tài khoản/i }))
  expect(await screen.findByText(/giữ vào số/i)).toBeInTheDocument()
})

test('the section is hidden entirely when no account is configured (no placeholder text)', () => {
  const original = wedding.gift.accounts
  wedding.gift.accounts = []
  const { container } = render(<Gift />)
  expect(container).toBeEmptyDOMElement()
  wedding.gift.accounts = original
})
