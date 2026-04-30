'use client'

import { useState, useEffect } from 'react'
import { PersonRow } from './PersonRow'
import { useConnections, useRemoveConnection, useAddDirectConnection } from '@/lib/hooks/use-connections'
import type { UserWithSelections } from '@/types'

type Props = {
  userId: string
  currentUser: UserWithSelections
  checkedUserIds: Set<string>
  onCheckChange: (userId: string, checked: boolean) => void
}

// Extract a userId or invite token from a pasted Festipals URL or raw UUID.
function parseConnectionInput(input: string): { type: 'userId' | 'token'; value: string } | null {
  const s = input.trim()
  const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'

  const scheduleMatch = s.match(new RegExp(`/u/(${UUID})`, 'i'))
  if (scheduleMatch) return { type: 'userId', value: scheduleMatch[1] }

  const inviteMatch = s.match(new RegExp(`/invite/(${UUID})`, 'i'))
  if (inviteMatch) return { type: 'token', value: inviteMatch[1] }

  // Bare UUID — treat as userId (schedule link)
  const rawMatch = s.match(new RegExp(`^(${UUID})$`, 'i'))
  if (rawMatch) return { type: 'userId', value: rawMatch[1] }

  return null
}

function copyToClipboard(text: string) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).catch(() => {})
  }
}

