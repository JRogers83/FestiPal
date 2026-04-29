'use client'

type Props = {
  userId: string
  nickname: string
  colour: string
  checked: boolean
  isCurrentUser: boolean
  onCheckChange: (checked: boolean) => void
  onRemove?: () => void
}

export function PersonRow({ nickname, colour, checked, isCurrentUser, onCheckChange, onRemove }: Props) {
  return (
    <div className="flex items-center gap-3 py-2">
      <span
        className="w-3 h-3 rounded-full flex-shrink-0"
        style={{ backgroundColor: colour }}
      />
      <label className="flex items-center gap-2 flex-1 cursor-pointer text-sm">
        <input
          type="checkbox"
          checked={checked}
          onChange={e => onCheckChange(e.target.checked)}
          className="accent-[--colour-primary]"
        />
        <span style={{ color: 'var(--colour-text)' }}>
          {nickname}
          {isCurrentUser && (
            <span className="ml-1 text-xs" style={{ color: 'var(--colour-text-faint)' }}>(you)</span>
          )}
        </span>
      </label>
      {!isCurrentUser && onRemove && (
        <button
          onClick={onRemove}
          className="text-xs px-1 transition-colors"
          style={{ color: 'var(--colour-text-faint)' }}
          aria-label={`Remove ${nickname}`}
        >
          ✕
        </button>
      )}
    </div>
  )
}
