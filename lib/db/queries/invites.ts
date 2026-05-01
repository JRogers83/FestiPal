import { db } from '../index'
import { inviteTokens, connections } from '../schema'
import { eq } from 'drizzle-orm'

// Default expiry: one week after Download 2026 festival end
const FESTIVAL_EXPIRY = new Date('2026-06-21T23:59:59Z')

export async function createInvite(createdBy: string) {
  const [invite] = await db
    .insert(inviteTokens)
    .values({ createdBy, expiresAt: FESTIVAL_EXPIRY })
    .returning()
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
  | { success: false; reason: 'not_found' | 'expired' | 'self_invite' }

export async function redeemInvite(token: string, visitorId: string): Promise<RedeemResult> {
  const invite = await getInviteByToken(token)

  if (!invite) return { success: false, reason: 'not_found' }
  if (invite.expiresAt && invite.expiresAt < new Date()) {
    return { success: false, reason: 'expired' }
  }
  if (invite.createdBy === visitorId) return { success: false, reason: 'self_invite' }

  const [userA, userB] = [invite.createdBy, visitorId].sort() as [string, string]
  await db.insert(connections).values({ userA, userB }).onConflictDoNothing()

  return { success: true }
}
