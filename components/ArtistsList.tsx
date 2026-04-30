'use client'

import { memo, useMemo, useState } from 'react'
import type { Act, FestivalDay, Stage, UserWithSelections } from '@/types'
import { timeToMinutes } from '@/lib/time'

type SortKey = 'time' | 'name' | 'stage'
type DayScope = 'day' | 'all'

type ListItem =
  | { kind: 'header'; day: FestivalDay }
  | { kind: 'act'; act: Act; showDay: boolean }

type Props = {
  acts: Act[]           // active day only
  allActs: Act[]        // all days
  stages: Stage[]
  festivalDays: FestivalDay[]
  activeDay: string
  currentUserId: string
  currentUserColour: string
  currentUserSelections: string[]
  checkedUsers: UserWithSelections[]
  onToggleSelection: (actId: string, isSelected: boolean) => void
}

export const ArtistsList = memo(function ArtistsList({
  acts,
  allActs,
  stages,
  festivalDays,
  currentUserColour,
  currentUserSelections,
  checkedUsers,
  currentUserId,
  onToggleSelection,
}: Props) {
  const [scope, setScope] = useState<DayScope>('day')
  const [sortBy, setSortBy] = useState<SortKey>('time')

  const stageMap = useMemo(() => new Map(stages.map(s => [s.id, s.name])), [stages])
  const dayMap = useMemo(() => new Map(festivalDays.map(d => [d.id, d])), [festivalDays])

  const sourceActs = scope === 'all' ? allActs : acts

  // Build sorted flat list or grouped list
  const listItems = useMemo((): ListItem[] => {
    const sorted = [...sourceActs].sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name)
      if (sortBy === 'stage') {
        const sc = (stageMap.get(a.stageId) ?? '').localeCompare(stageMap.get(b.stageId) ?? '')
        if (sc !== 0) return sc
        // within stage: sort by day ordinal then time
        const da = dayMap.get(a.festivalDayId)?.ordinal ?? 0
        const db = dayMap.get(b.festivalDayId)?.ordinal ?? 0
        if (da !== db) return da - db
        return timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
      }
      // time: if all days, sort by day ordinal first then time
      if (scope === 'all') {
        const da = dayMap.get(a.festivalDayId)?.ordinal ?? 0
        const db = dayMap.get(b.festivalDayId)?.ordinal ?? 0
        if (da !== db) return da - db
      }
      return timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
    })

    // For "all days" sorted by time: insert day headers
    if (scope === 'all' && sortBy === 'time') {
      const items: ListItem[] = []
      let lastDayId: string | null = null
      for (const act of sorted) {
        if (act.festivalDayId !== lastDayId) {
          const day = dayMap.get(act.festivalDayId)
          if (day) items.push({ kind: 'header', day })
          lastDayId = act.festivalDayId
        }
        items.push({ kind: 'act', act, showDay: false })
      }
      return items
    }

    // Otherwise: flat list, show day badge when in "all" mode
    return sorted.map(act => ({ kind: 'act', act, showDay: scope === 'all' }))
  }, [sourceActs, sortBy, scope, stageMap, dayMap])

  const isEmpty = sourceActs.length === 0

  return (
    <div>
      {/* Controls bar */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 8,
        padding: '10px 12px',
        borderBottom: '1px solid var(--colour-border)',
        backgroundColor: 'var(--colour-surface)',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        {/* Day scope toggle */}
        <div style={{ display: 'flex', borderRadius: 4, overflow: 'hidden', border: '1px solid var(--colour-border)' }}>
          {(['day', 'all'] as DayScope[]).map(s => (
            <button
              key={s}
              onClick={() => setScope(s)}
              className="text-xs uppercase tracking-wide px-3 py-1.5"
              style={{
                backgroundColor: scope === s ? 'var(--colour-primary)' : 'transparent',
                color: scope === s ? '#fff' : 'var(--colour-text-muted)',
                border: 'none',
                cursor: 'pointer',
                fontWeight: scope === s ? 600 : 400,
                whiteSpace: 'nowrap',
              }}
            >
              {s === 'day' ? 'This Day' : 'All Days'}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 20, backgroundColor: 'var(--colour-border)' }} />

        {/* Sort controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--colour-text-faint)' }}>
            Sort:
          </span>
          {(['time', 'name', 'stage'] as SortKey[]).map(key => (
            <button
              key={key}
              onClick={() => setSortBy(key)}
              className="text-xs uppercase tracking-wide px-3 py-1"
              style={{
                backgroundColor: sortBy === key ? 'var(--colour-surface-2)' : 'transparent',
                color: sortBy === key ? 'var(--colour-text)' : 'var(--colour-text-muted)',
                borderRadius: 3,
                border: `1px solid ${sortBy === key ? 'var(--colour-border)' : 'transparent'}`,
                cursor: 'pointer',
                fontWeight: sortBy === key ? 600 : 400,
              }}
            >
              {key}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {isEmpty ? (
        <div className="text-center py-20" style={{ color: 'var(--colour-text-muted)' }}>
          No acts announced for this day yet.
        </div>
      ) : (
        <div>
          {listItems.map((item, i) => {
            if (item.kind === 'header') {
              return (
                <div
                  key={`header-${item.day.id}`}
                  className="text-xs uppercase tracking-widest font-medium"
                  style={{
                    padding: '10px 16px 6px',
                    color: 'var(--colour-primary)',
                    backgroundColor: 'var(--colour-surface)',
                    borderBottom: '1px solid var(--colour-border)',
                    position: 'sticky',
                    top: 45,  // below controls bar
                    zIndex: 5,
                  }}
                >
                  {item.day.label}
                </div>
              )
            }

            const { act, showDay } = item
            const isSelected = currentUserSelections.includes(act.id)
            const othersSelected = checkedUsers.filter(
              u => u.id !== currentUserId && u.selections.includes(act.id)
            )

            return (
              <button
                key={act.id}
                onClick={() => onToggleSelection(act.id, isSelected)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  width: '100%',
                  padding: '11px 16px',
                  borderBottom: '1px solid var(--colour-border)',
                  borderLeft: `4px solid ${isSelected ? currentUserColour : 'transparent'}`,
                  backgroundColor: isSelected ? `${currentUserColour}18` : 'transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                  gap: 12,
                }}
                aria-pressed={isSelected}
              >
                {/* Selection circle */}
                <div style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  flexShrink: 0,
                  backgroundColor: isSelected ? currentUserColour : 'transparent',
                  border: `2px solid ${isSelected ? currentUserColour : 'var(--colour-border)'}`,
                  transition: 'background-color 0.1s, border-color 0.1s',
                }} />

                {/* Act info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    className="text-sm truncate"
                    style={{
                      color: isSelected ? currentUserColour : 'var(--colour-text)',
                      fontWeight: act.headliner ? 700 : 400,
                    }}
                  >
                    {act.name}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--colour-text-muted)' }}>
                    {showDay && (
                      <span style={{ color: 'var(--colour-text-faint)', marginRight: 4 }}>
                        {dayMap.get(act.festivalDayId)?.label.split(' ')[0]} ·
                      </span>
                    )}
                    {stageMap.get(act.stageId)} · {act.startTime.slice(0, 5)}–{act.endTime.slice(0, 5)}
                  </div>
                </div>

                {/* Friend colour dots */}
                {othersSelected.length > 0 && (
                  <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                    {othersSelected.slice(0, 4).map(u => (
                      <span
                        key={u.id}
                        title={u.nickname}
                        style={{
                          width: 9,
                          height: 9,
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
      )}
    </div>
  )
})
