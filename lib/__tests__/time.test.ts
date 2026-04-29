import { describe, it, expect } from 'vitest'
import { timeToMinutes, adjustedEndMinutes, dayBounds, minutesToPx, PX_PER_MINUTE } from '../time'

describe('timeToMinutes', () => {
  it('converts "00:00" to 0', () => expect(timeToMinutes('00:00')).toBe(0))
  it('converts "01:00" to 60', () => expect(timeToMinutes('01:00')).toBe(60))
  it('converts "23:30" to 1410', () => expect(timeToMinutes('23:30')).toBe(1410))
  it('converts "12:15" to 735', () => expect(timeToMinutes('12:15')).toBe(735))
})

describe('adjustedEndMinutes', () => {
  it('returns end minutes when act does not span midnight', () => {
    expect(adjustedEndMinutes('21:00', '23:00')).toBe(1380)
  })

  it('adds 1440 when end < start (midnight span)', () => {
    // 23:30 → 00:30 is a 60-minute act spanning midnight
    expect(adjustedEndMinutes('23:30', '00:30')).toBe(30 + 1440)
  })

  it('handles end exactly at midnight (00:00 treated as 1440)', () => {
    // 22:30 → 00:00 — endTime 00:00 = 0 minutes, which is < start 22:30 = 1350
    expect(adjustedEndMinutes('22:30', '00:00')).toBe(1440)
  })
})

describe('dayBounds', () => {
  it('rounds start down to nearest hour and end up to nearest hour', () => {
    const acts = [
      { startTime: '13:15', endTime: '14:00' },
      { startTime: '22:30', endTime: '23:45' },
    ]
    const bounds = dayBounds(acts)
    expect(bounds.startMinutes).toBe(780)  // 13:00
    expect(bounds.endMinutes).toBe(1440)   // 24:00
  })

  it('handles midnight-spanning acts correctly for bounds', () => {
    const acts = [
      { startTime: '12:00', endTime: '13:00' },
      { startTime: '23:30', endTime: '01:00' },  // spans midnight, adjusted end = 1500
    ]
    const bounds = dayBounds(acts)
    expect(bounds.startMinutes).toBe(720)   // 12:00
    expect(bounds.endMinutes).toBe(1500)    // 25:00 (1:00 next day)
  })
})

describe('minutesToPx', () => {
  it('returns 0 for 0 minutes', () => expect(minutesToPx(0)).toBe(0))
  it('returns 120 for 60 minutes (2px per minute)', () => expect(minutesToPx(60)).toBe(120))
  it('uses PX_PER_MINUTE constant', () => expect(PX_PER_MINUTE).toBe(2))
})
