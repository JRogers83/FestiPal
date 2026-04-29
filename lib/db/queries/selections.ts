import { db } from '../index'
import { selections } from '../schema'
import { and, eq } from 'drizzle-orm'

export async function addSelection(userId: string, actId: string) {
  await db
    .insert(selections)
    .values({ userId, actId })
    .onConflictDoNothing()
}

export async function removeSelection(userId: string, actId: string) {
  await db
    .delete(selections)
    .where(and(eq(selections.userId, userId), eq(selections.actId, actId)))
}
