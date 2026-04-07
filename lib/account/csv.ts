/** Escape a single CSV cell (RFC-style, comma delimiter). */
export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  const s = String(value)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export function rowsToCsv(headers: string[], rows: (string | number | boolean | null | undefined)[][]): string {
  const headerLine = headers.map(escapeCsvCell).join(',')
  const body = rows.map((row) => row.map(escapeCsvCell).join(',')).join('\r\n')
  return `\uFEFF${headerLine}\r\n${body}`
}
