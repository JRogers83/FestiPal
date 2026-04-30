'use client'

import { memo, useMemo, useState } from 'react'
import type { Act, Stage, UserWithSelections, ClashPair } from '@/types'
import { timeToMinutes } from '@/lib/time'

type SortKey = 'time' | 'name' | 'stage'

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

export const ArtistsList = memo(function ArtistsList({
  acts,
  stages,
  currentUserColour,
  currentUserSelections,
  checkedUsers,
  currentUserId,
  onToggleSelection,
}: Props) {
  const [sortBy, setSortBy] = useState<SortKey>('time')

  const stageMap = useMemo(() => new Map(stages.map(s => [s.id, s.name])), [stages])

  const sorted = useMemo(() => {
    return [...acts].sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name)
      if (sortBy === 'stage') {
        const stageCompare = (stageMap.get(a.stageId) ?? '').localeCompare(stageMap.get(b.stageId) ?? '')
        return stageCompare !== 0 ? stageCompare : timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
      }
      return timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
    })
  }, [acts, sortBy, stageMap])

  if (acts.length === 0) {
    return (
      <div className="text-center py-20" style={{ color: 'var(--colour-text-muted)' }}>
        No acts announced for this day yet.
      </div>
    )
  }

  return (
    <div>
      {/* Sort controls */}
      <div style={{ display: 'flex', gap: 6, padding: '10px 12px', borderBottom: '1px solid var(--colour-border)' }}>
        <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--colour-text-faint)', alignSelf: 'center', marginRight: 4 }}>
          Sort:
        </span>
        {(['time', 'name', 'stage'] as SortKey[]).map(key => (
          <button
            key={key}
            onClick={() => setSortBy(key)}
            className="text-xs uppercase tracking-wide px-3 py-1"
            style={{
              backgroundColor: sortBy === key ? 'var(--colour-primary)' : 'var(--colour-surface-2)',
              color: sortBy === key ? '#fff' : 'var(--colour-text-muted)',
              borderRadius: 3,
              border: 'none',
              cursor: 'pointer',
              fontWeight: sortBy === key ? 600 : 400,
            }}
          >
            {key}
          </button>
        ))}
      </div>

      {/* Act rows */}
      <div>
        {sorted.map(act => {
          const isSelected = currentUserSelections.includes(act.id)
          const othersSelected = checkedUsers
            .filter(u => u.id !== currentUserId && u.selections.includes(act.id))

          return (
            <button
              key={act.id}
              onClick={() => onToggleSelection(act.id, isSelected)}
              style={{
                display: 'flex',
                alignItems: 'center',
                width: '100%',
                padding: '10px 16px',
                borderBottom: '1px solid var(--colour-border)',
                borderLeft: `4px solid ${isSelected ? currentUserColour : 'transparent'}`,
                backgroundColor: isSelected ? `${currentUserColour}18` : 'transparent',
                cursor: 'pointer',
                textAlign: 'left',
                gap: 12,
              }}
              aria-pressed={isSelected}
            >
              {/* Selection indicator circle */}
              <div
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  flexShrink: 0,
                  backgroundColor: isSelected ? currentUserColour : 'transparent',
                  border: `2px solid ${isSelected ? currentUserColour : 'var(--colour-border)'}`,
                  transition: 'background-color 0.1s, border-color 0.1s',
                }}
              />

              {/* Act info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  className="text-sm font-medium truncate"
                  style={{
                    color: isSelected ? currentUserColour : 'var(--colour-text)',
                    fontWeight: act.headliner ? 700 : 400,
                  }}
                >
                  {act.name}
                </div>
                <div className="text-xs" style={{ color: 'var(--colour-text-muted)' }}>
                  {stageMap.get(act.stageId)} · {act.startTime.slice(0, 5)}–{act.endTime.slice(0, 5)}
                </div>
              </div>

              {/* Colour dots for friends who picked this act */}
              {othersSelected.length > 0 && (
                <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                  {othersSelected.slice(0, 4).map(u => (
                    <span
                      key={u.id}
                      title={u.nickname}
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: u.colour,
                        display: 'inline-block',
                      }}
                    />
                  ))}
                  {othersSelected.length > 4 && (
                    <span className="text-[11px]" style={{ color: 'var(--colour-text-muted)' }}>
                      +{othersSelected.length - 4}
                    </span>
                  )}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
})
