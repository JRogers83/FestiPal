export const PX_PER_MINUTE = 2

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

// Returns end time in minutes, adding 1440 if the act spans midnight.
// e.g. startTime="23:30", endTime="00:30" → 30 + 1440 = 1470
export function adjustedEndMinutes(startTime: string, endTime: string): number {
  const start = timeToMinutes(startTime)
  const end = timeToMinutes(endTime)
  return end <= start ? end + 1440 : end
}

export type DayBounds = { startMinutes: number; endMinutes: number }

export function dayBounds(acts: { startTime: string; endTime: string }[]): DayBounds {
  let min = Infinity
  let max = -Infinity
  for (const act of acts) {
    const start = timeToMinutes(act.startTime)
    const end = adjustedEndMinutes(act.startTime, act.endTime)
    if (start < min) min = start
    if (end > max) max = end
  }
  return {
    startMinutes: Math.floor(min / 60) * 60,
    endMinutes: Math.ceil(max / 60) * 60,
  }
}

export function minutesToPx(minutes: number): number {
  return minutes * PX_PER_MINUTE
}

export function formatTime(time: string): string {
  return time.slice(0, 5)
}
