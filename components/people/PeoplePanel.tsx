'use client'

import { useState } from 'react'
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
  const [open, setOpen] = useState(true)
  const { data: connections = [] } = useConnections(userId)
  const removeConnection = useRemoveConnection(userId)

  return (
    <aside
      className="w-64 flex-shrink-0 border-l"
      style={{ borderColor: 'var(--colour-border)', backgroundColor: 'var(--colour-surface)' }}
    >
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium uppercase tracking-wide"
        style={{ color: 'var(--colour-text-muted)' }}
        onClick={() => setOpen(o => !o)}
      >
        Your Group
        <span>{open ? '▾' : '▸'}</span>
      </button>

      {open && (
        <div className="px-4 pb-4">
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
      )}
    </aside>
  )
}
