import type { ClashPair } from '@/types'

type Props = {
  clashPairs: ClashPair[]
}

export function ClashBanner({ clashPairs }: Props) {
  if (clashPairs.length === 0) return null

  return (
    <div
      className="px-4 py-2 mb-2 text-sm flex flex-wrap gap-2 items-center"
      style={{
        backgroundColor: 'var(--colour-primary-muted)',
        borderLeft: '3px solid var(--colour-primary)',
        color: 'var(--colour-text)',
      }}
    >
      <span className="font-medium">
        {clashPairs.length} clash{clashPairs.length !== 1 ? 'es' : ''}
      </span>
      {clashPairs.slice(0, 3).map((cp, i) => (
        <span key={i} className="text-xs opacity-80">
          <span style={{ color: cp.personA.colour }}>{cp.personA.nickname}</span>
          {' vs '}
          <span style={{ color: cp.personB.colour }}>{cp.personB.nickname}</span>
          {' at '}
          {cp.personA.act.startTime}
        </span>
      ))}
      {clashPairs.length > 3 && (
        <span className="text-xs opacity-60">+{clashPairs.length - 3} more</span>
      )}
    </div>
  )
}
