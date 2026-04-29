import { NextResponse } from 'next/server'
import { removeConnectionById } from '@/lib/db/queries/connections'

export async function DELETE(_req: Request, { params }: { params: Promise<{ connectionId: string }> }) {
  try {
    const { connectionId } = await params
    await removeConnectionById(connectionId)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Failed to remove connection' }, { status: 500 })
  }
}
