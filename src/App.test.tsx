import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from './App'

test('cover greets a free-text guest name and opens the invitation', async () => {
  window.history.replaceState({}, '', '/?to=Anh%20Minh%20%26%20Ch%E1%BB%8B%20Lan')
  render(<App />)
  expect(screen.getByText('Anh Minh & Chị Lan')).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Mở thiệp' }))
  expect(document.body).toHaveClass('open')
  expect(HTMLMediaElement.prototype.play).toHaveBeenCalled()
})

test('a script-looking name is rendered as inert text', () => {
  window.history.replaceState({}, '', '/?to=' + encodeURIComponent('<img src=x onerror=alert(1)>'))
  const { container } = render(<App />)
  expect(container.querySelector('#curtain img')).toBeNull()
  expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument()
})

test('no ?to= falls back to Quý khách', () => {
  render(<App />)
  expect(screen.getByText('Quý khách')).toBeInTheDocument()
})

test('while a guest ID is being looked up the cover shows a placeholder, not the wrong "Quý khách"', async () => {
  let resolve!: (v: unknown) => void
  vi.stubGlobal('fetch', vi.fn(() => new Promise((r) => { resolve = r })))
  window.history.replaceState({}, '', '/a-thanh-e78yw')
  render(<App />)
  expect(screen.queryByText('Quý khách')).toBeNull()
  expect(document.getElementById('guest')).toHaveAttribute('aria-busy', 'true')
  resolve({ ok: true, json: async () => ({ name: 'Anh Thành' }) })
  expect(await screen.findByText('Anh Thành')).toBeInTheDocument()
  expect(document.getElementById('guest')).not.toHaveAttribute('aria-busy')
  vi.unstubAllGlobals()
})

test('an unknown ID falls back to Quý khách once the lookup answers', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ name: null }) }))
  window.history.replaceState({}, '', '/khong-co-id')
  render(<App />)
  expect(await screen.findByText('Quý khách')).toBeInTheDocument()
  vi.unstubAllGlobals()
})

test('a failed lookup also falls back to Quý khách (the invitation still opens)', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
  window.history.replaceState({}, '', '/a-thanh-e78yw')
  render(<App />)
  expect(await screen.findByText('Quý khách', undefined, { timeout: 3000 })).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Mở thiệp' }))
  expect(document.body).toHaveClass('open')
  vi.unstubAllGlobals()
})
