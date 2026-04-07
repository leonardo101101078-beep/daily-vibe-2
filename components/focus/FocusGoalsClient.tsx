'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  addAnnualGoal,
  addMonthlyGoal,
  deleteAnnualGoal,
  deleteMonthlyGoal,
} from '@/lib/actions/goals'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { AnnualGoalRow, MonthlyGoalRow } from '@/types/database'

type Props = {
  annualGoals: AnnualGoalRow[]
  monthlyGoals: MonthlyGoalRow[]
  year: number
  month: number
}

function shiftMonth(y: number, m: number, delta: number): { year: number; month: number } {
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

export function FocusGoalsClient({
  annualGoals,
  monthlyGoals,
  year,
  month,
}: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [annualTitle, setAnnualTitle] = useState('')
  const [monthlyTitle, setMonthlyTitle] = useState('')

  const prev = shiftMonth(year, month, -1)
  const next = shiftMonth(year, month, 1)

  const refresh = () => router.refresh()

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          目前目標
        </h2>
        <div className="rounded-2xl border border-primary/25 bg-primary/5 p-5 shadow-sm">
          <div className="space-y-4">
            <div>
              <h3 className="font-display text-lg font-bold">年度目標</h3>
              {annualGoals.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">尚無年度目標</p>
              ) : (
                <ul className="mt-3 space-y-2" role="list">
                  {annualGoals.map((g) => (
                    <li
                      key={g.id}
                      className="flex items-center justify-between gap-2 rounded-xl border border-border/50 bg-background/80 px-3 py-2.5 text-sm font-medium"
                    >
                      <span>{g.title}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        disabled={pending}
                        onClick={() => {
                          if (!confirm('刪除此目標？')) return
                          startTransition(async () => {
                            await deleteAnnualGoal(g.id)
                            refresh()
                          })
                        }}
                      >
                        刪除
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="border-t border-border/40 pt-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-display text-lg font-bold">月度重點</h3>
                <div className="flex items-center gap-2 text-sm">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/focus?year=${prev.year}&month=${prev.month}`}>
                      上月
                    </Link>
                  </Button>
                  <span className="tabular-nums text-muted-foreground">
                    {year} 年 {month} 月
                  </span>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/focus?year=${next.year}&month=${next.month}`}>
                      下月
                    </Link>
                  </Button>
                </div>
              </div>
              {monthlyGoals.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">本月尚無重點</p>
              ) : (
                <ul className="mt-3 space-y-2" role="list">
                  {monthlyGoals.map((g) => (
                    <li
                      key={g.id}
                      className="flex items-center justify-between gap-2 rounded-xl border border-border/50 bg-background/80 px-3 py-2.5 text-sm font-medium"
                    >
                      <span>{g.title}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        disabled={pending}
                        onClick={() => {
                          if (!confirm('刪除此重點？')) return
                          startTransition(async () => {
                            await deleteMonthlyGoal(g.id)
                            refresh()
                          })
                        }}
                      >
                        刪除
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          新增目標
        </h2>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">年度目標</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                const t = annualTitle.trim()
                if (!t) return
                startTransition(async () => {
                  await addAnnualGoal(t)
                  setAnnualTitle('')
                  refresh()
                })
              }}
            >
              <Input
                value={annualTitle}
                onChange={(e) => setAnnualTitle(e.target.value)}
                placeholder="新增年度目標…"
                disabled={pending}
              />
              <Button type="submit" disabled={pending}>
                新增
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">月度重點</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                const t = monthlyTitle.trim()
                if (!t) return
                startTransition(async () => {
                  await addMonthlyGoal(year, month, t)
                  setMonthlyTitle('')
                  refresh()
                })
              }}
            >
              <Input
                value={monthlyTitle}
                onChange={(e) => setMonthlyTitle(e.target.value)}
                placeholder="新增本月重點…"
                disabled={pending}
              />
              <Button type="submit" disabled={pending}>
                新增
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
