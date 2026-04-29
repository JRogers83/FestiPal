import { db } from '../index'
import { connections, users, selections } from '../schema'
import { eq, or } from 'drizzle-orm'

export async function getConnectionsForUser(userId: string) {
  const connRows = await db
    .select()
    .from(connections)
    .where(or(eq(connections.userA, userId), eq(connections.userB, userId)))

  return Promise.all(
    connRows.map(async (conn) => {
      const connectedUserId = conn.userA === userId ? conn.userB : conn.userA
      const [user] = await db.select().from(users).where(eq(users.id, connectedUserId))
      const userSelections = await db
        .select({ actId: selections.actId })
        .from(selections)
        .where(eq(selections.userId, connectedUserId))
      return {
        connectionId: conn.id,
        user,
        selections: userSelections.map(s => s.actId),
      }
    })
  )
}

export async function removeConnectionById(connectionId: string) {
  await db.delete(connections).where(eq(connections.id, connectionId))
}
