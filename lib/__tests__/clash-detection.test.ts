import { describe, it, expect } from 'vitest'
import { detectClashes } from '../clash-detection'
import type { Act, UserWithSelections } from '@/types'

const makeAct = (overrides: Partial<Act> & { id: string }): Act => ({
  name: 'Test Act',
  stageId: 'main-stage',
  festivalDayId: 'friday',
  date: '2026-06-12',
  startTime: '13:00',
  endTime: '14:00',
  headliner: false,
  ...overrides,
})

const makeUser = (id: string, colour: string, selections: string[]): UserWithSelections => ({
  id,
  nickname: id,
  colour,
  createdAt: '2026-01-01T00:00:00Z',
  lastSeen: '2026-01-01T00:00:00Z',
  selections,
})

describe('detectClashes', () => {
  it('returns empty array when only one user', () => {
    const acts = [makeAct({ id: 'a1', startTime: '13:00', endTime: '14:00' })]
    const users = [makeUser('user-1', 'blue', ['a1'])]
    expect(detectClashes(users, acts)).toHaveLength(0)
  })

  it('returns empty array when users pick same act on same stage', () => {
    const acts = [makeAct({ id: 'a1', stageId: 'main-stage', startTime: '13:00', endTime: '14:00' })]
    const users = [
      makeUser('user-1', 'blue', ['a1']),
      makeUser('user-2', 'green', ['a1']),
    ]
    // Same stage — not a clash
    expect(detectClashes(users, acts)).toHaveLength(0)
  })

  it('detects a clash when acts on different stages overlap in time', () => {
    const acts = [
      makeAct({ id: 'a1', stageId: 'main-stage',   startTime: '13:00', endTime: '14:00' }),
      makeAct({ id: 'a2', stageId: 'second-stage', startTime: '13:30', endTime: '14:30' }),
    ]
    const users = [
      makeUser('user-1', 'blue',  ['a1']),
      makeUser('user-2', 'green', ['a2']),
    ]
    const clashes = detectClashes(users, acts)
    expect(clashes).toHaveLength(1)
    expect(clashes[0].personA.act.id).toBe('a1')
    expect(clashes[0].personB.act.id).toBe('a2')
  })

  it('does not clash when acts on different stages are sequential', () => {
    const acts = [
      makeAct({ id: 'a1', stageId: 'main-stage',   startTime: '13:00', endTime: '14:00' }),
      makeAct({ id: 'a2', stageId: 'second-stage', startTime: '14:00', endTime: '15:00' }),
    ]
    const users = [
      makeUser('user-1', 'blue',  ['a1']),
      makeUser('user-2', 'green', ['a2']),
    ]
    expect(detectClashes(users, acts)).toHaveLength(0)
  })

  it('does not clash when acts are on different festival days', () => {
    const acts = [
      makeAct({ id: 'a1', stageId: 'main-stage',   festivalDayId: 'friday',   startTime: '13:00', endTime: '14:00' }),
      makeAct({ id: 'a2', stageId: 'second-stage', festivalDayId: 'saturday', startTime: '13:30', endTime: '14:30' }),
    ]
    const users = [
      makeUser('user-1', 'blue',  ['a1']),
      makeUser('user-2', 'green', ['a2']),
    ]
    expect(detectClashes(users, acts)).toHaveLength(0)
  })

  it('handles midnight-spanning acts correctly', () => {
    const acts = [
      // 23:30 → 00:30 (spans midnight)
      makeAct({ id: 'a1', stageId: 'main-stage',   startTime: '23:30', endTime: '00:30' }),
      // 23:45 → 00:15 (also spans midnight, overlaps)
      makeAct({ id: 'a2', stageId: 'second-stage', startTime: '23:45', endTime: '00:15' }),
    ]
    const users = [
      makeUser('user-1', 'blue',  ['a1']),
      makeUser('user-2', 'green', ['a2']),
    ]
    expect(detectClashes(users, acts)).toHaveLength(1)
  })

  it('returns clash info with correct user and act details', () => {
    const acts = [
      makeAct({ id: 'a1', name: 'Band A', stageId: 'main-stage',   startTime: '15:00', endTime: '16:00' }),
      makeAct({ id: 'a2', name: 'Band B', stageId: 'second-stage', startTime: '15:30', endTime: '16:30' }),
    ]
    const users = [
      makeUser('alice', '#3b82f6', ['a1']),
      makeUser('bob',   '#22c55e', ['a2']),
    ]
    const [clash] = detectClashes(users, acts)
    expect(clash.personA.userId).toBe('alice')
    expect(clash.personA.colour).toBe('#3b82f6')
    expect(clash.personA.act.name).toBe('Band A')
    expect(clash.personB.userId).toBe('bob')
    expect(clash.personB.act.name).toBe('Band B')
  })
})
