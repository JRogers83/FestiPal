import { db } from '../index'
import { inviteTokens, connections } from '../schema'
import { eq } from 'drizzle-orm'

export async function createInvite(createdBy: string) {
  const [invite] = await db.insert(inviteTokens).values({ createdBy }).returning()
  return invite
}

export async function getInviteByToken(token: string) {
  const [invite] = await db
    .select()
    .from(inviteTokens)
    .where(eq(inviteTokens.token, token))
  return invite ?? null
}

export type RedeemResult =
  | { success: true }
  | { success: false; reason: 'not_found' | 'already_used' | 'self_invite' }

export async function redeemInvite(token: string, visitorId: string): Promise<RedeemResult> {
  const invite = await getInviteByToken(token)

  if (!invite) return { success: false, reason: 'not_found' }
  if (invite.usedAt) return { success: false, reason: 'already_used' }
  if (invite.createdBy === visitorId) return { success: false, reason: 'self_invite' }

  // Normalise user pair so user_a < user_b (DB CHECK constraint requirement)
  const [userA, userB] = [invite.createdBy, visitorId].sort() as [string, string]

  // Insert connection — ON CONFLICT DO NOTHING handles already-connected case
  await db
    .insert(connections)
    .values({ userA, userB })
    .onConflictDoNothing()

  // Mark token used regardless
  await db
    .update(inviteTokens)
    .set({ usedAt: new Date(), usedBy: visitorId })
    .where(eq(inviteTokens.token, token))

  return { success: true }
}
