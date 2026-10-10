import { render, screen } from '@testing-library/react'
import { Families } from './Families'

test('shows both full names and both families', () => {
  render(<Families />)
  expect(screen.getByRole('heading', { name: 'Vũ Hồng Sơn' })).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Thái Thị Phương Lan' })).toBeInTheDocument()
  expect(screen.getByText('Nhà trai')).toBeInTheDocument()
  expect(screen.getByText('Nhà gái')).toBeInTheDocument()
  expect(screen.getByText(/Vũ Thanh Tùng/)).toBeInTheDocument()
  expect(screen.getByText(/Nguyễn Thị Ngân/)).toBeInTheDocument()
  expect(screen.getByText(/Trần Thị Tập/)).toBeInTheDocument()
})
