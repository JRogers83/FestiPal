import { describe, it, expect } from 'vitest'
import { USER_COLOURS } from '../colours'

describe('USER_COLOURS', () => {
  it('has exactly 12 entries', () => {
    expect(USER_COLOURS).toHaveLength(12)
  })

  it('every entry has id, hex, and label', () => {
    for (const c of USER_COLOURS) {
      expect(c).toHaveProperty('id')
      expect(c).toHaveProperty('hex')
      expect(c).toHaveProperty('label')
    }
  })

  it('all hex values are valid 6-digit hex colours', () => {
    for (const c of USER_COLOURS) {
      expect(c.hex).toMatch(/^#[0-9a-f]{6}$/)
    }
  })

  it('does not contain red or orange (reserved for brand)', () => {
    const redOrangeIds = USER_COLOURS.filter(c => (c.id as string) === 'red' || (c.id as string) === 'orange')
    expect(redOrangeIds).toHaveLength(0)
  })
})
