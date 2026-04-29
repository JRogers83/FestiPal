import { redirect } from 'next/navigation'
import { randomUUID } from 'crypto'
import { getInviteByToken, redeemInvite } from '@/lib/db/queries/invites'
import { createUser, getUserById } from '@/lib/db/queries/users'

type Props = {
  params: Promise<{ token: string }>
  searchParams: Promise<{ userId?: string }>
}

export default async function InvitePage({ params, searchParams }: Props) {
  const { token } = await params
  const { userId: visitorId } = await searchParams

  const invite = await getInviteByToken(token)

  if (!invite) {
    return <InviteError message="This invite link is invalid or has expired." />
  }

  if (invite.usedAt) {
    return <InviteError message="This invite link has already been used. Ask your friend to send a new one." />
  }

  if (!visitorId) {
    const newId = randomUUID()
    redirect(`/invite/${token}?userId=${newId}`)
  }

  // After the !visitorId redirect guard, visitorId is defined
  const resolvedVisitorId = visitorId!

  if (invite.createdBy === resolvedVisitorId) {
    return <InviteError message="You can't accept your own invite link!" />
  }

  const existing = await getUserById(resolvedVisitorId)
  if (!existing) {
    await createUser(resolvedVisitorId)
  }

  const result = await redeemInvite(token, resolvedVisitorId)

  if (!result.success) {
    const messages: Record<string, string> = {
      not_found:    'This invite link is invalid.',
      already_used: 'This invite link has already been used.',
      self_invite:  "You can't accept your own invite link!",
    }
    return <InviteError message={messages[result.reason] ?? 'Something went wrong.'} />
  }

  redirect(`/u/${resolvedVisitorId}`)
}

function InviteError({ message }: { message: string }) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <h1 className="font-display text-4xl mb-4" style={{ color: 'var(--colour-primary)' }}>
        Festipals
      </h1>
      <p className="text-lg max-w-sm" style={{ color: 'var(--colour-text-muted)' }}>
        {message}
      </p>
      <a
        href="/"
        className="mt-8 text-sm underline"
        style={{ color: 'var(--colour-text-muted)' }}
      >
        Go to the homepage
      </a>
    </main>
  )
}
