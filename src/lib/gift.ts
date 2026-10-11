// "21357045656" -> "2135 7045 656". Chuỗi không phải số tài khoản (có chữ) được giữ nguyên.
export function formatAccountNumber(raw: string): string {
  const compact = raw.replace(/[\s-]/g, '')
  if (!/^\d+$/.test(compact)) return raw
  if (compact.length <= 8) return compact // số ngắn: chia nhóm trông lạ ("0456 58")
  return compact.replace(/(\d{4})(?=\d)/g, '$1 ')
}

// Chép vào clipboard: dùng API hiện đại nếu có, nếu không (http thường, trình duyệt cũ, bị từ chối quyền) thì dùng execCommand.
export async function copyText(text: string, nav: Navigator = navigator, doc: Document = document): Promise<boolean> {
  try {
    if (nav.clipboard?.writeText) {
      await nav.clipboard.writeText(text)
      return true
    }
  } catch {
    /* thử cách dự phòng */
  }
  const area = doc.createElement('textarea')
  area.value = text
  area.setAttribute('readonly', '')
  area.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none'
  doc.body.appendChild(area)
  try {
    area.select()
    area.setSelectionRange(0, text.length)
    return Boolean(doc.execCommand('copy'))
  } catch {
    return false
  } finally {
    area.remove()
  }
}
