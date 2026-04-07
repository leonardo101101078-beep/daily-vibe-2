/** Local YYYY-MM-DD parsing (same semantics as lib/week.ts). */
function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function formatLocalDate(d: Date): string {
  const yy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

export type MonthGridCell = { date: string | null; dayNum: number | null }

/** First row Monday-aligned; null = padding. year/month are 1-based month. */
export function buildMonthGrid(year: number, month: number): MonthGridCell[][] {
  const first = new Date(year, month - 1, 1)
  const lastDay = new Date(year, month, 0).getDate()
  let startDow = first.getDay()
  const mondayIndex = startDow === 0 ? 6 : startDow - 1
  const cells: MonthGridCell[] = []
  for (let i = 0; i < mondayIndex; i++) {
    cells.push({ date: null, dayNum: null })
  }
  for (let d = 1; d <= lastDay; d++) {
    const dt = new Date(year, month - 1, d)
    cells.push({ date: formatLocalDate(dt), dayNum: d })
  }
  while (cells.length % 7 !== 0) {
    cells.push({ date: null, dayNum: null })
  }
  const rows: MonthGridCell[][] = []
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7))
  }
  return rows
}

export function parseYearMonth(raw: string | undefined, fallback: Date): { year: number; month: number } {
  if (!raw || !/^\d{4}-\d{2}$/.test(raw)) {
    return {
      year: fallback.getFullYear(),
      month: fallback.getMonth() + 1,
    }
  }
  const [y, m] = raw.split('-').map(Number)
  if (m < 1 || m > 12) {
    return {
      year: fallback.getFullYear(),
      month: fallback.getMonth() + 1,
    }
  }
  return { year: y, month: m }
}

export function shiftYearMonth(y: number, m: number, delta: number): { year: number; month: number } {
  let mm = m + delta
  let yy = y
  while (mm < 1) {
    mm += 12
    yy -= 1
  }
  while (mm > 12) {
    mm -= 12
    yy += 1
  }
  return { year: yy, month: mm }
}

export { parseLocalDate, formatLocalDate }
