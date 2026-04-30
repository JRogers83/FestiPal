'use client'

import { useState, useMemo, useCallback } from 'react'
import type { Lineup, UserWithSelections } from '@/types'
import { useUser } from '@/lib/hooks/use-user'
import { useToggleSelection } from '@/lib/hooks/use-selections'
import { useConnections } from '@/lib/hooks/use-connections'
import { detectClashes } from '@/lib/clash-detection'
import { Header } from '@/components/Header'
import { DayTabs } from '@/components/DayTabs'
import { ScheduleGrid } from '@/components/schedule/ScheduleGrid'
import { ClashBanner } from '@/components/schedule/ClashBanner'
import { PeoplePanel } from '@/components/people/PeoplePanel'

type Props = {
  userId: string
  initialUser: UserWithSelections | null
  lineup: Lineup
  activeDay: string
}

export function SchedulePageClient({ userId, initialUser, lineup, activeDay }: Props) {
  const { data: userData } = useUser(userId)
  const { data: connections = [] } = useConnections(userId)
  const toggleSelection = useToggleSelection(userId)

  const currentUser: UserWithSelections = userData ?? initialUser ?? {
    id: userId,
    nickname: 'Anonymous',
    colour: '#3b82f6',
    createdAt: new Date().toISOString(),
    lastSeen: new Date().toISOString(),
    selections: [],
  }

  const [checkedUserIds, setCheckedUserIds] = useState<Set<string>>(() => new Set([userId]))

  function handleCheckChange(uid: string, checked: boolean) {
    setCheckedUserIds(prev => {
      const next = new Set(prev)
      checked ? next.add(uid) : next.delete(uid)
      return next
    })
  }

  const dayActs = useMemo(
    () => lineup.acts.filter(a => a.festivalDayId === activeDay),
    [lineup.acts, activeDay]
  )

  const checkedConnectedUsers: UserWithSelections[] = useMemo(
    () =>
      connections
        .filter(c => checkedUserIds.has(c.user.id))
        .map(c => ({ ...c.user, selections: c.selections })),
    [connections, checkedUserIds]
  )

  const allCheckedUsers: UserWithSelections[] = useMemo(() => {
    const base = checkedUserIds.has(userId) ? [currentUser] : []
    return [...base, ...checkedConnectedUsers]
  }, [checkedUserIds, userId, currentUser, checkedConnectedUsers])

  const clashPairs = useMemo(
    () => detectClashes(allCheckedUsers, dayActs),
    [allCheckedUsers, dayActs]
  )

  const handleToggle = useCallback((actId: string, isSelected: boolean) => {
    toggleSelection.mutate({ actId, selected: isSelected })
  }, [toggleSelection])

  return (
    <div className="flex flex-col h-screen">
      <Header
        userId={userId}
        nickname={currentUser.nickname}
        colour={currentUser.colour}
      />

      <DayTabs days={lineup.festivalDays} activeDay={activeDay} userId={userId} />

      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-auto p-2">
          <ClashBanner clashPairs={clashPairs} />
          <ScheduleGrid
            acts={dayActs}
            stages={lineup.stages}
            currentUserId={userId}
            currentUserColour={currentUser.colour}
            currentUserSelections={currentUser.selections}
            checkedUsers={allCheckedUsers}
            clashPairs={clashPairs}
            onToggleSelection={handleToggle}
          />
        </main>

        <PeoplePanel
          userId={userId}
          currentUser={currentUser}
          checkedUserIds={checkedUserIds}
          onCheckChange={handleCheckChange}
        />
      </div>
    </div>
  )
}
