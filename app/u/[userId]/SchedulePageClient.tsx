'use client'

import { useState, useMemo, useCallback } from 'react'
import type { Lineup, UserWithSelections } from '@/types'
import { useUser } from '@/lib/hooks/use-user'
import { useToggleSelection } from '@/lib/hooks/use-selections'
import { useConnections } from '@/lib/hooks/use-connections'
import { detectClashes } from '@/lib/clash-detection'
import { timeToMinutes } from '@/lib/time'
import { Header } from '@/components/Header'
import { DayTabs } from '@/components/DayTabs'
import { ScheduleGrid } from '@/components/schedule/ScheduleGrid'
import { PeoplePanel } from '@/components/people/PeoplePanel'
import { ArtistsList } from '@/components/ArtistsList'

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

  const [view, setView] = useState<'schedule' | 'artists'>('schedule')

  // Track IDs the user has explicitly unchecked. Everyone else (self + all
  // connections) is checked by default, including newly joined members.
  const [uncheckedIds, setUncheckedIds] = useState<Set<string>>(new Set())

  const checkedUserIds = useMemo(() => {
    const all = new Set([userId, ...connections.map(c => c.user.id)])
    uncheckedIds.forEach(id => all.delete(id))
    return all
  }, [userId, connections, uncheckedIds])

  function handleCheckChange(uid: string, checked: boolean) {
    setUncheckedIds(prev => {
      const next = new Set(prev)
      checked ? next.delete(uid) : next.add(uid)
      return next
    })
  }

  const dayActs = useMemo(
    () => lineup.acts.filter(a => a.festivalDayId === activeDay),
    [lineup.acts, activeDay]
  )

  const stageMap = useMemo(
    () => new Map(lineup.stages.map(s => [s.id, s.name])),
    [lineup.stages]
  )

  const planSummary = useMemo(() => {
    const dayLabel = lineup.festivalDays.find(d => d.id === activeDay)?.label ?? activeDay
    const mySelectedDayActs = dayActs
      .filter(a => currentUser.selections.includes(a.id))
      .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))
    return {
      actCount: currentUser.selections.length,
      dayLabel,
      nextActs: mySelectedDayActs.slice(0, 2).map(a => ({
        name:  a.name,
        time:  a.startTime.slice(0, 5),
        stage: stageMap.get(a.stageId) ?? a.stageId,
      })),
    }
  }, [dayActs, currentUser.selections, lineup.festivalDays, activeDay, stageMap])

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

      {/* Tab bar: day tabs + schedule/artists view toggle */}
      <div style={{ display: 'flex', alignItems: 'stretch', borderBottom: '1px solid var(--colour-border)', overflow: 'hidden' }}>
        <DayTabs days={lineup.festivalDays} activeDay={activeDay} userId={userId} />
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', padding: '0 8px', gap: 4, flexShrink: 0 }}>
          <button
            onClick={() => setView('schedule')}
            title="Schedule view"
            style={{
              padding: '4px 10px',
              fontSize: 13,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              backgroundColor: view === 'schedule' ? 'var(--colour-primary)' : 'var(--colour-surface-2)',
              color: view === 'schedule' ? '#fff' : 'var(--colour-text-muted)',
              border: 'none',
              borderRadius: 3,
              cursor: 'pointer',
            }}
          >
            Grid
          </button>
          <button
            onClick={() => setView('artists')}
            title="Artists list"
            style={{
              padding: '4px 10px',
              fontSize: 13,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              backgroundColor: view === 'artists' ? 'var(--colour-primary)' : 'var(--colour-surface-2)',
              color: view === 'artists' ? '#fff' : 'var(--colour-text-muted)',
              border: 'none',
              borderRadius: 3,
              cursor: 'pointer',
            }}
          >
            Artists
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <main
          className="flex-1 overflow-auto"
          style={{ padding: view === 'schedule' ? 8 : 0 }}
        >
          {view === 'schedule' ? (
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
          ) : (
            <ArtistsList
              acts={dayActs}
              allActs={lineup.acts}
              stages={lineup.stages}
              festivalDays={lineup.festivalDays}
              activeDay={activeDay}
              currentUserId={userId}
              currentUserColour={currentUser.colour}
              currentUserSelections={currentUser.selections}
              checkedUsers={allCheckedUsers}
              onToggleSelection={handleToggle}
            />
          )}
        </main>

        <PeoplePanel
          userId={userId}
          currentUser={currentUser}
          checkedUserIds={checkedUserIds}
          onCheckChange={handleCheckChange}
          planSummary={planSummary}
          clashPairCount={clashPairs.length}
        />
      </div>
    </div>
  )
}
