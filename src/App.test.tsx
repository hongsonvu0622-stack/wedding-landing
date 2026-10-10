import { render, screen } from '@testing-library/react'
import { App } from './App'

test('renders the couple names', () => {
  render(<App />)
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Hồng Sơn')
})
