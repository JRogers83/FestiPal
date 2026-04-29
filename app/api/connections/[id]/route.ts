import { NextResponse } from 'next/server'
import { getConnectionsForUser } from '@/lib/db/queries/connections'
import { removeConnectionById } from '@/lib/db/queries/connections'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const conns = await getConnectionsForUser(id)
    return NextResponse.json(conns)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch connections' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await removeConnectionById(id)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Failed to remove connection' }, { status: 500 })
  }
}
