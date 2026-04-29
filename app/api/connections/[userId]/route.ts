import { NextResponse } from 'next/server'
import { getConnectionsForUser } from '@/lib/db/queries/connections'

export async function GET(_req: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const { userId } = await params
    const conns = await getConnectionsForUser(userId)
    return NextResponse.json(conns)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch connections' }, { status: 500 })
  }
}
