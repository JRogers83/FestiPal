import { config } from 'dotenv'
config({ path: '.env.local' })

import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { festivalDays, stages, acts } from '../lib/db/schema'
import lineup from '../data/lineup-2026.json'

const sql = neon(process.env.DATABASE_URL_UNPOOLED!)
const db = drizzle(sql)

async function seed() {
  console.log('Seeding festival_days...')
  await db
    .insert(festivalDays)
    .values(lineup.festivalDays)
    .onConflictDoUpdate({ target: festivalDays.id, set: { label: festivalDays.label, date: festivalDays.date, ordinal: festivalDays.ordinal } })

  console.log('Seeding stages...')
  await db
    .insert(stages)
    .values(lineup.stages)
    .onConflictDoUpdate({ target: stages.id, set: { name: stages.name, ordinal: stages.ordinal } })

  console.log('Seeding acts...')
  for (const act of lineup.acts) {
    await db
      .insert(acts)
      .values({
        id:            act.id,
        name:          act.name,
        stageId:       act.stageId,
        festivalDayId: act.festivalDayId,
        date:          act.date,
        startTime:     act.startTime,
        endTime:       act.endTime,
        headliner:     act.headliner ?? false,
      })
      .onConflictDoUpdate({
        target: acts.id,
        set: {
          name:          act.name,
          stageId:       act.stageId,
          festivalDayId: act.festivalDayId,
          date:          act.date,
          startTime:     act.startTime,
          endTime:       act.endTime,
          headliner:     act.headliner ?? false,
        },
      })
  }

  console.log(`Done. Seeded ${lineup.festivalDays.length} days, ${lineup.stages.length} stages, ${lineup.acts.length} acts.`)
}

seed().catch(err => {
  console.error(err)
  process.exit(1)
})
