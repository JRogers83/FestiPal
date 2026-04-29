import { NextResponse } from 'next/server'
import { getInviteByToken } from '@/lib/db/queries/invites'

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const invite = await getInviteByToken(token)
  if (!invite) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (invite.usedAt) return NextResponse.json({ error: 'Token already used' }, { status: 410 })
  return NextResponse.json({ createdBy: invite.createdBy })
}
