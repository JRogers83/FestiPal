'use client'

import { memo } from 'react'
import type { Act } from '@/types'

type OtherUser = { userId: string; colour: string; nickname: string }

type Props = {
  act: Act
  top: number
  height: number
  isSelected: boolean
  userColour: string
  selectedByOthers: OtherUser[]
  isClashing: boolean
  clashColour: string | undefined
  onToggle: (actId: string, isSelected: boolean) => void
}

export const ActCard = memo(function ActCard({
  act,
  top,
  height,
  isSelected,
  userColour,
  selectedByOthers,
  isClashing,
  clashColour,
  onToggle,
}: Props) {
  const dotsToShow = selectedByOthers.slice(0, 4)
  const overflow   = selectedByOthers.length - 4

  const bgStyle = isSelected
    ? { backgroundColor: userColour }
    : { backgroundColor: 'var(--colour-surface-2)' }

  return (
    <button
      onClick={() => onToggle(act.id, isSelected)}
      style={{
        position: 'absolute',
        top,
        left: 2,
        right: 2,
        height: act.headliner ? Math.max(height, 120) : Math.max(height, 44),
        minHeight: act.headliner ? '120px' : '44px',
        ...bgStyle,
        border: '1px solid var(--colour-border)',
        boxShadow: isClashing && clashColour ? `inset 0 0 0 3px ${clashColour}` : undefined,
        borderRadius: 4,
        padding: '4px 6px',
        textAlign: 'left',
        cursor: 'pointer',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
      aria-pressed={isSelected}
    >
      {isClashing && (
        <span style={{
          position: 'absolute',
          top: 3,
          right: 4,
          fontSize: 9,
          lineHeight: 1,
          opacity: 0.85,
          pointerEvents: 'none',
        }}>⚠</span>
      )}
      <div>
        <p
          className="text-xs font-medium leading-tight"
          style={{ color: isSelected ? '#fff' : 'var(--colour-text)' }}
        >
          {act.headliner ? <strong>{act.name}</strong> : act.name}
        </p>
        <p className="text-xs" style={{ color: isSelected ? 'rgba(255,255,255,0.7)' : 'var(--colour-text-muted)' }}>
          {act.startTime.slice(0, 5)}
        </p>
      </div>

      {selectedByOthers.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {dotsToShow.map(u => (
            <div
              key={u.userId}
              data-testid="user-dot"
              title={u.nickname}
              style={{
                width: 18, height: 18, borderRadius: 10,
                backgroundColor: u.colour,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 9, fontWeight: 700, color: '#fff',
                flexShrink: 0,
              }}
            >
              {u.nickname.charAt(0).toUpperCase()}
            </div>
          ))}
          {overflow > 0 && (
            <span className="text-[11px]" style={{ color: 'var(--colour-text-muted)' }}>
              +{overflow}
            </span>
          )}
        </div>
      )}
    </button>
  )
})
