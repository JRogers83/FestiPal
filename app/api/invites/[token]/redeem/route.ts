import { NextResponse } from 'next/server'
import { redeemInvite } from '@/lib/db/queries/invites'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isValidUUID(s: unknown): s is string {
  return typeof s === 'string' && UUID_RE.test(s)
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params
    if (!isValidUUID(token)) return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
    const { userId } = await request.json()
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })
    if (!isValidUUID(userId)) return NextResponse.json({ error: 'Invalid userId' }, { status: 400 })
    const result = await redeemInvite(token, userId)
    if (!result.success) {
      const statusMap = { not_found: 404, expired: 410, self_invite: 400 } as const
      return NextResponse.json({ error: result.reason }, { status: statusMap[result.reason] })
    }
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Failed to redeem invite' }, { status: 500 })
  }
}
