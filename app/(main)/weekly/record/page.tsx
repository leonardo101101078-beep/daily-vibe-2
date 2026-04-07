import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth/session'
import { getDayCompletionStats } from '@/lib/actions/daily-logs'
import { WeeklyRecordClient } from '@/components/weekly/WeeklyRecordClient'

function todayLocal(): string {
  return new Date().toISOString().slice(0, 10)
}

export const metadata = {
  title: '紀錄',
}

export default async function WeeklyRecordPage({
  searchParams,
}: {
  searchParams: { date?: string }
}) {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const cap = todayLocal()
  const raw = searchParams.date
  const day =
    raw && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : cap
  const effective = day > cap ? cap : day

  const stats = await getDayCompletionStats(user.id, effective)

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-5 pb-28 pt-8">
        <Link
          href="/weekly"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← 每週目標
        </Link>
        <h1 className="mt-4 font-display text-2xl font-extrabold tracking-tight">
          紀錄
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          選擇過去的日期，查看當日任務完成度。
        </p>

        <div className="mt-8">
          <WeeklyRecordClient
            initialDate={effective}
            maxDate={cap}
            completed={stats.completed}
            total={stats.total}
          />
        </div>
      </div>
    </main>
  )
}
