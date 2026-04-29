'use client'

import { useState, useRef, useEffect } from 'react'
import { ColourPicker } from './ColourPicker'
import { useUpdateUser } from '@/lib/hooks/use-user'
import { useCreateInvite } from '@/lib/hooks/use-invite'

type Props = {
  userId: string
  nickname: string
  colour: string
}

export function Header({ userId, nickname, colour }: Props) {
  const [editing, setEditing] = useState(false)
  const [draftName, setDraftName] = useState(nickname)
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const updateUser   = useUpdateUser(userId)
  const createInvite = useCreateInvite()

  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])

  function commitNickname() {
    setEditing(false)
    const trimmed = draftName.trim().slice(0, 24) || 'Anonymous'
    if (trimmed !== nickname) updateUser.mutate({ nickname: trimmed })
  }

  async function handleInvite() {
    const url = await createInvite.mutateAsync(userId)
    setInviteUrl(url)
    await navigator.clipboard.writeText(url).catch(() => {})
  }

  return (
    <header
      className="sticky top-0 z-40 flex items-center gap-3 px-4 h-14"
      style={{ backgroundColor: 'var(--colour-surface)', borderBottom: '1px solid var(--colour-border)' }}
    >
      <span
        className="font-display text-xl tracking-widest mr-auto"
        style={{ color: 'var(--colour-primary)', fontFamily: 'Barlow Condensed, sans-serif' }}
      >
        Festipals
      </span>

      <ColourPicker
        value={colour}
        onChange={hex => updateUser.mutate({ colour: hex })}
      />

      {editing ? (
        <input
          ref={inputRef}
          value={draftName}
          onChange={e => setDraftName(e.target.value)}
          onBlur={commitNickname}
          onKeyDown={e => { if (e.key === 'Enter') commitNickname() }}
          maxLength={24}
          className="bg-transparent border-b text-sm outline-none w-32"
          style={{ borderColor: 'var(--colour-text)', color: 'var(--colour-text)' }}
        />
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="text-sm hover:text-[--colour-primary] transition-colors"
          style={{ color: 'var(--colour-text-muted)' }}
        >
          {nickname}
        </button>
      )}

      <button
        onClick={handleInvite}
        disabled={createInvite.isPending}
        className="text-xs px-3 py-1.5 uppercase tracking-wider font-medium transition-colors"
        style={{
          backgroundColor: 'var(--colour-primary)',
          color: '#fff',
          opacity: createInvite.isPending ? 0.6 : 1,
        }}
      >
        {inviteUrl ? 'Copied!' : '+ Invite'}
      </button>
    </header>
  )
}
