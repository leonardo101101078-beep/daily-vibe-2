'use client'

import { useTransition, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Plus } from 'lucide-react'
import { AppIcon } from '@/components/AppIcon'
import { createTaskTemplate } from '@/lib/actions/task-templates'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  PRESET_CATEGORY_KEYS,
  PRESET_CATEGORY_LABELS,
  type PresetCategoryKey,
} from '@/lib/task-categories'
import type { TaskRecurrence } from '@/types/database'

const PRESET_OPTIONS = PRESET_CATEGORY_KEYS.map((value) => ({
  value,
  label: PRESET_CATEGORY_LABELS[value],
}))

const WEEKDAY_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: '週一' },
  { value: 1, label: '週二' },
  { value: 2, label: '週三' },
  { value: 3, label: '週四' },
  { value: 4, label: '週五' },
  { value: 5, label: '週六' },
  { value: 6, label: '週日' },
]

function todayISODate(): string {
  return new Date().toISOString().slice(0, 10)
}

type TaskMode = 'recurring' | 'once'
type RecurringKind = 'daily' | 'weekly' | 'every_other_day'

type Props = {
  /** Min date for single-task / anchor pickers (YYYY-MM-DD), default: today UTC */
  minOccurrenceDate?: string
  variant?: 'card' | 'plain'
}

export function TemplateForm({
  minOccurrenceDate,
  variant = 'card',
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const [presetCategory, setPresetCategory] =
    useState<PresetCategoryKey>('work')
  const [taskMode, setTaskMode] = useState<TaskMode>('recurring')
  const [recurringKind, setRecurringKind] =
    useState<RecurringKind>('daily')
  const [weeklyWeekday, setWeeklyWeekday] = useState(0)
  const [occurrenceDate, setOccurrenceDate] = useState(todayISODate)
  const [alternateAnchor, setAlternateAnchor] = useState(todayISODate)

  const minDate = useMemo(
    () => minOccurrenceDate ?? todayISODate(),
    [minOccurrenceDate],
  )

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const fd = new FormData(form)
    setError('')

    let recurrence: TaskRecurrence
    let occurrenceDatePayload: string | null = null
    let recurrenceWeekday: number | null = null
    let alternateAnchorDate: string | null = null

    if (taskMode === 'once') {
      recurrence = 'once'
      occurrenceDatePayload = occurrenceDate
    } else {
      switch (recurringKind) {
        case 'daily':
          recurrence = 'daily'
          break
        case 'weekly':
          recurrence = 'weekly'
          recurrenceWeekday = weeklyWeekday
          break
        case 'every_other_day':
          recurrence = 'every_other_day'
          alternateAnchorDate = alternateAnchor
          break
        default:
          recurrence = 'daily'
      }
    }

    startTransition(async () => {
      try {
        await createTaskTemplate({
          title: fd.get('title') as string,
          description: (fd.get('description') as string) || null,
          category: presetCategory,
          recurrence,
          occurrenceDate: occurrenceDatePayload,
          recurrenceWeekday,
          alternateAnchorDate,
        })
        form.reset()
        setPresetCategory('work')
        setTaskMode('recurring')
        setRecurringKind('daily')
        setWeeklyWeekday(0)
        setOccurrenceDate(minDate)
        setAlternateAnchor(minDate)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : '建立失敗')
      }
    })
  }

  const formInner = (
    <form id="template-form" className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="title">標題</Label>
        <Input
          id="title"
          name="title"
          placeholder="要做什麼？"
          required
          maxLength={200}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">說明（選填）</Label>
        <Textarea
          id="description"
          name="description"
          placeholder="補充細節…"
          rows={2}
          className="min-h-0"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">類別</Label>
        <select
          id="category"
          value={presetCategory}
          onChange={(e) =>
            setPresetCategory(e.target.value as PresetCategoryKey)
          }
          className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {PRESET_OPTIONS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label>任務屬性</Label>
        <div className="space-y-2 rounded-lg border border-input p-3">
          <label className="flex cursor-pointer items-start gap-2 text-sm">
            <input
              type="radio"
              name="task_mode"
              checked={taskMode === 'recurring'}
              onChange={() => setTaskMode('recurring')}
              className="mt-1 text-primary"
            />
            <span>
              <span className="font-medium">循環任務</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                依頻率自動出現在清單中
              </span>
            </span>
          </label>

          {taskMode === 'recurring' && (
            <div className="space-y-2 border-t border-border/60 pt-3 pl-1">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="recurring_kind"
                  checked={recurringKind === 'daily'}
                  onChange={() => setRecurringKind('daily')}
                  className="text-primary"
                />
                每日
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="recurring_kind"
                  checked={recurringKind === 'weekly'}
                  onChange={() => setRecurringKind('weekly')}
                  className="text-primary"
                />
                每週
              </label>
              {recurringKind === 'weekly' && (
                <div className="pl-6">
                  <Label htmlFor="weekly_weekday" className="text-xs">
                    星期
                  </Label>
                  <select
                    id="weekly_weekday"
                    value={weeklyWeekday}
                    onChange={(e) =>
                      setWeeklyWeekday(Number(e.target.value))
                    }
                    className="mt-1 flex h-9 w-full max-w-xs rounded-lg border border-input bg-background px-2 text-sm"
                  >
                    {WEEKDAY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="recurring_kind"
                  checked={recurringKind === 'every_other_day'}
                  onChange={() => setRecurringKind('every_other_day')}
                  className="text-primary"
                />
                隔日
              </label>
              {recurringKind === 'every_other_day' && (
                <div className="pl-6">
                  <Label htmlFor="alternate_anchor" className="text-xs">
                    起始日（之後每隔一天出現）
                  </Label>
                  <Input
                    id="alternate_anchor"
                    type="date"
                    value={alternateAnchor}
                    min={minDate}
                    onChange={(e) => setAlternateAnchor(e.target.value)}
                    className="mt-1 h-9 max-w-xs"
                  />
                </div>
              )}
            </div>
          )}

          <label className="flex cursor-pointer items-start gap-2 text-sm">
            <input
              type="radio"
              name="task_mode"
              checked={taskMode === 'once'}
              onChange={() => setTaskMode('once')}
              className="mt-1 text-primary"
            />
            <span>
              <span className="font-medium">單一任務</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                僅在指定日期出現一次
              </span>
            </span>
          </label>
          {taskMode === 'once' && (
            <div className="pt-2">
              <Label htmlFor="occurrence_date" className="text-xs">
                指定日期
              </Label>
              <Input
                id="occurrence_date"
                type="date"
                value={occurrenceDate}
                min={minDate}
                onChange={(e) => setOccurrenceDate(e.target.value)}
                className="mt-1 h-9"
                required
              />
            </div>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? (
          <AppIcon icon={Loader2} size="md" className="animate-spin" />
        ) : (
          <AppIcon icon={Plus} size="sm" />
        )}
        {isPending ? '建立中…' : '建立任務'}
      </Button>
    </form>
  )

  if (variant === 'plain') {
    return <div id="add-task">{formInner}</div>
  }

  return (
    <Card id="add-task">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">新增任務</CardTitle>
      </CardHeader>
      <CardContent>{formInner}</CardContent>
    </Card>
  )
}
