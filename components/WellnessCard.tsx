'use client'

import { useState, useTransition } from 'react'
import { Activity, Scale, UtensilsCrossed } from 'lucide-react'
import { AppIcon } from '@/components/AppIcon'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { upsertWellness, type WellnessFormState } from '@/lib/actions/wellness'

interface WellnessCardProps {
  date: string
  initial: WellnessFormState | null
  /** IndexedDB-first persistence (Daily-Vibe 2.0). When set, server action is skipped. */
  persistOverride?: (payload: WellnessFormState) => Promise<void>
}

export function WellnessCard({
  date,
  initial,
  persistOverride,
}: WellnessCardProps) {
  const [weight, setWeight] = useState(
    initial?.weight != null ? String(initial.weight) : '',
  )
  const [dietNote, setDietNote] = useState(initial?.diet_note ?? '')
  const [exerciseDone, setExerciseDone] = useState(
    initial?.exercise_done ?? false,
  )
  const [exerciseNote, setExerciseNote] = useState(
    initial?.exercise_note ?? '',
  )
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  const persist = (next?: Partial<WellnessFormState>) => {
    setError('')
    const w =
      next?.weight !== undefined
        ? next.weight
        : weight.trim() === ''
          ? null
          : Number(weight)
    if (w != null && (Number.isNaN(w) || w < 0)) {
      setError('體重請填有效數字')
      return
    }
    const payload: WellnessFormState = {
      weight: next?.weight !== undefined ? next.weight : w,
      diet_note: next?.diet_note ?? dietNote,
      exercise_done: next?.exercise_done ?? exerciseDone,
      exercise_note: next?.exercise_note ?? exerciseNote,
    }

    startTransition(async () => {
      try {
        if (persistOverride) {
          await persistOverride(payload)
        } else {
          await upsertWellness(date, payload)
        }
        setSaved(true)
        setTimeout(() => setSaved(false), 1500)
      } catch (e) {
        setError(e instanceof Error ? e.message : '儲存失敗')
      }
    })
  }

  return (
    <section className="rounded-2xl border border-border/50 bg-bento-peach/80 px-4 py-4 shadow-sm transition-shadow duration-200 hover:shadow-md">
      <div className="mb-3 flex items-center gap-2">
        <AppIcon icon={Activity} size="sm" className="text-primary" />
        <h2 className="text-sm font-semibold">健康管理</h2>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="wellness-weight" className="flex items-center gap-1.5 text-xs">
            <AppIcon
              icon={Scale}
              size="sm"
              className="h-3.5 w-3.5"
            />
            今日體重（kg）
          </Label>
          <Input
            id="wellness-weight"
            type="number"
            step="0.1"
            min="0"
            placeholder="選填"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            onBlur={() => persist()}
            className="h-9"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="wellness-diet" className="flex items-center gap-1.5 text-xs">
            <AppIcon
              icon={UtensilsCrossed}
              size="sm"
              className="h-3.5 w-3.5"
            />
            飲食記錄
          </Label>
          <Textarea
            id="wellness-diet"
            placeholder="吃了什麼、份量…"
            value={dietNote}
            onChange={(e) => setDietNote(e.target.value)}
            onBlur={() => persist()}
            rows={2}
            className="min-h-0 text-sm"
          />
        </div>

        <div className="flex items-start gap-3">
          <Checkbox
            id="wellness-ex"
            checked={exerciseDone}
            onCheckedChange={(v) => {
              const done = v === true
              setExerciseDone(done)
              const w =
                weight.trim() === '' ? null : Number(weight)
              startTransition(async () => {
                try {
                  const p = {
                    weight: w != null && !Number.isNaN(w) ? w : null,
                    diet_note: dietNote,
                    exercise_done: done,
                    exercise_note: exerciseNote,
                  }
                  if (persistOverride) {
                    await persistOverride(p)
                  } else {
                    await upsertWellness(date, p)
                  }
                } catch {
                  /* optional: toast */
                }
              })
            }}
            className="mt-0.5"
          />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Label htmlFor="wellness-ex" className="text-sm font-normal">
              今天有運動
            </Label>
            <Textarea
              placeholder="運動內容、時長…"
              value={exerciseNote}
              onChange={(e) => setExerciseNote(e.target.value)}
              onBlur={() => persist()}
              rows={2}
              className="min-h-0 text-sm"
            />
          </div>
        </div>
      </div>

      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
      {saved && !error && (
        <p className="mt-2 text-xs text-muted-foreground">已儲存</p>
      )}
      {isPending && (
        <p className="mt-2 text-xs text-muted-foreground">儲存中…</p>
      )}
    </section>
  )
}
