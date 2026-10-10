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
