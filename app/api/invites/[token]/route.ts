import { NextResponse } from 'next/server'
import { getInviteByToken } from '@/lib/db/queries/invites'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isValidUUID(s: unknown): s is string {
  return typeof s === 'string' && UUID_RE.test(s)
}

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  if (!isValidUUID(token)) return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
  const invite = await getInviteByToken(token)
  if (!invite) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (invite.expiresAt && invite.expiresAt < new Date()) {
    return NextResponse.json({ error: 'Token expired' }, { status: 410 })
  }
  return NextResponse.json({ createdBy: invite.createdBy })
}
