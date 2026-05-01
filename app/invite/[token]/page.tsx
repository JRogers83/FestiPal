import { redirect } from 'next/navigation'
import { randomUUID } from 'crypto'
import { getInviteByToken, redeemInvite } from '@/lib/db/queries/invites'
import { createUser, getUserById } from '@/lib/db/queries/users'

type Props = {
  params: Promise<{ token: string }>
  searchParams: Promise<{ error?: string }>
}

export default async function InvitePage({ params, searchParams }: Props) {
  const { token } = await params
  const { error } = await searchParams

  const invite = await getInviteByToken(token)

  // Token not found
  if (!invite) {
    return <InviteError message="This invite link is invalid or has expired." />
  }

  // Token expired
  if (invite.expiresAt && invite.expiresAt < new Date()) {
    return <InviteError message="This invite link has expired. Ask your friend to share a new one." />
  }

  // Error surfaced from a failed accept attempt (e.g. self_invite)
  if (error === 'self_invite') {
    return <InviteError message="You can't accept your own invite link — send it to a friend instead." />
  }
  if (error === 'expired') {
    return <InviteError message="This invite link has expired." />
  }

  // Look up the inviter's nickname for display
  const creator = await getUserById(invite.createdBy)
  const creatorName = creator?.nickname ?? 'A friend'

  // ── Server action — only runs on explicit button click, never on GET ──
  // Link previewers (Telegram, WhatsApp, iMessage, Outlook) make GET requests.
  // They never submit forms, so this action is safe from preview-fetch consumption.
  async function accept() {
    'use server'
    const visitorId = randomUUID()
    await createUser(visitorId)
    const result = await redeemInvite(token, visitorId)
    if (!result.success) {
      redirect(`/invite/${token}?error=${result.reason}`)
    }
    redirect(`/u/${visitorId}`)
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
      style={{ backgroundColor: 'var(--colour-bg)' }}>

      <span
        className="font-display text-3xl tracking-widest mb-8"
        style={{ color: 'var(--colour-primary)', fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 800 }}
      >
        Festipals
      </span>

      <div
        className="w-full max-w-sm rounded"
        style={{
          backgroundColor: 'var(--colour-surface)',
          border: '1px solid var(--colour-border)',
          padding: '2rem 1.5rem',
        }}
      >
        <p className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--colour-text-muted)' }}>
          Download Festival 2026
        </p>

        <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--colour-text)', fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {creatorName} invited you
        </h1>

        <p className="text-sm mb-6" style={{ color: 'var(--colour-text-muted)', lineHeight: 1.6 }}>
          Build your Download schedule, share it back, and see who you&apos;re clashing with.
          No account needed — your link is your identity.
        </p>

        <form action={accept}>
          <button
            type="submit"
            className="w-full py-3 text-sm font-bold uppercase tracking-widest"
            style={{
              backgroundColor: 'var(--colour-primary)',
              color: '#fff',
              border: 'none',
              borderRadius: 3,
              cursor: 'pointer',
              fontFamily: '"Barlow Condensed", sans-serif',
              fontSize: '1.05rem',
            }}
          >
            Accept invite
          </button>
        </form>
      </div>

      <p className="mt-6 text-xs" style={{ color: 'var(--colour-text-faint)' }}>
        Tapping accept creates a fresh anonymous profile for you.
      </p>
    </main>
  )
}

function InviteError({ message }: { message: string }) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <h1 className="font-display text-4xl mb-4" style={{ color: 'var(--colour-primary)', fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 800, textTransform: 'uppercase' }}>
        Festipals
      </h1>
      <p className="text-lg max-w-sm" style={{ color: 'var(--colour-text-muted)' }}>
        {message}
      </p>
      <a href="/" className="mt-8 text-sm underline" style={{ color: 'var(--colour-text-muted)' }}>
        Go to the homepage
      </a>
    </main>
  )
}
