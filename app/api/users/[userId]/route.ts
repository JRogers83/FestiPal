import { NextResponse } from 'next/server'
import { getUserById, updateUser } from '@/lib/db/queries/users'

export async function GET(_req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params
  const user = await getUserById(userId)
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(user)
}

export async function PATCH(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const { userId } = await params
    const body = await request.json()
    const data: { nickname?: string; colour?: string } = {}
    if (typeof body.nickname === 'string') {
      data.nickname = body.nickname.trim().slice(0, 24) || 'Anonymous'
    }
    if (typeof body.colour === 'string') {
      data.colour = body.colour
    }
    const user = await updateUser(userId, data)
    if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(user)
  } catch {
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}
