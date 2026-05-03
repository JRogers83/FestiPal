'use client'

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
  const router = useRouter()
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

  const [view, setView] = useState<'schedule' | 'artists'>(() => {
    if (typeof window === 'undefined') return 'schedule'
    const saved = sessionStorage.getItem('festipals-view')
    if (saved === 'schedule' || saved === 'artists') return saved as 'schedule' | 'artists'
    return window.innerWidth < 768 ? 'artists' : 'schedule'
  })

  const [zoneFilter, setZoneFilter] = useState<'arena' | 'district-x' | 'both'>('both')

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

  const displayedStages = useMemo(
    () => zoneFilter === 'both'
      ? lineup.stages
      : lineup.stages.filter(s => s.zone === zoneFilter),
    [lineup.stages, zoneFilter]
  )

  const displayedDayActs = useMemo(
    () => zoneFilter === 'both'
      ? dayActs
      : dayActs.filter(a => {
          const stage = lineup.stages.find(s => s.id === a.stageId)
          return stage?.zone === zoneFilter
        }),
    [dayActs, zoneFilter, lineup.stages]
  )

  const displayedAllActs = useMemo(
    () => zoneFilter === 'both'
      ? lineup.acts
      : lineup.acts.filter(a => {
          const stage = lineup.stages.find(s => s.id === a.stageId)
          return stage?.zone === zoneFilter
        }),
    [lineup.acts, zoneFilter, lineup.stages]
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

  const touchStartX  = useRef(0)
  const touchStartY  = useRef(0)
  const touchInGrid  = useRef(false)
  const mainRef      = useRef<HTMLElement>(null)

  // Reset scroll position and CSS variable when switching days
  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = 0
      mainRef.current.style.setProperty('--scroll-top', '0px')
    }
  }, [activeDay])

  const handleSwipe = useCallback((e: React.TouchEvent) => {
    // Don't change day if the gesture started inside the horizontal grid scroller
    if (touchInGrid.current) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current)
    if (Math.abs(dx) <= 60 || dy > 30) return
    const daysWithActs = lineup.festivalDays.filter(d =>
      lineup.acts.some(a => a.festivalDayId === d.id)
    )
    const idx = daysWithActs.findIndex(d => d.id === activeDay)
    const next = dx < 0 ? daysWithActs[idx + 1] : daysWithActs[idx - 1]
    if (next) router.push(`/u/${userId}?day=${next.id}`)
  }, [activeDay, lineup, userId, router])

  return (
    <div className="flex flex-col h-dvh">
      <Header
        userId={userId}
        nickname={currentUser.nickname}
        colour={currentUser.colour}
      />

      {/* Tab bar — two rows on mobile (<640px), single row on desktop */}
      <div className="tab-bar">

        {/* Row 1: day tabs — full width on mobile, flex-1 on desktop */}
        <div className="tab-bar-days">
          <DayTabs days={lineup.festivalDays} activeDay={activeDay} userId={userId} />
        </div>

        {/* Row 2 on mobile / same row on desktop: zone filter + view toggle */}
        <div className="tab-bar-controls">
          {/* Zone filter */}
          <div style={{ display: 'flex', alignItems: 'center', padding: '0 8px', gap: 4, flex: 1 }}>
            {(['both', 'arena', 'district-x'] as const).map(z => (
              <button
                key={z}
                onClick={() => setZoneFilter(z)}
                style={{
                  flex: 1,
                  padding: '5px 0',
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  backgroundColor: zoneFilter === z ? 'var(--colour-primary)' : 'var(--colour-surface-2)',
                  color: zoneFilter === z ? '#fff' : 'var(--colour-text-muted)',
                  border: 'none',
                  borderRadius: 3,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  textAlign: 'center',
                }}
              >
                {z === 'both' ? 'All' : z === 'arena' ? 'Arena' : 'Dist X'}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div style={{ width: 1, alignSelf: 'stretch', margin: '6px 0', backgroundColor: 'var(--colour-border)' }} />

          {/* View toggle */}
          <div style={{ display: 'flex', alignItems: 'center', padding: '0 8px', gap: 4, flex: 1, justifyContent: 'flex-end' }}>
            {(['schedule', 'artists'] as const).map(v => (
              <button
                key={v}
                onClick={() => { setView(v); sessionStorage.setItem('festipals-view', v) }}
                title={v === 'schedule' ? 'Schedule view' : 'Artists list'}
                style={{
                  flex: 1,
                  padding: '5px 0',
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  backgroundColor: view === v ? 'var(--colour-primary)' : 'var(--colour-surface-2)',
                  color: view === v ? '#fff' : 'var(--colour-text-muted)',
                  border: 'none',
                  borderRadius: 3,
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                {v === 'schedule' ? 'Grid' : 'Artists'}
              </button>
            ))}
          </div>
        </div>

      </div>

      <div className="flex flex-1" style={{ overflow: 'clip' }}>
        <main
          ref={mainRef}
          className="flex-1 overflow-auto"
          style={{ padding: view === 'schedule' ? 8 : 0 }}
          onScroll={e => {
            (e.currentTarget as HTMLElement).style.setProperty(
              '--scroll-top',
              `${(e.currentTarget as HTMLElement).scrollTop}px`
            )
          }}
          onTouchStart={e => {
            touchStartX.current = e.touches[0].clientX
            touchStartY.current = e.touches[0].clientY
            touchInGrid.current = !!(e.target as Element).closest?.('[data-no-swipe-days]')
          }}
          onTouchEnd={handleSwipe}
        >
          {view === 'schedule' ? (
            <ScheduleGrid
              acts={displayedDayActs}
              stages={displayedStages}
              currentUserId={userId}
              currentUserColour={currentUser.colour}
              currentUserSelections={currentUser.selections}
              checkedUsers={allCheckedUsers}
              clashPairs={clashPairs}
              onToggleSelection={handleToggle}
            />
          ) : (
            <ArtistsList
              acts={displayedDayActs}
              allActs={displayedAllActs}
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
