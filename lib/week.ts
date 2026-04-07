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

/** Monday-based week; ISO date for Monday of the week containing `dateStr` (local). */
export function mondayOfWeekContaining(dateStr: string): string {
  const dt = parseLocalDate(dateStr)
  const dow = dt.getDay()
  const mondayOffset = dow === 0 ? -6 : 1 - dow
  dt.setDate(dt.getDate() + mondayOffset)
  return formatLocalDate(dt)
}

/** Seven ISO dates Mon..Sun for the week containing `dateStr` (local). */
export function weekDayLabels(dateStr: string): { date: string; label: string }[] {
  const mondayStr = mondayOfWeekContaining(dateStr)
  const base = parseLocalDate(mondayStr)
  const labels = ['一', '二', '三', '四', '五', '六', '日']
  return labels.map((label, i) => {
    const x = new Date(base)
    x.setDate(base.getDate() + i)
    return {
      date: formatLocalDate(x),
      label,
    }
  })
}
