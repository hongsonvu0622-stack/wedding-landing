export interface RsvpPayload { name: string; attending: boolean; companions: number; message: string }   // companions = people coming WITH the guest (0-9); total = 1 + companions

export function validateRsvp(p: RsvpPayload): Partial<Record<'name' | 'companions' | 'message', string>> {
  const e: Partial<Record<'name' | 'companions' | 'message', string>> = {}
  const name = p.name.trim()
  if (!name) e.name = 'Vui lòng nhập họ tên.'
  else if (name.length > 60) e.name = 'Họ tên tối đa 60 ký tự.'
  if (p.attending && (!Number.isInteger(p.companions) || p.companions < 0 || p.companions > 9)) e.companions = 'Số người đi cùng từ 0 đến 9.'
  if (p.message.length > 500) e.message = 'Lời chúc tối đa 500 ký tự.'
  return e
}
