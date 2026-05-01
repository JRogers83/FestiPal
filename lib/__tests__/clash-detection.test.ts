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
    expect(detectClashes([makeUser('u1', 'blue', ['a1'])], acts)).toHaveLength(0)
  })

  it('returns empty array when users pick same act on same stage', () => {
    const acts = [makeAct({ id: 'a1', stageId: 'main-stage' })]
    const users = [makeUser('u1', 'blue', ['a1']), makeUser('u2', 'green', ['a1'])]
    expect(detectClashes(users, acts)).toHaveLength(0)
  })

  it('detects a clash when acts on different stages overlap', () => {
    const acts = [
      makeAct({ id: 'a1', stageId: 'main-stage',   startTime: '13:00', endTime: '14:00' }),
      makeAct({ id: 'a2', stageId: 'second-stage', startTime: '13:30', endTime: '14:30' }),
    ]
    const users = [makeUser('u1', 'blue', ['a1']), makeUser('u2', 'green', ['a2'])]
    const clashes = detectClashes(users, acts)
    expect(clashes).toHaveLength(1)
    expect(clashes[0].personA.act.id).toBe('a1')
    expect(clashes[0].personB.act.id).toBe('a2')
    expect(clashes[0].overlapStart).toBe('13:30')
  })

  it('overlapStart is the later start time, not the earlier', () => {
    const acts = [
      makeAct({ id: 'a1', stageId: 'main-stage',   startTime: '13:00', endTime: '14:30' }),
      makeAct({ id: 'a2', stageId: 'second-stage', startTime: '13:45', endTime: '14:45' }),
    ]
    const users = [makeUser('u1', 'blue', ['a1']), makeUser('u2', 'green', ['a2'])]
    const [clash] = detectClashes(users, acts)
    expect(clash.overlapStart).toBe('13:45')
  })

  it('does not clash when acts are sequential', () => {
    const acts = [
      makeAct({ id: 'a1', stageId: 'main-stage',   startTime: '13:00', endTime: '14:00' }),
      makeAct({ id: 'a2', stageId: 'second-stage', startTime: '14:00', endTime: '15:00' }),
    ]
    expect(detectClashes(
      [makeUser('u1', 'blue', ['a1']), makeUser('u2', 'green', ['a2'])],
      acts
    )).toHaveLength(0)
  })

  it('does not clash when acts are on different festival days', () => {
    const acts = [
      makeAct({ id: 'a1', stageId: 'main-stage',   festivalDayId: 'friday',   startTime: '13:00', endTime: '14:00' }),
      makeAct({ id: 'a2', stageId: 'second-stage', festivalDayId: 'saturday', startTime: '13:30', endTime: '14:30' }),
    ]
    expect(detectClashes(
      [makeUser('u1', 'blue', ['a1']), makeUser('u2', 'green', ['a2'])],
      acts
    )).toHaveLength(0)
  })

  it('handles midnight-spanning acts', () => {
    const acts = [
      makeAct({ id: 'a1', stageId: 'main-stage',   startTime: '23:30', endTime: '00:30' }),
      makeAct({ id: 'a2', stageId: 'second-stage', startTime: '23:45', endTime: '00:15' }),
    ]
    const clashes = detectClashes(
      [makeUser('u1', 'blue', ['a1']), makeUser('u2', 'green', ['a2'])],
      acts
    )
    expect(clashes).toHaveLength(1)
    expect(clashes[0].overlapStart).toBe('23:45')
  })

  it('confirmed live clash: Creeper vs Pendulum — overlapStart 16:10 not 15:50', () => {
    // Real data from live browser testing (festipals-review-claude-2026-05-01.md)
    const acts = [
      makeAct({ id: 'fri-opus-4', name: 'Creeper',  stageId: 'opus-stage',  startTime: '15:50', endTime: '16:30' }),
      makeAct({ id: 'fri-apex-4', name: 'Pendulum', stageId: 'apex-stage',  startTime: '16:10', endTime: '17:00' }),
    ]
    const users = [
      makeUser('anonymous', '#22c55e', ['fri-opus-4']),
      makeUser('jonathan',  '#3b82f6', ['fri-apex-4']),
    ]
    const [clash] = detectClashes(users, acts)
    expect(clash.overlapStart).toBe('16:10')
    expect(clash.personA.act.name).toBe('Creeper')
    expect(clash.personB.act.name).toBe('Pendulum')
  })
})
