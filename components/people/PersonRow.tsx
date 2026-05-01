'use client'

import { useState } from 'react'

type Props = {
  userId: string
  nickname: string
  colour: string
  checked: boolean
  isCurrentUser: boolean
  onCheckChange: (checked: boolean) => void
  onRemove?: () => void
  onCopyLink?: () => void
}

export function PersonRow({ nickname, colour, checked, isCurrentUser, onCheckChange, onRemove, onCopyLink }: Props) {
  const [confirming, setConfirming] = useState(false)
  const [copied, setCopied]         = useState(false)

  function handleCopyLink() {
    onCopyLink?.()
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (confirming) {
    return (
      <div className="py-2">
        <p className="text-xs mb-2" style={{ color: 'var(--colour-text)', lineHeight: 1.5 }}>
          Remove <strong>{nickname}</strong> from your group?
        </p>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={() => { onRemove?.(); setConfirming(false) }}
            className="text-xs uppercase tracking-wide font-medium"
            style={{ flex: 1, padding: '5px 0', backgroundColor: 'var(--colour-primary)', color: '#fff', border: 'none', borderRadius: 3, cursor: 'pointer' }}
          >
            Yes, remove
          </button>
          <button
            onClick={() => setConfirming(false)}
            className="text-xs uppercase tracking-wide"
            style={{ flex: 1, padding: '5px 0', backgroundColor: 'var(--colour-surface-2)', color: 'var(--colour-text-muted)', border: '1px solid var(--colour-border)', borderRadius: 3, cursor: 'pointer' }}
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 py-2">
      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: colour }} />
      <label className="flex items-center gap-2 flex-1 cursor-pointer text-sm">
        <input
          type="checkbox"
          checked={checked}
          onChange={e => onCheckChange(e.target.checked)}
          className="accent-[--colour-primary]"
        />
        <span style={{ color: 'var(--colour-text)' }}>
          {nickname}
          {isCurrentUser && <span className="ml-1 text-xs" style={{ color: 'var(--colour-text-faint)' }}>(you)</span>}
        </span>
      </label>
      {!isCurrentUser && onCopyLink && (
        <button
          onClick={handleCopyLink}
          title={`Copy ${nickname}'s schedule link`}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, padding: '0 2px', color: copied ? '#22c55e' : 'var(--colour-text-faint)', lineHeight: 1 }}
        >
          {copied ? '✓' : '⎘'}
        </button>
      )}
      {!isCurrentUser && onRemove && (
        <button
          onClick={() => setConfirming(true)}
          style={{ color: 'var(--colour-primary)', fontSize: 16, lineHeight: 1, padding: '0 4px', background: 'none', border: 'none', cursor: 'pointer' }}
          aria-label={`Remove ${nickname}`}
        >
          ✕
        </button>
      )}
    </div>
  )
}
