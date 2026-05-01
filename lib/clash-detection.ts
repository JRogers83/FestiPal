import { festivalMinutes, festivalAdjustedEndMinutes, formatTime } from './time'
import type { Act, UserWithSelections, ClashPair } from '@/types'

function actsOverlap(a: Act, b: Act): boolean {
  if (a.festivalDayId !== b.festivalDayId) return false
  if (a.stageId === b.stageId) return false

  const aStart = festivalMinutes(a.startTime)
  const aEnd   = festivalAdjustedEndMinutes(a.startTime, a.endTime)
  const bStart = festivalMinutes(b.startTime)
  const bEnd   = festivalAdjustedEndMinutes(b.startTime, b.endTime)

  return aStart < bEnd && aEnd > bStart
}

export function detectClashes(users: UserWithSelections[], acts: Act[]): ClashPair[] {
  const actMap = new Map(acts.map(a => [a.id, a]))
  const clashes: ClashPair[] = []

  for (let i = 0; i < users.length; i++) {
    for (let j = i + 1; j < users.length; j++) {
      const ua = users[i]
      const ub = users[j]

      for (const idA of ua.selections) {
        for (const idB of ub.selections) {
          const actA = actMap.get(idA)
          const actB = actMap.get(idB)
          if (!actA || !actB) continue
          if (actsOverlap(actA, actB)) {
            const overlapStartRaw = festivalMinutes(actA.startTime) > festivalMinutes(actB.startTime)
              ? actA.startTime
              : actB.startTime
            clashes.push({
              personA:      { userId: ua.id, nickname: ua.nickname, colour: ua.colour, act: actA },
              personB:      { userId: ub.id, nickname: ub.nickname, colour: ub.colour, act: actB },
              overlapStart: formatTime(overlapStartRaw),
            })
          }
        }
      }
    }
  }

  return clashes
}
