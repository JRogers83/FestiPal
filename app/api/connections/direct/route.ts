import { NextResponse } from 'next/server'
import { createDirectConnection } from '@/lib/db/queries/connections'
import { getInviteByToken } from '@/lib/db/queries/invites'
import { getUserById } from '@/lib/db/queries/users'

export async function POST(request: Request) {
  try {
    const { userId, targetUserId, token } = await request.json()
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

    const requester = await getUserById(userId)
    if (!requester) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    let targetId: string

    if (token) {
      const invite = await getInviteByToken(token)
      if (!invite) return NextResponse.json({ error: 'Invite link not found or expired.' }, { status: 404 })
      if (invite.expiresAt && invite.expiresAt < new Date()) {
        return NextResponse.json({ error: 'This invite link has expired.' }, { status: 410 })
      }
      if (invite.createdBy === userId) {
        return NextResponse.json({ error: "You can't connect using your own invite link." }, { status: 400 })
      }
      targetId = invite.createdBy
    } else if (targetUserId) {
      if (targetUserId === userId) {
        return NextResponse.json({ error: "You can't connect with yourself." }, { status: 400 })
      }
      const target = await getUserById(targetUserId)
      if (!target) {
        return NextResponse.json({ error: 'User not found. Check the link and try again.' }, { status: 404 })
      }
      targetId = targetUserId
    } else {
      return NextResponse.json({ error: 'targetUserId or token required' }, { status: 400 })
    }

    await createDirectConnection(userId, targetId)
    const connected = await getUserById(targetId)
    return NextResponse.json({ ok: true, nickname: connected?.nickname ?? 'your friend' })
  } catch {
    return NextResponse.json({ error: 'Failed to connect' }, { status: 500 })
  }
}
