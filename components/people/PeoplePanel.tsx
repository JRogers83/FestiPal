'use client'

import { useState, useEffect } from 'react'
import { PersonRow } from './PersonRow'
import { useConnections, useRemoveConnection, useAddDirectConnection } from '@/lib/hooks/use-connections'
import { useCreateInvite } from '@/lib/hooks/use-invite'
import type { UserWithSelections } from '@/types'

type PlanSummary = {
  actCount: number
  dayLabel: string
  nextActs: { name: string; time: string; stage: string }[]
}

type Props = {
  userId: string
  currentUser: UserWithSelections
  checkedUserIds: Set<string>
  onCheckChange: (userId: string, checked: boolean) => void
  planSummary: PlanSummary
  clashPairCount: number
}

function parseConnectionInput(input: string): { type: 'userId' | 'token'; value: string } | null {
  const s = input.trim()
  const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
  const scheduleMatch = s.match(new RegExp(`/u/(${UUID})`, 'i'))
  if (scheduleMatch) return { type: 'userId', value: scheduleMatch[1] }
  const inviteMatch = s.match(new RegExp(`/invite/(${UUID})`, 'i'))
  if (inviteMatch) return { type: 'token', value: inviteMatch[1] }
  const rawMatch = s.match(new RegExp(`^(${UUID})$`, 'i'))
  if (rawMatch) return { type: 'userId', value: rawMatch[1] }
  return null
}

