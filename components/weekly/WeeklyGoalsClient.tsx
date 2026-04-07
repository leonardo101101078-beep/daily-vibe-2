'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { addWeeklyGoal, deleteWeeklyGoal } from '@/lib/actions/goals'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { WeeklyGoalRow } from '@/types/database'

type Props = {
  weekStart: string
  goals: WeeklyGoalRow[]
  prevWeekStart: string
  nextWeekStart: string
}

export function WeeklyGoalsClient({
  weekStart,
  goals,
  prevWeekStart,
  nextWeekStart,
}: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [title, setTitle] = useState('')

  const refresh = () => router.refresh()

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-2">
        <CardTitle className="text-lg">本週目標</CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/weekly?week=${prevWeekStart}`}>上週</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/weekly?week=${nextWeekStart}`}>下週</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">週起始（週一）：{weekStart}</p>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            const t = title.trim()
            if (!t) return
            startTransition(async () => {
              await addWeeklyGoal(weekStart, t)
              setTitle('')
              refresh()
            })
          }}
        >
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="新增本週目標…"
            disabled={pending}
          />
          <Button type="submit" disabled={pending}>
            新增
          </Button>
        </form>
        <ul className="space-y-2" role="list">
          {goals.length === 0 ? (
            <li className="text-sm text-muted-foreground">本週尚無目標</li>
          ) : (
            goals.map((g) => (
              <li
                key={g.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2 text-sm"
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
                      await deleteWeeklyGoal(g.id)
                      refresh()
                    })
                  }}
                >
                  刪除
                </Button>
              </li>
            ))
          )}
        </ul>
      </CardContent>
    </Card>
  )
}
