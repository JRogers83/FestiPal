import { db } from '../index'
import { stages, festivalDays, acts } from '../schema'
import { asc } from 'drizzle-orm'
import { unstable_cache } from 'next/cache'
import type { Lineup } from '@/types'

const _getLineup = async (): Promise<Lineup> => {
  const [stageRows, dayRows, actRows] = await Promise.all([
    db.select().from(stages).orderBy(asc(stages.ordinal)),
    db.select().from(festivalDays).orderBy(asc(festivalDays.ordinal)),
    db.select().from(acts),
  ])
  return {
    stages: stageRows.map(s => ({
      ...s,
      zone: (s.zone as 'arena' | 'district-x'),
    })),
    festivalDays: dayRows,
    acts: actRows,
  }
}

export const getLineup = unstable_cache(_getLineup, ['lineup'], { revalidate: 86400 })
