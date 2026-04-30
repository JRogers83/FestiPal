import { db } from '../index'
import { connections, users, selections } from '../schema'
import { eq, inArray, or } from 'drizzle-orm'

export async function getConnectionsForUser(userId: string) {
  const connRows = await db
    .select()
    .from(connections)
    .where(or(eq(connections.userA, userId), eq(connections.userB, userId)))

  if (connRows.length === 0) return []

  const connectedUserIds = connRows.map(c => c.userA === userId ? c.userB : c.userA)

  // Fetch all connected users and their selections in 2 queries instead of 2N
  const [connectedUsers, allSelections] = await Promise.all([
    db.select().from(users).where(inArray(users.id, connectedUserIds)),
    db.select({ userId: selections.userId, actId: selections.actId })
      .from(selections)
      .where(inArray(selections.userId, connectedUserIds)),
  ])

  const userMap = new Map(connectedUsers.map(u => [u.id, u]))
  const selectionMap = new Map<string, string[]>()
  for (const s of allSelections) {
    const list = selectionMap.get(s.userId) ?? []
    list.push(s.actId)
    selectionMap.set(s.userId, list)
  }

  return connRows.map(conn => {
    const connectedUserId = conn.userA === userId ? conn.userB : conn.userA
    return {
      connectionId: conn.id,
      user: userMap.get(connectedUserId)!,
      selections: selectionMap.get(connectedUserId) ?? [],
    }
  })
}

export async function removeConnectionById(connectionId: string) {
  await db.delete(connections).where(eq(connections.id, connectionId))
}

export async function createDirectConnection(userIdA: string, userIdB: string) {
  const [userA, userB] = [userIdA, userIdB].sort() as [string, string]
  await db.insert(connections).values({ userA, userB }).onConflictDoNothing()
}
