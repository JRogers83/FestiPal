'use client'

import { useState, useEffect } from 'react'
import { PersonRow } from './PersonRow'
import { useConnections, useRemoveConnection } from '@/lib/hooks/use-connections'
import type { UserWithSelections } from '@/types'

type Props = {
  userId: string
  currentUser: UserWithSelections
  checkedUserIds: Set<string>
  onCheckChange: (userId: string, checked: boolean) => void
}

export function PeoplePanel({ userId, currentUser, checkedUserIds, onCheckChange }: Props) {
  // Default: closed on mobile (<768px), open on desktop
  const [open, setOpen] = useState(false)
  useEffect(() => {
    setOpen(window.innerWidth >= 768)
  }, [])

  const { data: connections = [] } = useConnections(userId)
  const removeConnection = useRemoveConnection(userId)

  return (
    // Outer wrapper — position:relative so the handle can be absolutely placed on the left edge
    <div style={{ position: 'relative', flexShrink: 0, display: 'flex' }}>

      {/* Edge handle — always visible, sticks out to the left of the panel */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={open ? 'Close group panel' : 'Open group panel'}
        style={{
          position: 'absolute',
          left: 0,
          top: '50%',
          transform: 'translateX(-100%) translateY(-50%)',
          zIndex: 20,
          width: 36,
          height: 96,
          borderRadius: '10px 0 0 10px',
          backgroundColor: 'var(--colour-surface)',
          border: '1px solid var(--colour-border)',
          borderRight: 'none',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          gap: 6,
        }}
      >
        <span style={{
          fontSize: 22,
          color: 'var(--colour-primary)',
          lineHeight: 1,
          userSelect: 'none',
        }}>
          {open ? '›' : '‹'}
        </span>
        <span style={{
          fontSize: 13,
          color: 'var(--colour-primary)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          writingMode: 'vertical-rl',
          textOrientation: 'mixed',
          userSelect: 'none',
        }}>
          Group
        </span>
      </button>

      {/* Panel content — slides in/out via width transition */}
      <aside
        style={{
          width: open ? 256 : 0,
          overflow: 'hidden',
          transition: 'width 0.2s ease',
          backgroundColor: 'var(--colour-surface)',
          borderLeft: open ? '1px solid var(--colour-border)' : 'none',
          flexShrink: 0,
        }}
      >
        {/* Inner content has fixed width so it doesn't squish during animation */}
        <div style={{ width: 256 }}>
          <div
            className="px-4 py-3 text-sm font-medium uppercase tracking-wide"
            style={{ color: 'var(--colour-text-muted)', borderBottom: '1px solid var(--colour-border)' }}
          >
            Your Group
          </div>

          <div className="px-4 py-2">
            <PersonRow
              userId={userId}
              nickname={currentUser.nickname}
              colour={currentUser.colour}
              checked={checkedUserIds.has(userId)}
              isCurrentUser={true}
              onCheckChange={checked => onCheckChange(userId, checked)}
            />

            {connections.map(conn => (
              <PersonRow
                key={conn.connectionId}
                userId={conn.user.id}
                nickname={conn.user.nickname}
                colour={conn.user.colour}
                checked={checkedUserIds.has(conn.user.id)}
                isCurrentUser={false}
                onCheckChange={checked => onCheckChange(conn.user.id, checked)}
                onRemove={() => removeConnection.mutate(conn.connectionId)}
              />
            ))}

            {connections.length === 0 && (
              <p className="text-xs py-2" style={{ color: 'var(--colour-text-faint)' }}>
                No friends linked yet. Invite someone!
              </p>
            )}
          </div>
        </div>
      </aside>
    </div>
  )
}
