import { db } from '../index'
import { stages, festivalDays, acts } from '../schema'
import { asc } from 'drizzle-orm'

export async function getLineup() {
  const [stageRows, dayRows, actRows] = await Promise.all([
    db.select().from(stages).orderBy(asc(stages.ordinal)),
    db.select().from(festivalDays).orderBy(asc(festivalDays.ordinal)),
    db.select().from(acts),
  ])
  return { stages: stageRows, festivalDays: dayRows, acts: actRows }
}
