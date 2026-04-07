import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth/session'
import { listAnnualGoals, listMonthlyGoals } from '@/lib/actions/goals'
import { FocusGoalsClient } from '@/components/focus/FocusGoalsClient'

export const metadata = {
  title: '重點任務',
}

export default async function FocusPage({
  searchParams,
}: {
  searchParams: { year?: string; month?: string }
}) {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const now = new Date()
  const year = Number(searchParams.year) || now.getFullYear()
  const month = Math.min(
    12,
    Math.max(1, Number(searchParams.month) || now.getMonth() + 1),
  )

  const [annualGoals, monthlyGoals] = await Promise.all([
    listAnnualGoals(),
    listMonthlyGoals(year, month),
  ])

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-5 pb-28 pt-10">
        <h1 className="font-display text-2xl font-extrabold tracking-tight">
          重點任務
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          年度目標與月度重點，協助對齊長期方向。
        </p>
        <div className="mt-8">
          <FocusGoalsClient
            annualGoals={annualGoals}
            monthlyGoals={monthlyGoals}
            year={year}
            month={month}
          />
        </div>
      </div>
    </main>
  )
}
