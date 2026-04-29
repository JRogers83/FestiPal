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
  const [user] = await db.select().from(users).where(eq(users.id, id))
  if (!user) return null
  const userSelections = await db
    .select({ actId: selections.actId })
    .from(selections)
    .where(eq(selections.userId, id))
  return { ...user, selections: userSelections.map(s => s.actId) }
}

export async function updateUser(id: string, data: { nickname?: string; colour?: string }) {
  const [user] = await db
    .update(users)
    .set({ ...data, lastSeen: new Date() })
    .where(eq(users.id, id))
    .returning()
  return user ?? null
}
