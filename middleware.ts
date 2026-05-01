import { NextRequest, NextResponse } from 'next/server'

// In-memory sliding-window rate limiter.
// NOTE: This is per-instance. For multi-instance production use, replace
// the Map with Upstash Redis: https://github.com/upstash/ratelimit
const windows = new Map<string, { count: number; resetAt: number }>()

function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const entry = windows.get(key)
  if (!entry || entry.resetAt < now) {
    windows.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (entry.count >= limit) return false
  entry.count++
  return true
}

export function middleware(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  const { pathname } = request

  if (request.method !== 'POST') return NextResponse.next()

  if (pathname === '/api/invites') {
    if (!rateLimit(`invites:${ip}`, 10, 60_000)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }
  }

  if (pathname === '/api/selections') {
    if (!rateLimit(`selections:${ip}`, 60, 60_000)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }
  }

  if (pathname.startsWith('/api/connections')) {
    if (!rateLimit(`connections:${ip}`, 20, 60_000)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/api/invites', '/api/selections', '/api/connections/:path*'],
}
