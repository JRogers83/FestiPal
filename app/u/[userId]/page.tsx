import { getLineup } from '@/lib/db/queries/lineup'
import { getUserById } from '@/lib/db/queries/users'
import type { UserWithSelections } from '@/types'
import { SchedulePageClient } from './SchedulePageClient'

type Props = {
  params: Promise<{ userId: string }>
  searchParams: Promise<{ day?: string }>
}

export default async function SchedulePage({ params, searchParams }: Props) {
  const { userId } = await params
  const { day } = await searchParams

  const lineup = await getLineup()
  // Default to today's festival day if within festival dates, else first day with acts
  const FESTIVAL_DAYS_BY_DATE: Record<string, string> = {
    '2026-06-12': 'friday',
    '2026-06-13': 'saturday',
    '2026-06-14': 'sunday',
  }
  const todayDate = new Date().toISOString().slice(0, 10)
  const todayFestivalDayId = FESTIVAL_DAYS_BY_DATE[todayDate]
  const daysWithActs = new Set(lineup.acts.map(a => a.festivalDayId))
  const defaultDay = todayFestivalDayId && daysWithActs.has(todayFestivalDayId)
    ? todayFestivalDayId
    : lineup.festivalDays.find(d => daysWithActs.has(d.id))?.id ?? 'friday'
  const activeDay = day ?? defaultDay

  const rawUser = await getUserById(userId)

  // Coerce Drizzle Date timestamps to strings to match UserWithSelections
  const initialUser: UserWithSelections | null = rawUser
    ? {
        id: rawUser.id,
        nickname: rawUser.nickname,
        colour: rawUser.colour,
        createdAt: rawUser.createdAt instanceof Date
          ? rawUser.createdAt.toISOString()
          : String(rawUser.createdAt),
        lastSeen: rawUser.lastSeen instanceof Date
          ? rawUser.lastSeen.toISOString()
          : String(rawUser.lastSeen),
        selections: rawUser.selections,
      }
    : null

  return (
    <SchedulePageClient
      userId={userId}
      initialUser={initialUser}
      lineup={lineup}
      activeDay={activeDay}
    />
  )
}
