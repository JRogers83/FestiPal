import { NextResponse } from 'next/server'
import { getLineup } from '@/lib/db/queries/lineup'

// Lineup never changes at runtime — cache for 24 hours
export const revalidate = 86400

export async function GET() {
  try {
    const lineup = await getLineup()
    return NextResponse.json(lineup)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch lineup' }, { status: 500 })
  }
}
