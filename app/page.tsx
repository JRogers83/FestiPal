import { redirect } from 'next/navigation'
import { randomUUID } from 'crypto'

export default function LandingPage() {
  async function start() {
    'use server'
    redirect(`/u/${randomUUID()}`)
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <h1
        className="font-display text-5xl md:text-7xl mb-4"
        style={{ color: 'var(--colour-primary)' }}
      >
        Festipals
      </h1>
      <p className="text-xl md:text-2xl mb-2 max-w-lg" style={{ color: 'var(--colour-text-muted)' }}>
        Download Festival 2026 — Build your schedule. Share it. See who clashes.
      </p>
      <p className="text-sm mb-10 max-w-sm" style={{ color: 'var(--colour-text-faint)' }}>
        No sign-up needed. Your link is your identity — bookmark it to come back.
      </p>
      <form action={start}>
        <button
          type="submit"
          className="font-display text-xl px-8 py-4 uppercase tracking-widest transition-colors"
          style={{ backgroundColor: 'var(--colour-primary)', color: '#fff' }}
        >
          Build your schedule
        </button>
      </form>
    </main>
  )
}
