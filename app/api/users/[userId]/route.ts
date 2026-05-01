import { NextResponse } from 'next/server'
import { createUser, getUserById, updateUser } from '@/lib/db/queries/users'
import { USER_COLOURS } from '@/constants/colours'

const VALID_COLOURS = new Set(USER_COLOURS.map(c => c.hex))

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isValidUUID(s: unknown): s is string {
  return typeof s === 'string' && UUID_RE.test(s)
}

export async function GET(_req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params
  if (!isValidUUID(userId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  const user = await getUserById(userId)
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(user)
}

export async function PATCH(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const { userId } = await params
    if (!isValidUUID(userId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
    const body = await request.json()
    const data: { nickname?: string; colour?: string } = {}
    if (typeof body.nickname === 'string') {
      data.nickname = body.nickname.trim().slice(0, 24) || 'Anonymous'
    }
    if (typeof body.colour === 'string' && VALID_COLOURS.has(body.colour)) {
      data.colour = body.colour
    }
    await createUser(userId).catch(() => {})
    const user = await updateUser(userId, data)
    if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(user)
  } catch {
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}
