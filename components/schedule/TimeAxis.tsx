type TimeSlot = { label: string; top: number }

type Props = {
  timeSlots: TimeSlot[]
  gridHeight: number
}

export function TimeAxis({ timeSlots, gridHeight }: Props) {
  return (
    <div className="relative flex-shrink-0 w-14" style={{ height: gridHeight + 40 }}>
      {/* Spacer for the sticky stage header row */}
      <div className="h-10" />
      {/* Hourly time labels only */}
      {timeSlots
        .filter((_, i) => i % 2 === 0)
        .map(slot => (
          <div
            key={slot.label}
            className="absolute right-2 text-xs tabular-nums"
            style={{
              top: slot.top + 40 - 8,
              color: 'var(--colour-text-muted)',
            }}
          >
            {slot.label}
          </div>
        ))}
    </div>
  )
}
