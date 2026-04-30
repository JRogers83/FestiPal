import { NextResponse } from 'next/server'
import { createDirectConnection } from '@/lib/db/queries/connections'
import { getInviteByToken, markInviteUsed } from '@/lib/db/queries/invites'
import { getUserById } from '@/lib/db/queries/users'

export async function POST(request: Request) {
  try {
    const { userId, targetUserId, token } = await request.json()

    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

    const requester = await getUserById(userId)
    if (!requester) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    let targetId: string
    let targetNickname: string

    if (token) {
      // Connecting via an invite link — look up who created it
      const invite = await getInviteByToken(token)
      if (!invite) {
        return NextResponse.json({ error: 'Invite link not found or already expired.' }, { status: 404 })
      }
      if (invite.usedAt) {
        return NextResponse.json({ error: 'This invite link has already been used.' }, { status: 410 })
      }
      if (invite.createdBy === userId) {
        return NextResponse.json({ error: "You can't connect using your own invite link." }, { status: 400 })
      }
      targetId = invite.createdBy
      await markInviteUsed(token, userId)
    } else if (targetUserId) {
      // Connecting via a schedule link
      if (targetUserId === userId) {
        return NextResponse.json({ error: "You can't connect with yourself." }, { status: 400 })
      }
      const target = await getUserById(targetUserId)
      if (!target) {
        return NextResponse.json({ error: "User not found. Check the link and try again." }, { status: 404 })
      }
      targetId = targetUserId
      targetNickname = target.nickname
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
