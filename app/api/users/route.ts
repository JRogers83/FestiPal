import { NextResponse } from 'next/server'
import { createUser } from '@/lib/db/queries/users'

export async function POST(request: Request) {
  try {
    const { id } = await request.json()
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'id required' }, { status: 400 })
    }
    const user = await createUser(id)
    return NextResponse.json(user, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }
}
