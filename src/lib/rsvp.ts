// Khách được nhận ra bằng mã thiệp (id) lấy từ link riêng; Sheet RSVP không lưu tên.
export interface RsvpPayload { id: string; attending: boolean; companions: number; message: string } // companions = số người đi cùng (0-9); tổng = 1 + companions

export function validateRsvp(p: Pick<RsvpPayload, 'attending' | 'companions' | 'message'>): Partial<Record<'companions' | 'message', string>> {
  const e: Partial<Record<'companions' | 'message', string>> = {}
  if (p.attending && (!Number.isInteger(p.companions) || p.companions < 0 || p.companions > 9)) e.companions = 'Số người đi cùng từ 0 đến 9.'
  if (p.message.length > 500) e.message = 'Lời chúc tối đa 500 ký tự.'
  return e
}

export interface Wish { name: string; message: string; at: string }
export interface RsvpClient { submit(p: RsvpPayload): Promise<void>; wishes(): Promise<Wish[]> }

export class RsvpError extends Error {
  constructor(public status: number, public code?: string) {
    super(`RSVP failed (${status})`)
  }
}

export function createApiClient(fetchImpl: typeof fetch = fetch): RsvpClient {
  return {
    async submit(p) {
      const res = await fetchImpl('/api/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: p.id, attending: p.attending, companions: p.companions, message: p.message }),
      })
      if (!res.ok) {
        let code: string | undefined
        try { code = (await res.json())?.code } catch { /* không có nội dung JSON */ }
        throw new RsvpError(res.status, code)
      }
    },
    async wishes() {
      try {
        const res = await fetchImpl('/api/wishes')
        if (!res.ok) return []
        const data = await res.json()
        return Array.isArray(data) ? data : []
      } catch {
        return []
      }
    },
  }
}
