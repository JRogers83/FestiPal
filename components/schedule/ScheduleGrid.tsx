'use client'

import { useMemo } from 'react'
import type { Act, Stage, UserWithSelections, ClashPair } from '@/types'
import { dayBounds, timeToMinutes, adjustedEndMinutes, minutesToPx } from '@/lib/time'
import { ActCard } from './ActCard'
import { TimeAxis } from './TimeAxis'

type Props = {
  acts: Act[]
  stages: Stage[]
  currentUserId: string
  currentUserColour: string
  currentUserSelections: string[]
  checkedUsers: UserWithSelections[]
  clashPairs: ClashPair[]
  onToggleSelection: (actId: string, isSelected: boolean) => void
}

export function ScheduleGrid({
  acts,
  stages,
  currentUserId,
  currentUserColour,
  currentUserSelections,
  checkedUsers,
  clashPairs,
  onToggleSelection,
}: Props) {
  const bounds = useMemo(() => dayBounds(acts), [acts])
  const totalMinutes = bounds.endMinutes - bounds.startMinutes
  const gridHeight = minutesToPx(totalMinutes)

  const timeSlots = useMemo(() => {
    const slots = []
    for (let m = bounds.startMinutes; m <= bounds.endMinutes; m += 30) {
      const absM = m % 1440
      const h = Math.floor(absM / 60)
      const min = absM % 60
      slots.push({
        label: `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`,
        top: minutesToPx(m - bounds.startMinutes),
      })
    }
    return slots
  }, [bounds])

  const actsByStage = useMemo(() => {
    const map = new Map<string, Act[]>(stages.map(s => [s.id, []]))
    for (const act of acts) map.get(act.stageId)?.push(act)
    return map
  }, [acts, stages])

  const clashingActIds = useMemo(() => {
    const set = new Set<string>()
    for (const cp of clashPairs) {
      if (cp.personA.userId === currentUserId) set.add(cp.personA.act.id)
      if (cp.personB.userId === currentUserId) set.add(cp.personB.act.id)
    }
    return set
  }, [clashPairs, currentUserId])

  const clashColourMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const cp of clashPairs) {
      if (cp.personA.userId === currentUserId) map.set(cp.personA.act.id, cp.personB.colour)
      if (cp.personB.userId === currentUserId) map.set(cp.personB.act.id, cp.personA.colour)
    }
    return map
  }, [clashPairs, currentUserId])

  if (acts.length === 0) {
    return (
      <div className="text-center py-20" style={{ color: 'var(--colour-text-muted)' }}>
        No acts found for this day.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-max">
        <TimeAxis timeSlots={timeSlots} gridHeight={gridHeight} />

        {stages.map(stage => (
          <div key={stage.id} className="flex flex-col" style={{ minWidth: 140 }}>
            <div
              className="sticky top-0 z-10 h-10 flex items-center justify-center px-2
                         border-b-2 text-xs font-medium uppercase tracking-wide truncate"
              style={{
                backgroundColor: 'var(--colour-surface)',
                borderBottomColor: 'var(--colour-primary)',
                color: 'var(--colour-text)',
              }}
            >
              {stage.name}
            </div>

            <div className="relative" style={{ height: gridHeight }}>
              {timeSlots
                .filter((_, i) => i % 2 === 0)
                .map(slot => (
                  <div
                    key={`hour-${slot.label}`}
                    className="absolute w-full pointer-events-none"
                    style={{ top: slot.top, borderTop: '1px solid var(--colour-border)' }}
                  />
                ))}
              {timeSlots
                .filter((_, i) => i % 2 !== 0)
                .map(slot => (
                  <div
                    key={`half-${slot.label}`}
                    className="absolute w-full pointer-events-none opacity-40"
                    style={{ top: slot.top, borderTop: '1px dashed var(--colour-border)' }}
                  />
                ))}

              {(actsByStage.get(stage.id) ?? []).map(act => {
                const startMins  = timeToMinutes(act.startTime)
                const endMins    = adjustedEndMinutes(act.startTime, act.endTime)
                const top        = minutesToPx(startMins - bounds.startMinutes)
                const height     = minutesToPx(endMins - startMins)
                const isSelected = currentUserSelections.includes(act.id)
                const selectedByOthers = checkedUsers
                  .filter(u => u.id !== currentUserId && u.selections.includes(act.id))
                  .map(u => ({ userId: u.id, colour: u.colour }))

                return (
                  <ActCard
                    key={act.id}
                    act={act}
                    top={top}
                    height={height}
                    isSelected={isSelected}
                    userColour={currentUserColour}
                    selectedByOthers={selectedByOthers}
                    isClashing={clashingActIds.has(act.id)}
                    clashColour={clashColourMap.get(act.id)}
                    onToggle={onToggleSelection}
                  />
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
