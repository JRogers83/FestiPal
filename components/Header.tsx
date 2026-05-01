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
  const [editing, setEditing]           = useState(false)
  const [draftName, setDraftName]       = useState(nickname)
  const [inviteResult, setInviteResult] = useState<{ url: string } | null>(null)
  const [copied, setCopied]             = useState(false)
  const inputRef  = useRef<HTMLInputElement>(null)
  const resultRef = useRef<HTMLDivElement>(null)

  const updateUser   = useUpdateUser(userId)
  const createInvite = useCreateInvite()

  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])

  // Close invite result block on outside click
  useEffect(() => {
    if (!inviteResult) return
    function handleClick(e: MouseEvent) {
      if (resultRef.current && !resultRef.current.contains(e.target as Node)) {
        setInviteResult(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [inviteResult])

  function commitNickname() {
    setEditing(false)
    const trimmed = draftName.trim().slice(0, 24) || 'Anonymous'
    if (trimmed !== nickname) updateUser.mutate({ nickname: trimmed })
  }

  async function handleInvite() {
    const url = await createInvite.mutateAsync(userId)
    setInviteResult({ url })
    // Fire native share sheet on mobile as a convenience — result block shown regardless
    if (navigator.share) {
      navigator.share({ title: 'Festipals — Download 2026', url }).catch(() => {})
    }
  }

  function handleCopy() {
    if (!inviteResult) return
    navigator.clipboard.writeText(inviteResult.url).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ position: 'relative' }}>
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
            onKeyDown={e => {
              if (e.key === 'Enter') commitNickname()
              if (e.key === 'Escape') { setDraftName(nickname); setEditing(false) }
            }}
            maxLength={24}
            className="bg-transparent border-b text-sm outline-none w-32"
            style={{ borderColor: 'var(--colour-text)', color: 'var(--colour-text)' }}
          />
        ) : (
          <button
            onClick={() => setEditing(true)}
            title="Click to edit your nickname"
            className="text-sm flex items-center gap-1 transition-colors"
            style={{ color: 'var(--colour-text-muted)' }}
          >
            {nickname}
            <span style={{ fontSize: 11, opacity: 0.5 }}>✏</span>
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
          + Invite
        </button>
      </header>

      {/* Inline invite result block */}
      {inviteResult && (
        <div
          ref={resultRef}
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            zIndex: 50,
            width: 300,
            backgroundColor: 'var(--colour-surface)',
            border: '1px solid var(--colour-border)',
            borderRadius: 4,
            padding: 14,
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--colour-text-muted)' }}>
              Invite link ready
            </span>
            <button
              onClick={() => setInviteResult(null)}
              style={{ background: 'none', border: 'none', color: 'var(--colour-text-faint)', cursor: 'pointer', fontSize: 14, lineHeight: 1 }}
            >
              ×
            </button>
          </div>

          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            <div
              style={{
                flex: 1, background: 'var(--colour-surface-2)', border: '1px solid var(--colour-border)',
                borderRadius: 3, padding: '6px 8px', fontSize: 10, color: 'var(--colour-text-muted)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}
            >
              {inviteResult.url}
            </div>
            <button
              onClick={handleCopy}
              className="text-xs uppercase tracking-wide px-3"
              style={{
                backgroundColor: copied ? '#22c55e' : 'var(--colour-primary)',
                color: '#fff', border: 'none', borderRadius: 3, cursor: 'pointer', flexShrink: 0,
              }}
            >
              {copied ? '✓' : 'Copy'}
            </button>
          </div>

          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            <a
              href={`https://wa.me/?text=${encodeURIComponent('Join my Download 2026 group on Festipals! ' + inviteResult.url)}`}
              target="_blank" rel="noopener noreferrer"
              style={{ flex: 1, background: '#25D366', color: '#fff', borderRadius: 3, padding: '5px 0', textAlign: 'center', fontSize: 10, textDecoration: 'none' }}
            >WhatsApp</a>
            <a
              href={`https://t.me/share/url?url=${encodeURIComponent(inviteResult.url)}&text=${encodeURIComponent('Join my Download 2026 group on Festipals!')}`}
              target="_blank" rel="noopener noreferrer"
              style={{ flex: 1, background: '#0088cc', color: '#fff', borderRadius: 3, padding: '5px 0', textAlign: 'center', fontSize: 10, textDecoration: 'none' }}
            >Telegram</a>
            <a
              href={`sms:?body=${encodeURIComponent('Join my Download 2026 group on Festipals! ' + inviteResult.url)}`}
              style={{ flex: 1, background: 'var(--colour-surface-2)', color: 'var(--colour-text-muted)', border: '1px solid var(--colour-border)', borderRadius: 3, padding: '5px 0', textAlign: 'center', fontSize: 10, textDecoration: 'none' }}
            >SMS</a>
          </div>

          <p style={{ fontSize: 10, color: 'var(--colour-text-faint)', margin: 0 }}>
            Anyone with this link can join your group. Expires 21 Jun.
          </p>
        </div>
      )}
    </div>
  )
}
