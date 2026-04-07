import { parseLocalDate } from '@/lib/month-calendar'

/** Monday=0 .. Sunday=6 for a local calendar date (YYYY-MM-DD). */
export function mondayBasedWeekday(dateStr: string): number {
  const dt = parseLocalDate(dateStr)
  const dow = dt.getDay()
  return dow === 0 ? 6 : dow - 1
}

/** Whole calendar days from anchor to day (can be negative). */
export function calendarDaysBetween(anchor: string, day: string): number {
  const a = parseLocalDate(anchor)
  const b = parseLocalDate(day)
  return Math.round((b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000))
}