export function PeoplePanel({ userId, currentUser, checkedUserIds, onCheckChange, planSummary, clashPairCount }: Props) {
  const [open, setOpen]                 = useState(false)
  const [isMobile, setIsMobile]         = useState(false)
  const [connectInput, setConnectInput] = useState('')
  const [connectFeedback, setConnectFeedback] = useState<{ ok: boolean; message: string } | null>(null)
  const [inviteResult, setInviteResult] = useState<{ url: string } | null>(null)
  const [inviteCopied, setInviteCopied] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    setOpen(window.innerWidth >= 768)
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const { data: connections = [] } = useConnections(userId)
  const removeConnection = useRemoveConnection(userId)
  const addDirect        = useAddDirectConnection(userId)
  const createInvite     = useCreateInvite()

  async function handleShare() {
    const url = await createInvite.mutateAsync(userId)
    setInviteResult({ url })
    if (navigator.share) {
      navigator.share({ title: 'Festipals — Download 2026', url }).catch(() => {})
    }
  }

  function handleCopyInvite() {
    if (!inviteResult) return
    navigator.clipboard.writeText(inviteResult.url).catch(() => {})
    setInviteCopied(true)
    setTimeout(() => setInviteCopied(false), 2000)
  }

  function handleCopyBookmark() {
    const url = `${window.location.origin}/u/${userId}`
    if (navigator.share) {
      navigator.share({ title: 'Festipals', url }).catch(() => {})
    } else {
      navigator.clipboard.writeText(url).catch(() => {})
    }
  }

  function handleCopyMemberLink(memberId: string) {
    const url = `${window.location.origin}/u/${memberId}`
    if (navigator.share) {
      navigator.share({ title: 'Festipals', url }).catch(() => {})
    } else {
      navigator.clipboard.writeText(url).catch(() => {})
    }
  }

  async function handleConnect() {
    setConnectFeedback(null)
    const parsed = parseConnectionInput(connectInput)
    if (!parsed) {
      setConnectFeedback({ ok: false, message: 'Paste a Festipals link (/u/… or /invite/…).' })
      return
    }
    try {
      const result = await addDirect.mutateAsync(
        parsed.type === 'token' ? { token: parsed.value } : { targetUserId: parsed.value }
      )
      setConnectFeedback({ ok: true, message: `Connected! ${result.nickname} has been added to your group.` })
      setConnectInput('')
    } catch (e) {
      setConnectFeedback({ ok: false, message: (e as Error).message })
    }
  }

  const panelContent = (
    <div style={{ width: isMobile ? '100%' : 256, display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* YOUR PLAN */}
      <div style={{ padding: '10px 14px 8px', borderBottom: '1px solid var(--colour-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--colour-text-muted)' }}>Your Plan</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 9, height: 9, borderRadius: '50%', backgroundColor: currentUser.colour }} />
            <span className="text-xs" style={{ color: 'var(--colour-text)' }}>{currentUser.nickname}</span>
          </div>
        </div>
        <div className="text-xs" style={{ color: 'var(--colour-text-muted)', marginBottom: 6 }}>
          {planSummary.actCount} act{planSummary.actCount !== 1 ? 's' : ''} · {planSummary.dayLabel.split(' ')[0]}
        </div>
        {planSummary.nextActs.length > 0 && (
          <>
            <div className="text-xs uppercase tracking-wide" style={{ color: 'var(--colour-text-faint)', marginBottom: 3 }}>Next</div>
            {planSummary.nextActs.map((a, i) => (
              <div key={i} className="text-xs" style={{ padding: '2px 0', color: 'var(--colour-text)' }}>
                {a.name}
                <span style={{ color: 'var(--colour-text-muted)', marginLeft: 6 }}>{a.time} · {a.stage}</span>
              </div>
            ))}
          </>
        )}
      </div>

      {/* SHARE CTAs */}
      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--colour-border)', display: 'flex', flexDirection: 'column', gap: 5 }}>
        {inviteResult ? (
          <div style={{ background: 'var(--colour-surface-2)', border: '1px solid var(--colour-border)', borderRadius: 3, padding: 10 }}>
            <div style={{ display: 'flex', gap: 5, marginBottom: 6 }}>
              <div style={{ flex: 1, fontSize: 10, color: 'var(--colour-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {inviteResult.url}
              </div>
              <button
                onClick={handleCopyInvite}
                style={{ background: inviteCopied ? '#22c55e' : 'var(--colour-primary)', color: '#fff', border: 'none', borderRadius: 2, fontSize: 9, padding: '3px 7px', cursor: 'pointer', flexShrink: 0 }}
              >
                {inviteCopied ? '✓' : 'Copy'}
              </button>
              <button
                onClick={() => setInviteResult(null)}
                style={{ background: 'none', border: 'none', color: 'var(--colour-text-faint)', cursor: 'pointer', fontSize: 12, lineHeight: 1 }}
              >×</button>
            </div>
            <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
              <a
                href={`https://wa.me/?text=${encodeURIComponent('Join my Download 2026 group on Festipals! ' + inviteResult.url)}`}
                target="_blank" rel="noopener noreferrer"
                style={{ flex: 1, background: '#25D366', color: '#fff', borderRadius: 3, padding: '4px 0', textAlign: 'center', fontSize: 9, textDecoration: 'none' }}
              >WhatsApp</a>
              <a
                href={`https://t.me/share/url?url=${encodeURIComponent(inviteResult.url)}&text=${encodeURIComponent('Join my Download 2026 group on Festipals!')}`}
                target="_blank" rel="noopener noreferrer"
                style={{ flex: 1, background: '#0088cc', color: '#fff', borderRadius: 3, padding: '4px 0', textAlign: 'center', fontSize: 9, textDecoration: 'none' }}
              >Telegram</a>
              <a
                href={`sms:?body=${encodeURIComponent('Join my Download 2026 group on Festipals! ' + inviteResult.url)}`}
                style={{ flex: 1, background: 'var(--colour-surface)', color: 'var(--colour-text-muted)', border: '1px solid var(--colour-border)', borderRadius: 3, padding: '4px 0', textAlign: 'center', fontSize: 9, textDecoration: 'none' }}
              >SMS</a>
            </div>
            <p style={{ fontSize: 9, color: 'var(--colour-text-faint)', margin: 0 }}>Anyone with this link can join. Expires 21 Jun.</p>
          </div>
        ) : (
          <button
            onClick={handleShare}
            disabled={createInvite.isPending}
            className="w-full text-xs py-2 uppercase tracking-wide font-medium"
            style={{ backgroundColor: 'var(--colour-primary)', color: '#fff', border: 'none', borderRadius: 3, cursor: 'pointer', opacity: createInvite.isPending ? 0.6 : 1 }}
          >
            Share with friends
          </button>
        )}
        <button
          onClick={handleCopyBookmark}
          className="w-full text-xs py-1.5"
          style={{ backgroundColor: 'transparent', color: 'var(--colour-text-muted)', border: '1px solid var(--colour-border)', borderRadius: 3, cursor: 'pointer' }}
          title="Your private schedule link — save it to come back later"
        >
          Copy your bookmark URL
        </button>
      </div>

      {/* GROUP */}
      <div style={{ padding: '8px 14px', flex: 1, overflowY: 'auto' }}>
        <div className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--colour-text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>Group <span style={{ fontWeight: 'normal', textTransform: 'none', letterSpacing: 0, color: 'var(--colour-text-faint)' }}>({connections.length})</span></span>
          {clashPairCount > 0 && (
            <span style={{ fontWeight: 'normal', textTransform: 'none', letterSpacing: 0, color: 'var(--colour-primary)' }}>
              {clashPairCount} clash{clashPairCount !== 1 ? 'es' : ''}
            </span>
          )}
        </div>

        <PersonRow
          userId={userId}
          nickname={currentUser.nickname}
          colour={currentUser.colour}
          checked={checkedUserIds.has(userId)}
          isCurrentUser={true}
          onCheckChange={checked => onCheckChange(userId, checked)}
        />

        {connections.map(conn => (
          <PersonRow
            key={conn.connectionId}
            userId={conn.user.id}
            nickname={conn.user.nickname}
            colour={conn.user.colour}
            checked={checkedUserIds.has(conn.user.id)}
            isCurrentUser={false}
            onCheckChange={checked => onCheckChange(conn.user.id, checked)}
            onRemove={() => removeConnection.mutate(conn.connectionId)}
            onCopyLink={() => handleCopyMemberLink(conn.user.id)}
          />
        ))}

        {connections.length === 0 && (
          <p className="text-xs py-1" style={{ color: 'var(--colour-text-faint)' }}>
            No friends yet — share the link above!
          </p>
        )}

        {/* Inline connect-by-paste */}
        <div style={{ marginTop: 10 }}>
          <input
            type="url"
            placeholder="Paste a friend's link to connect…"
            value={connectInput}
            onChange={e => { setConnectInput(e.target.value); setConnectFeedback(null) }}
            onKeyDown={e => { if (e.key === 'Enter') handleConnect() }}
            className="w-full text-xs px-2 py-2"
            style={{ backgroundColor: 'var(--colour-surface-2)', border: '1px solid var(--colour-border)', borderRadius: 3, color: 'var(--colour-text)', outline: 'none', fontFamily: 'inherit' }}
          />
          {connectInput.trim() && (
            <button
              onClick={handleConnect}
              disabled={addDirect.isPending}
              className="w-full text-xs py-1.5 mt-1 uppercase tracking-wide"
              style={{ backgroundColor: 'var(--colour-primary)', color: '#fff', border: 'none', borderRadius: 3, cursor: 'pointer', opacity: addDirect.isPending ? 0.6 : 1 }}
            >
              {addDirect.isPending ? 'Connecting…' : 'Connect'}
            </button>
          )}
          {connectFeedback && (
            <p className="text-xs mt-1" style={{ color: connectFeedback.ok ? '#22c55e' : 'var(--colour-primary)', lineHeight: 1.5 }}>
              {connectFeedback.message}
            </p>
          )}
        </div>
      </div>

    </div>
  )

  if (isMobile) {
    return (
      <>
        {/* Edge handle — only when closed */}
        {!open && (
          <button
            onClick={() => setOpen(true)}
            aria-label="Open group panel"
            style={{
              position: 'fixed', right: 0, top: '50%', transform: 'translateY(-50%)',
              zIndex: 20, width: 36, height: 96,
              borderRadius: '10px 0 0 10px',
              backgroundColor: 'var(--colour-surface)',
              border: '1px solid var(--colour-border)', borderRight: 'none',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: 22, color: 'var(--colour-primary)', lineHeight: 1, userSelect: 'none' }}>‹</span>
            <span style={{ fontSize: 13, color: 'var(--colour-primary)', textTransform: 'uppercase', letterSpacing: '0.1em', writingMode: 'vertical-rl', userSelect: 'none' }}>Group</span>
          </button>
        )}

        {/* Bottom sheet */}
        {open && (
          <>
            <div
              onClick={() => setOpen(false)}
              style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 49 }}
            />
            <div
              style={{
                position: 'fixed', bottom: 0, left: 0, right: 0,
                maxHeight: '70vh', zIndex: 50,
                backgroundColor: 'var(--colour-surface)',
                borderRadius: '12px 12px 0 0',
                borderTop: '1px solid var(--colour-border)',
                display: 'flex', flexDirection: 'column',
                overflowY: 'auto',
              }}
            >
              {/* Drag handle */}
              <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
                <div style={{ width: 36, height: 4, backgroundColor: 'var(--colour-border)', borderRadius: 2 }} />
              </div>
              {panelContent}
            </div>
          </>
        )}
      </>
    )
  }

  // Desktop: right-side sliding panel
  return (
    <div style={{ position: 'relative', flexShrink: 0, display: 'flex' }}>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open group panel"
          style={{
            position: 'absolute', left: 0, top: '50%', transform: 'translateX(-100%) translateY(-50%)',
            zIndex: 20, width: 36, height: 96,
            borderRadius: '10px 0 0 10px',
            backgroundColor: 'var(--colour-surface)',
            border: '1px solid var(--colour-border)', borderRight: 'none',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer',
          }}
        >
          <span style={{ fontSize: 22, color: 'var(--colour-primary)', lineHeight: 1, userSelect: 'none' }}>‹</span>
          <span style={{ fontSize: 13, color: 'var(--colour-primary)', textTransform: 'uppercase', letterSpacing: '0.1em', writingMode: 'vertical-rl', userSelect: 'none' }}>Group</span>
        </button>
      )}
      {open && (
        <button
          onClick={() => setOpen(false)}
          aria-label="Close group panel"
          style={{
            position: 'absolute', left: 0, top: '50%', transform: 'translateX(-100%) translateY(-50%)',
            zIndex: 20, width: 36, height: 96,
            borderRadius: '10px 0 0 10px',
            backgroundColor: 'var(--colour-surface)',
            border: '1px solid var(--colour-border)', borderRight: 'none',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer',
          }}
        >
          <span style={{ fontSize: 22, color: 'var(--colour-primary)', lineHeight: 1, userSelect: 'none' }}>›</span>
          <span style={{ fontSize: 13, color: 'var(--colour-primary)', textTransform: 'uppercase', letterSpacing: '0.1em', writingMode: 'vertical-rl', userSelect: 'none' }}>Group</span>
        </button>
      )}

      <aside style={{ width: open ? 256 : 0, overflow: 'hidden', transition: 'width 0.2s ease', backgroundColor: 'var(--colour-surface)', borderLeft: open ? '1px solid var(--colour-border)' : 'none', flexShrink: 0 }}>
        {panelContent}
      </aside>
    </div>
  )
}
