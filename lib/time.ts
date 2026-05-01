export const PX_PER_MINUTE = 2

// Acts before 6am are "late night" continuations of the previous festival day
export const FESTIVAL_CUTOFF_MINUTES = 6 * 60

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

// Maps a clock time to its position in a festival day.
// Times before 06:00 are treated as past-midnight continuations (adds 1440).
// e.g. "02:00" → 1560, "13:00" → 780, "23:30" → 1410
export function festivalMinutes(time: string): number {
  const mins = timeToMinutes(time)
  return mins < FESTIVAL_CUTOFF_MINUTES ? mins + 1440 : mins
}

export function adjustedEndMinutes(startTime: string, endTime: string): number {
  const start = timeToMinutes(startTime)
  const end = timeToMinutes(endTime)
  return end <= start ? end + 1440 : end
}

// Festival-aware end time. Handles acts that start in the post-midnight period.
export function festivalAdjustedEndMinutes(startTime: string, endTime: string): number {
  const start = festivalMinutes(startTime)
  const end = festivalMinutes(endTime)
  return end < start ? end + 1440 : end
}

export type DayBounds = { startMinutes: number; endMinutes: number }

// Uses festival-aware minutes so late-night acts position AFTER evening acts.
export function dayBounds(acts: { startTime: string; endTime: string }[]): DayBounds {
  let min = Infinity
  let max = -Infinity
  for (const act of acts) {
    const start = festivalMinutes(act.startTime)
    const end = festivalAdjustedEndMinutes(act.startTime, act.endTime)
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
