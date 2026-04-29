'use client'

import { useRouter } from 'next/navigation'
import type { FestivalDay } from '@/types'

type Props = {
  days: FestivalDay[]
  activeDay: string
  userId: string
}

export function DayTabs({ days, activeDay, userId }: Props) {
  const router = useRouter()

  return (
    <div className="flex border-b" style={{ borderColor: 'var(--colour-border)' }}>
      {days.map(day => {
        const isActive = day.id === activeDay
        return (
          <button
            key={day.id}
            onClick={() => router.push(`/u/${userId}?day=${day.id}`)}
            className="px-4 py-3 text-sm font-medium uppercase tracking-wide transition-colors"
            style={{
              color: isActive ? 'var(--colour-primary)' : 'var(--colour-text-muted)',
              borderBottom: isActive ? '2px solid var(--colour-primary)' : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            {day.label.split(' ')[0]}
          </button>
        )
      })}
    </div>
  )
}
