import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth/session'
import { getTaskTemplates } from '@/lib/actions/task-templates'
import { TodayExperience } from '@/components/today/TodayExperience'

function getLocalDateString(): string {
  const now = new Date()
  return now.toISOString().slice(0, 10)
}

function parseViewDate(raw: string | undefined, fallback: string): string {
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return fallback
  return raw
}

export const metadata = {
  title: '今日事項',
}

export const dynamic = 'force-dynamic'

function TodayLoading() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-5 py-16 text-center text-sm text-muted-foreground">
        載入中…
      </div>
    </main>
  )
}

export default function TodayPage({
  searchParams,
}: {
  searchParams: { date?: string }
}) {
  return (
    <Suspense fallback={<TodayLoading />}>
      <TodayPageContent searchParams={searchParams} />
    </Suspense>
  )
}

async function TodayPageContent({
  searchParams,
}: {
  searchParams: { date?: string }
}) {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const calendarToday = getLocalDateString()
  const viewDate = parseViewDate(searchParams.date, calendarToday)

  const templates = await getTaskTemplates()

  return (
    <TodayExperience
      userId={user.id}
      viewDate={viewDate}
      calendarToday={calendarToday}
      serverTemplates={templates}
    />
  )
}
