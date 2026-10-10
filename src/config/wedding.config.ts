export interface WeddingEvent {
  id: string
  title: string
  side: string
  startsAt: string
  venue: string
  address?: string
  mapsQuery?: string
}

export interface Person {
  full: string
  first: string
  role: string
  parentsLabel: string
  parents: string[]
  photo: string
}

export const wedding = {
  groom: {
    full: 'Vũ Hồng Sơn', first: 'Hồng Sơn', role: 'Chú rể', parentsLabel: 'Nhà trai',
    parents: ['Ông Vũ Thanh Tùng', 'Bà Nguyễn Thị Ngân'], photo: '6689',
  } satisfies Person,
  bride: {
    full: 'Thái Thị Phương Lan', first: 'Phương Lan', role: 'Cô dâu', parentsLabel: 'Nhà gái',
    parents: ['Bà Trần Thị Tập'], photo: '6397',
  } satisfies Person,
  events: [
    {
      id: 'vu-quy', title: 'Lễ Vu Quy', side: 'Nhà gái', startsAt: '2026-12-19T11:00:00+07:00',
      venue: 'Sảnh Amber · Trung Tâm Hội Nghị & Tiệc Cưới Pavilion Tân Sơn Nhất',
      address: '202 Hoàng Văn Thụ, Phường Đức Nhuận, TP. Hồ Chí Minh',
      mapsQuery: 'Trung Tâm Hội Nghị & Tiệc Cưới Pavilion Tân Sơn Nhất 202 Hoàng Văn Thụ',
    },
    { id: 'thanh-hon', title: 'Lễ Thành Hôn', side: 'Nhà trai', startsAt: '2026-12-20T11:00:00+07:00', venue: 'Tư gia nhà trai' },
  ] satisfies WeddingEvent[],
  hero: { landscape: '6457', portrait: '6485' },
  invitation: {
    photo: '7102',
    lead: 'Giữa bao điều bình dị, chúng mình tìm thấy nhau. Trân trọng kính mời bạn đến chung vui và chứng kiến khoảnh khắc chúng mình nên duyên.',
  },
  quote: { photo: '6784', text: 'Giữa ngàn thông và sương sớm, chúng mình chọn nhau đến cuối đời.' },
  story: [
    { photo: '6548', title: 'Ngày gặp gỡ', text: 'Một cuộc gặp tình cờ, một nụ cười đủ để mọi thứ khác đi.' },
    { photo: '7177', title: 'Những mùa yêu', text: 'Cùng nhau đi qua nắng, qua mưa, qua những ngày bình thường nhất.' },
    { photo: '7879', title: 'Lời hẹn ước', text: 'Và hôm nay, chúng mình muốn bạn là người chứng kiến lời hẹn ấy.' },
  ],
  gallery: [
    '6485','6519','7029','7295','7714','7925','8103','8233','6614','6660','6864','7615',
    '7663','6475','6526','6698','6823','7145','7468','7753','7931','8000','8064','8258',
  ],
  rsvpBackground: '7958',
  gift: { bank: 'Đang cập nhật', accountName: 'Đang cập nhật', accountNumber: 'Đang cập nhật', note: 'Sự hiện diện của bạn là món quà quý nhất với chúng mình.' },
  musicSrc: '/audio/song.m4a',
}
