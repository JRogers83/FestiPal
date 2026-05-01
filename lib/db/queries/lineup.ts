import { db } from '../index'
import { stages, festivalDays, acts } from '../schema'
import { asc } from 'drizzle-orm'
import { unstable_cache } from 'next/cache'

const _getLineup = async () => {
  const [stageRows, dayRows, actRows] = await Promise.all([
    db.select().from(stages).orderBy(asc(stages.ordinal)),
    db.select().from(festivalDays).orderBy(asc(festivalDays.ordinal)),
    db.select().from(acts),
  ])
  return { stages: stageRows, festivalDays: dayRows, acts: actRows }
}

export const getLineup = unstable_cache(_getLineup, ['lineup'], { revalidate: 86400 })
