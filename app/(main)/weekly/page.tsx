import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth/session'
import { listWeeklyGoals } from '@/lib/actions/goals'
import { mondayOfWeekContaining, weekDayLabels } from '@/lib/week'
import {
  buildMonthGrid,
  parseYearMonth,
  shiftYearMonth,
  parseLocalDate,
} from '@/lib/month-calendar'
import { WeeklyGoalsClient } from '@/components/weekly/WeeklyGoalsClient'
import { cn } from '@/lib/utils'

function getLocalDateString(): string {
  const now = new Date()
  return now.toISOString().slice(0, 10)
}

function formatMonthParam(y: number, m: number): string {
  return `${y}-${String(m).padStart(2, '0')}`
}

function addDays(dateStr: string, days: number): string {
  const d = parseLocalDate(dateStr)
  d.setDate(d.getDate() + days)
  const yy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

export const metadata = {
  title: '每週目標',
}

export default async function WeeklyPage({
  searchParams,
}: {
  searchParams: { week?: string; month?: string }
}) {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const calendarToday = getLocalDateString()
  const rawWeek = searchParams.week
  const weekStart =
    rawWeek && /^\d{4}-\d{2}-\d{2}$/.test(rawWeek)
      ? mondayOfWeekContaining(rawWeek)
      : mondayOfWeekContaining(calendarToday)

  const goals = await listWeeklyGoals(weekStart)
  const days = weekDayLabels(weekStart)
  const prevWeekStart = addDays(weekStart, -7)
  const nextWeekStart = addDays(weekStart, 7)

  const fallbackMonth = parseLocalDate(weekStart)
  const { year: calYear, month: calMonth } = parseYearMonth(
    searchParams.month,
    fallbackMonth,
  )
  const monthGrid = buildMonthGrid(calYear, calMonth)
  const prevCal = shiftYearMonth(calYear, calMonth, -1)
  const nextCal = shiftYearMonth(calYear, calMonth, 1)
  const weekQuery = `week=${encodeURIComponent(weekStart)}`

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-5 pb-28 pt-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight">
              每週目標
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              設定本週方向，並點選日期查看當日的今日事項。
            </p>
          </div>
          <Link
            href="/weekly/record"
            className="shrink-0 rounded-full border border-border/60 bg-card px-3 py-1.5 text-sm font-medium shadow-sm transition-colors hover:bg-muted/80"
          >
            紀錄
          </Link>
        </div>

        <div className="mt-6">
          <WeeklyGoalsClient
            weekStart={weekStart}
            goals={goals}
            prevWeekStart={prevWeekStart}
            nextWeekStart={nextWeekStart}
          />
        </div>

        <div className="mt-8">
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
            本週日期
          </h2>
          <ul
            className="grid grid-cols-7 gap-1.5 text-center"
            role="list"
          >
            {days.map(({ date, label }) => {
              const isToday = date === calendarToday
              return (
                <li key={date}>
                  <Link
                    href={`/today?date=${date}`}
                    className={cn(
                      'flex flex-col items-center rounded-xl border border-border/60 bg-card py-2.5 text-xs shadow-sm transition-colors hover:bg-muted/80',
                      isToday && 'border-primary bg-primary/10',
                    )}
                  >
                    <span className="text-[10px] font-medium text-muted-foreground">
                      週{label}
                    </span>
                    <span className="mt-1 font-display text-base font-bold tabular-nums">
                      {date.slice(8, 10)}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>

        <div className="mt-10">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-muted-foreground">
              月曆
            </h2>
            <div className="flex items-center gap-2 text-sm">
              <Link
                href={`/weekly?${weekQuery}&month=${formatMonthParam(prevCal.year, prevCal.month)}`}
                className="rounded-lg border border-border/60 px-2 py-1 text-xs font-medium hover:bg-muted/80"
              >
                上月
              </Link>
              <span className="tabular-nums text-muted-foreground">
                {calYear} 年 {calMonth} 月
              </span>
              <Link
                href={`/weekly?${weekQuery}&month=${formatMonthParam(nextCal.year, nextCal.month)}`}
                className="rounded-lg border border-border/60 px-2 py-1 text-xs font-medium hover:bg-muted/80"
              >
                下月
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-muted-foreground">
            {['一', '二', '三', '四', '五', '六', '日'].map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>
          <div className="mt-1 space-y-1">
            {monthGrid.map((row, ri) => (
              <div key={ri} className="grid grid-cols-7 gap-1">
                {row.map((cell, ci) => {
                  if (!cell.date) {
                    return (
                      <div
                        key={`pad-${ri}-${ci}`}
                        className="aspect-square rounded-lg bg-transparent"
                      />
                    )
                  }
                  const isToday = cell.date === calendarToday
                  const isFuture = cell.date > calendarToday
                  if (isFuture) {
                    return (
                      <span
                        key={cell.date}
                        className="flex aspect-square items-center justify-center rounded-lg border border-transparent text-sm font-medium tabular-nums opacity-35"
                      >
                        {cell.dayNum}
                      </span>
                    )
                  }
                  return (
                    <Link
                      key={cell.date}
                      href={`/today?date=${cell.date}`}
                      className={cn(
                        'flex aspect-square items-center justify-center rounded-lg border border-border/60 bg-card text-sm font-medium tabular-nums transition-colors hover:bg-muted/80',
                        isToday && 'border-primary bg-primary/10 font-bold',
                      )}
                    >
                      {cell.dayNum}
                    </Link>
                  )
                })}
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            點選日期可開啟當日清單。未來日期無法點選。
          </p>
        </div>
      </div>
    </main>
  )
}
