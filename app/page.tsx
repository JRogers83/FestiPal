import { redirect } from 'next/navigation'
import { randomUUID } from 'crypto'

export default function LandingPage() {
  async function start() {
    'use server'
    redirect(`/u/${randomUUID()}`)
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <h1 className="font-display text-5xl md:text-7xl text-[--colour-primary] mb-4">
        Festipals
      </h1>
      <p className="text-xl md:text-2xl text-[--colour-text-muted] mb-2 max-w-lg">
        Download Festival 2026 — Build your schedule. Share it. See who clashes.
      </p>
      <p className="text-sm text-[--colour-text-faint] mb-10 max-w-sm">
        No sign-up needed. Your link is your identity — bookmark it to come back.
      </p>
      <form action={start}>
        <button
          type="submit"
          className="bg-[--colour-primary] text-white font-display text-xl px-8 py-4
                     uppercase tracking-widest hover:bg-[--colour-primary-muted] transition-colors"
        >
          Build your schedule
        </button>
      </form>
    </main>
  )
}
