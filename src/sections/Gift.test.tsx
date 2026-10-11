import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Gift } from './Gift'
import { wedding, type GiftAccount } from '../config/wedding.config'

const original = wedding.gift.accounts
const groom: GiftAccount = original.find((a) => a.side === 'groom')!
const bride: GiftAccount = { side: 'bride', bank: 'Vietcombank', accountName: 'THAI THI PHUONG LAN', accountNumber: '0123456789', qr: '/gift-qr-bride.png' }

// Each test starts with only the groom configured (what the page had before the bride was added).
beforeEach(() => { wedding.gift.accounts = [groom] })
afterEach(() => { wedding.gift.accounts = original; vi.restoreAllMocks() })

const openButton = () => screen.getByRole('button', { name: /Gửi quà mừng/i })

describe('collapsed by default', () => {
  test('only the button is visible: no QR and no account number in the page until it is pressed', () => {
    render(<Gift />)
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Hộp Mừng Cưới')
    expect(openButton()).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('img', { name: /Mã QR/i })).toBeNull()
    expect(screen.queryByText('2135 7045 656')).toBeNull()
    expect(document.body.innerHTML).not.toContain(groom.accountNumber)
  })
})

describe('one account configured', () => {
  test('pressing the button shows that account directly, without asking who the guest is a friend of', async () => {
    render(<Gift />)
    await userEvent.click(openButton())
    expect(openButton()).toHaveAttribute('aria-expanded', 'true')
    expect(screen.queryByRole('radiogroup')).toBeNull()
    expect(screen.getByText('2135 7045 656')).toBeInTheDocument()
    expect(screen.getByText(groom.bank)).toBeInTheDocument()
    expect(screen.getByText(groom.accountName)).toBeInTheDocument()
    const img = screen.getByRole('img', { name: /Mã QR.*TPBank/i })
    expect(img).toHaveAttribute('src', groom.qr)
    expect(screen.getByRole('link', { name: /Lưu ảnh QR/i })).toHaveAttribute('download')
  })

  test('pressing it again closes the panel and removes the account from the page', async () => {
    render(<Gift />)
    await userEvent.click(openButton())
    await userEvent.click(openButton())
    expect(openButton()).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('2135 7045 656')).toBeNull()
  })
})

describe('groom and bride accounts configured', () => {
  beforeEach(() => { wedding.gift.accounts = [groom, bride] })

  test('pressing the button first asks whose friend the guest is, with the names, and shows no QR yet', async () => {
    render(<Gift />)
    await userEvent.click(openButton())
    const group = screen.getByRole('radiogroup', { name: /Bạn là bạn của ai/i })
    expect(within(group).getByLabelText('Bạn chú rể Hồng Sơn')).not.toBeChecked()
    expect(within(group).getByLabelText('Bạn cô dâu Phương Lan')).not.toBeChecked()
    expect(screen.queryByRole('img', { name: /Mã QR/i })).toBeNull()
    expect(screen.queryByText('2135 7045 656')).toBeNull()
    expect(screen.queryByText('0123 4567 89')).toBeNull()
  })

  test('choosing the bride shows only the bride account; switching to the groom swaps it', async () => {
    render(<Gift />)
    await userEvent.click(openButton())
    await userEvent.click(screen.getByLabelText('Bạn cô dâu Phương Lan'))
    expect(screen.getByText('0123 4567 89')).toBeInTheDocument()
    expect(screen.getByText('THAI THI PHUONG LAN')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /Mã QR.*Vietcombank/i })).toHaveAttribute('src', '/gift-qr-bride.png')
    expect(screen.queryByText('2135 7045 656')).toBeNull()

    await userEvent.click(screen.getByLabelText('Bạn chú rể Hồng Sơn'))
    expect(screen.getByText('2135 7045 656')).toBeInTheDocument()
    expect(screen.queryByText('0123 4567 89')).toBeNull()
    expect(screen.getAllByRole('img', { name: /Mã QR/i })).toHaveLength(1)
  })

  test('the options work from the keyboard (real radio inputs)', async () => {
    render(<Gift />)
    await userEvent.click(openButton())
    // the click left the focus on the toggle button, so one Tab reaches the radio group
    await userEvent.tab()
    expect(screen.getByLabelText('Bạn chú rể Hồng Sơn')).toHaveFocus()
    await userEvent.keyboard(' ')
    expect(screen.getByLabelText('Bạn chú rể Hồng Sơn')).toBeChecked()
    const checked = screen.getAllByRole('radio').filter((r) => (r as HTMLInputElement).checked)
    expect(checked).toHaveLength(1)
  })

  test('closing and reopening starts from the question again (nothing stays revealed)', async () => {
    render(<Gift />)
    await userEvent.click(openButton())
    await userEvent.click(screen.getByLabelText('Bạn cô dâu Phương Lan'))
    await userEvent.click(openButton())
    await userEvent.click(openButton())
    expect(screen.queryByText('0123 4567 89')).toBeNull()
    expect(screen.getByLabelText('Bạn cô dâu Phương Lan')).not.toBeChecked()
  })

  test('if only one of the two sides has an account configured, that side is not offered as a dead option', async () => {
    wedding.gift.accounts = [bride]
    render(<Gift />)
    await userEvent.click(openButton())
    expect(screen.queryByRole('radiogroup')).toBeNull()
    expect(screen.getByText('0123 4567 89')).toBeInTheDocument()
  })
})

describe('test-only accounts', () => {
  test('a card flagged testOnly shows a visible "Thử nghiệm" label so it is never mistaken for a real account', async () => {
    wedding.gift.accounts = [{ ...bride, testOnly: true }]
    render(<Gift />)
    await userEvent.click(openButton())
    expect(screen.getByText(/Thử nghiệm/i)).toBeInTheDocument()
  })
  test('a normal account shows no such label', async () => {
    render(<Gift />)
    await userEvent.click(openButton())
    expect(screen.queryByText(/Thử nghiệm/i)).toBeNull()
  })
})

describe('copying', () => {
  test('copies the bare digits of the account that is showing and confirms', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    wedding.gift.accounts = [groom, bride]
    render(<Gift />)
    await userEvent.click(openButton())
    await userEvent.click(screen.getByLabelText('Bạn cô dâu Phương Lan'))
    await userEvent.click(screen.getByRole('button', { name: /Sao chép số tài khoản/i }))
    expect(writeText).toHaveBeenCalledWith('0123456789')
    expect(await screen.findByText('Đã sao chép')).toBeInTheDocument()
  })

  test('the confirmation disappears again after a moment', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: vi.fn().mockResolvedValue(undefined) }, configurable: true })
    render(<Gift />)
    await userEvent.click(openButton())
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
    await userEvent.click(openButton())
    await userEvent.click(screen.getByRole('button', { name: /Sao chép số tài khoản/i }))
    expect(await screen.findByText(/giữ vào số/i)).toBeInTheDocument()
  })
})

test('the whole section is hidden when no account is configured (no placeholder text, no button)', () => {
  wedding.gift.accounts = []
  const { container } = render(<Gift />)
  expect(container).toBeEmptyDOMElement()
})
