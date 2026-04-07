'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deactivateTaskTemplate } from '@/lib/actions/task-templates'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { labelForCategory } from '@/lib/task-categories'
import type { TaskTemplate } from '@/types/database'

type Props = {
  templates: TaskTemplate[]
}

const WEEKDAY_LABELS = ['週一', '週二', '週三', '週四', '週五', '週六', '週日']

function recurrenceSubtitle(t: TaskTemplate): string {
  switch (t.recurrence) {
    case 'once':
      return t.occurrence_date ? `單次 ${t.occurrence_date}` : '單次'
    case 'daily':
      return '每日'
    case 'weekly':
      return t.recurrence_weekday != null
        ? `每週 ${WEEKDAY_LABELS[t.recurrence_weekday]}`
        : '每週'
    case 'every_other_day':
      return t.alternate_anchor_date
        ? `隔日（起 ${t.alternate_anchor_date}）`
        : '隔日'
    default:
      return '循環'
  }
}

export function ManageTaskTemplates({ templates }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const active = templates.filter((t) => t.is_active)

  if (active.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">已建立的任務</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          停用後不會再自動出現在未來日期；過去紀錄仍會保留。
        </p>
        <ul className="space-y-2" role="list">
          {active.map((t) => (
            <li
              key={t.id}
              className="flex items-start justify-between gap-3 rounded-xl border border-border/60 bg-muted/30 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium leading-snug">{t.title}</p>
                <p className="text-[11px] text-muted-foreground">
                  {labelForCategory(t.category)} · {recurrenceSubtitle(t)}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                disabled={isPending}
                onClick={() => {
                  if (!confirm(`確定停用「${t.title}」？`)) return
                  startTransition(async () => {
                    await deactivateTaskTemplate(t.id)
                    router.refresh()
                  })
                }}
              >
                刪除任務
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
