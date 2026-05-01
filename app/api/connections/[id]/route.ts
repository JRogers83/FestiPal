import { NextResponse } from 'next/server'
import { getConnectionsForUser } from '@/lib/db/queries/connections'
import { removeConnectionById } from '@/lib/db/queries/connections'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isValidUUID(s: unknown): s is string {
  return typeof s === 'string' && UUID_RE.test(s)
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    if (!isValidUUID(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
    const conns = await getConnectionsForUser(id)
    return NextResponse.json(conns)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch connections' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    if (!isValidUUID(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
    await removeConnectionById(id)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Failed to remove connection' }, { status: 500 })
  }
}
