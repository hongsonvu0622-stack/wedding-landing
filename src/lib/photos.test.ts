import ids from '../config/photo-ids.json'
import { wedding } from '../config/wedding.config'
import { getPhoto, photoSrcSet } from './photos'

test('throws a clear error for an unknown photo id', () => {
  expect(() => getPhoto('0000')).toThrow(/Photo 0000 missing/)
})

test('builds a srcset from the manifest widths', () => {
  const set = photoSrcSet('6457')
  expect(set).toContain('/img/6457-640.webp 640w')
  expect(set).toContain('/img/6457-1280.webp 1280w')
})

test('every photo used in the config is optimized and listed in photo-ids.json', () => {
  const used = [
    wedding.hero.landscape, wedding.hero.portrait, wedding.invitation.photo, wedding.quote.photo,
    wedding.groom.photo, wedding.bride.photo, wedding.rsvpBackground,
    ...wedding.story.map((s) => s.photo), ...wedding.gallery,
  ]
  for (const id of used) {
    expect(ids).toContain(id)
    expect(() => getPhoto(id)).not.toThrow()
  }
})
