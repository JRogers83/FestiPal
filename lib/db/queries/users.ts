import { db } from '../index'
import { users, selections } from '../schema'
import { eq } from 'drizzle-orm'

export async function createUser(id: string) {
  const [user] = await db
    .insert(users)
    .values({ id })
    .onConflictDoNothing()
    .returning()
  return user ?? null
}

export async function getUserById(id: string) {
  const [rows, selectionRows] = await Promise.all([
    db.select().from(users).where(eq(users.id, id)),
    db.select({ actId: selections.actId }).from(selections).where(eq(selections.userId, id)),
  ])
  const user = rows[0]
  if (!user) return null
  return { ...user, selections: selectionRows.map(s => s.actId) }
}

export async function updateUser(id: string, data: { nickname?: string; colour?: string }) {
  const [user] = await db
    .update(users)
    .set({ ...data, lastSeen: new Date() })
    .where(eq(users.id, id))
    .returning()
  return user ?? null
}

export async function createUserWithColour(id: string, colour: string) {
  const [user] = await db
    .insert(users)
    .values({ id, colour })
    .onConflictDoNothing()
    .returning()
  return user ?? null
}