export function PeoplePanel({ userId, currentUser, checkedUserIds, onCheckChange }: Props) {
  const [open, setOpen] = useState(false)
  const [managing, setManaging] = useState(false)
  const [connectInput, setConnectInput] = useState('')
  const [connectFeedback, setConnectFeedback] = useState<{ ok: boolean; message: string } | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    setOpen(window.innerWidth >= 768)
  }, [])

  const { data: connections = [] } = useConnections(userId)
  const removeConnection = useRemoveConnection(userId)
  const addDirect = useAddDirectConnection(userId)

  const myLink = typeof window !== 'undefined'
    ? `${window.location.origin}/u/${userId}`
    : `/u/${userId}`

  function handleCopy(text: string, id: string) {
    copyToClipboard(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  async function handleShare(text: string) {
    if (navigator.share) {
      await navigator.share({ title: 'Festipals', url: text }).catch(() => {})
    } else {
      handleCopy(text, 'mylink')
    }
  }

  async function handleConnect() {
    setConnectFeedback(null)
    const parsed = parseConnectionInput(connectInput)
    if (!parsed) {
      setConnectFeedback({ ok: false, message: 'Paste a Festipals schedule link (/u/...) or invite link (/invite/...).' })
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

  return (
    <div style={{ position: 'relative', flexShrink: 0, display: 'flex' }}>

      {/* Edge handle */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={open ? 'Close group panel' : 'Open group panel'}
        style={{
          position: 'absolute',
          left: 0,
          top: '50%',
          transform: 'translateX(-100%) translateY(-50%)',
          zIndex: 20,
          width: 36,
          height: 96,
          borderRadius: '10px 0 0 10px',
          backgroundColor: 'var(--colour-surface)',
          border: '1px solid var(--colour-border)',
          borderRight: 'none',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          gap: 6,
        }}
      >
        <span style={{ fontSize: 22, color: 'var(--colour-primary)', lineHeight: 1, userSelect: 'none' }}>
          {open ? '›' : '‹'}
        </span>
        <span style={{
          fontSize: 13,
          color: 'var(--colour-primary)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          writingMode: 'vertical-rl',
          textOrientation: 'mixed',
          userSelect: 'none',
        }}>
          Group
        </span>
      </button>

      {/* Panel content */}
      <aside style={{
        width: open ? 256 : 0,
        overflow: 'hidden',
        transition: 'width 0.2s ease',
        backgroundColor: 'var(--colour-surface)',
        borderLeft: open ? '1px solid var(--colour-border)' : 'none',
        flexShrink: 0,
      }}>
        <div style={{ width: 256, display: 'flex', flexDirection: 'column', height: '100%' }}>

          {managing ? (
            /* ── Manage view ── */
            <>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 16px',
                borderBottom: '1px solid var(--colour-border)',
              }}>
                <button
                  onClick={() => { setManaging(false); setConnectFeedback(null); setConnectInput('') }}
                  style={{ color: 'var(--colour-primary)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 0 }}
                  aria-label="Back to group"
                >
                  ‹
                </button>
                <span className="text-sm font-medium uppercase tracking-wide" style={{ color: 'var(--colour-text-muted)' }}>
                  Manage
                </span>
              </div>

              <div style={{ overflowY: 'auto', flex: 1, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>

                {/* Your link */}
                <section>
                  <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--colour-text-muted)' }}>
                    Your link
                  </p>
                  <p className="text-xs mb-2" style={{ color: 'var(--colour-text-faint)', lineHeight: 1.5 }}>
                    Share this so a friend can connect with your existing profile.
                  </p>
                  <button
                    onClick={() => handleShare(myLink)}
                    className="w-full text-xs py-2 uppercase tracking-wide font-medium"
                    style={{
                      backgroundColor: 'var(--colour-primary)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 3,
                      cursor: 'pointer',
                    }}
                  >
                    {copiedId === 'mylink' ? '✓ Copied' : '⎘ Share / copy my link'}
                  </button>
                </section>

                <div style={{ borderTop: '1px solid var(--colour-border)' }} />

                {/* Connect a friend */}
                <section>
                  <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--colour-text-muted)' }}>
                    Connect a friend
                  </p>
                  <p className="text-xs mb-2" style={{ color: 'var(--colour-text-faint)', lineHeight: 1.5 }}>
                    Paste their Festipals link (<code style={{ color: 'var(--colour-text-faint)' }}>/u/…</code>) or an invite link (<code style={{ color: 'var(--colour-text-faint)' }}>/invite/…</code>).
                  </p>
                  <input
                    type="url"
                    placeholder="https://festipals.live/u/…"
                    value={connectInput}
                    onChange={e => { setConnectInput(e.target.value); setConnectFeedback(null) }}
                    onKeyDown={e => { if (e.key === 'Enter') handleConnect() }}
                    className="w-full text-xs px-2 py-2 mb-2"
                    style={{
                      backgroundColor: 'var(--colour-surface-2)',
                      border: '1px solid var(--colour-border)',
                      borderRadius: 3,
                      color: 'var(--colour-text)',
                      outline: 'none',
                      fontFamily: 'inherit',
                    }}
                  />
                  <button
                    onClick={handleConnect}
                    disabled={addDirect.isPending || !connectInput.trim()}
                    className="w-full text-xs py-2 uppercase tracking-wide font-medium"
                    style={{
                      backgroundColor: 'var(--colour-primary)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 3,
                      cursor: addDirect.isPending || !connectInput.trim() ? 'default' : 'pointer',
                      opacity: addDirect.isPending || !connectInput.trim() ? 0.5 : 1,
                    }}
                  >
                    {addDirect.isPending ? 'Connecting…' : 'Connect'}
                  </button>
                  {connectFeedback && (
                    <p
                      className="text-xs mt-2"
                      style={{ color: connectFeedback.ok ? '#22c55e' : 'var(--colour-primary)', lineHeight: 1.5 }}
                    >
                      {connectFeedback.message}
                    </p>
                  )}
                </section>

                {connections.length > 0 && (
                  <>
                    <div style={{ borderTop: '1px solid var(--colour-border)' }} />

                    {/* Group members' links */}
                    <section>
                      <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--colour-text-muted)' }}>
                        Group members' links
                      </p>
                      <p className="text-xs mb-2" style={{ color: 'var(--colour-text-faint)', lineHeight: 1.5 }}>
                        Send someone their link if they've lost it.
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {connections.map(conn => {
                          const link = `${typeof window !== 'undefined' ? window.location.origin : ''}/u/${conn.user.id}`
                          const cid = `member-${conn.user.id}`
                          return (
                            <div key={conn.user.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span
                                style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: conn.user.colour, flexShrink: 0 }}
                              />
                              <span className="text-xs flex-1 truncate" style={{ color: 'var(--colour-text)' }}>
                                {conn.user.nickname}
                              </span>
                              <button
                                onClick={() => handleCopy(link, cid)}
                                className="text-xs px-2 py-1"
                                style={{
                                  backgroundColor: 'var(--colour-surface-2)',
                                  border: '1px solid var(--colour-border)',
                                  borderRadius: 3,
                                  color: copiedId === cid ? '#22c55e' : 'var(--colour-text-muted)',
                                  cursor: 'pointer',
                                  flexShrink: 0,
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {copiedId === cid ? '✓' : '⎘'}
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    </section>
                  </>
                )}
              </div>
            </>
          ) : (
            /* ── Group view ── */
            <>
              <div
                className="px-4 py-3 text-sm font-medium uppercase tracking-wide"
                style={{ color: 'var(--colour-text-muted)', borderBottom: '1px solid var(--colour-border)' }}
              >
                Your Group
              </div>

              <div className="px-4 py-2" style={{ flex: 1 }}>
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
                  />
                ))}

                {connections.length === 0 && (
                  <p className="text-xs py-2" style={{ color: 'var(--colour-text-faint)' }}>
                    No friends linked yet. Invite someone!
                  </p>
                )}
              </div>

              {/* Manage button */}
              <div style={{ padding: '8px 16px 12px', borderTop: '1px solid var(--colour-border)' }}>
                <button
                  onClick={() => setManaging(true)}
                  className="w-full text-xs py-2 uppercase tracking-wide"
                  style={{
                    backgroundColor: 'var(--colour-surface-2)',
                    color: 'var(--colour-text-muted)',
                    border: '1px solid var(--colour-border)',
                    borderRadius: 3,
                    cursor: 'pointer',
                  }}
                >
                  Manage
                </button>
              </div>
            </>
          )}

        </div>
      </aside>
    </div>
  )
}
