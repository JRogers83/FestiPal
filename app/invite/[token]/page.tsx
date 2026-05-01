import { redirect } from 'next/navigation'
import { randomUUID } from 'crypto'
import { getInviteByToken, redeemInvite } from '@/lib/db/queries/invites'
import { createUserWithColour, getUserById } from '@/lib/db/queries/users'
import { getConnectionsForUser, createDirectConnection } from '@/lib/db/queries/connections'
import { USER_COLOURS } from '@/constants/colours'

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
  if (error === 'invalid_url') {
    return <InviteError message="That doesn't look like a valid Festipals link. Check the URL and try again." />
  }
  if (error === 'user_not_found') {
    return <InviteError message="That profile wasn't found. Make sure you pasted your own Festipals link." />
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

    // Read existing group colours so the new user gets a distinct one
    const groupConnections = await getConnectionsForUser(invite.createdBy)
    const inviter = await getUserById(invite.createdBy)
    const usedColours = new Set([
      inviter?.colour,
      ...groupConnections.map(c => c.user.colour),
    ].filter(Boolean) as string[])
    const assignedColour = USER_COLOURS.find(c => !usedColours.has(c.hex))?.hex ?? '#3b82f6'

    await createUserWithColour(visitorId, assignedColour)
    const result = await redeemInvite(token, visitorId)
    if (!result.success) {
      redirect(`/invite/${token}?error=${result.reason}`)
    }
    redirect(`/u/${visitorId}`)
  }

  async function acceptAsExisting(formData: FormData) {
    'use server'
    const pastedUrl = (formData.get('existingUrl') as string) ?? ''
    const UUID_PATTERN = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
    const match = pastedUrl.match(new RegExp(`/u/(${UUID_PATTERN})`, 'i'))
    if (!match) redirect(`/invite/${token}?error=invalid_url`)
    const existingUserId = match[1]
    if (existingUserId === invite.createdBy) redirect(`/invite/${token}?error=self_invite`)
    const existingUser = await getUserById(existingUserId)
    if (!existingUser) redirect(`/invite/${token}?error=user_not_found`)
    await createDirectConnection(invite.createdBy, existingUserId)
    redirect(`/u/${existingUserId}`)
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

        <details style={{ marginTop: 16, maxWidth: '100%' }}>
          <summary style={{ fontSize: '0.85rem', color: 'var(--colour-text-muted)', cursor: 'pointer', userSelect: 'none' }}>
            Already using Festipals? Join as your existing profile
          </summary>
          <div style={{ marginTop: 10 }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--colour-text-muted)', marginBottom: 8, lineHeight: 1.5 }}>
              Paste your Festipals link to connect without losing your existing schedule.
            </p>
            <form action={acceptAsExisting} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input
                name="existingUrl"
                type="url"
                placeholder="https://festipals.live/u/…"
                required
                style={{
                  width: '100%', padding: '8px 10px', background: 'var(--colour-surface-2)',
                  border: '1px solid var(--colour-border)', borderRadius: 3,
                  color: 'var(--colour-text)', fontSize: '0.875rem', outline: 'none',
                }}
              />
              <button
                type="submit"
                style={{ padding: '8px', background: 'var(--colour-surface-2)', border: '1px solid var(--colour-border)', borderRadius: 3, color: 'var(--colour-text-muted)', fontSize: '0.85rem', cursor: 'pointer' }}
              >
                Join as this profile
              </button>
            </form>
          </div>
        </details>
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
