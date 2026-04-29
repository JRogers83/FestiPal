import { NextResponse } from 'next/server'
import { createInvite } from '@/lib/db/queries/invites'

export async function POST(request: Request) {
  try {
    const { createdBy } = await request.json()
    if (!createdBy) return NextResponse.json({ error: 'createdBy required' }, { status: 400 })
    const invite = await createInvite(createdBy)
    return NextResponse.json({ token: invite.token }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 })
  }
}
