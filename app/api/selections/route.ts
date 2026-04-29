import { NextResponse } from 'next/server'
import { addSelection, removeSelection } from '@/lib/db/queries/selections'
import { createUser } from '@/lib/db/queries/users'

export async function POST(request: Request) {
  try {
    const { userId, actId } = await request.json()
    if (!userId || !actId) {
      return NextResponse.json({ error: 'userId and actId required' }, { status: 400 })
    }
    // Ensure user row exists before FK-constrained insert (first meaningful action)
    await createUser(userId).catch(() => {})
    await addSelection(userId, actId)
    return NextResponse.json({ ok: true }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to add selection' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { userId, actId } = await request.json()
    if (!userId || !actId) {
      return NextResponse.json({ error: 'userId and actId required' }, { status: 400 })
    }
    await removeSelection(userId, actId)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Failed to remove selection' }, { status: 500 })
  }
}
