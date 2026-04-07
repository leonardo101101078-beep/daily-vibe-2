'use client'

import { useState, useTransition } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { upsertDailyNote } from '@/lib/actions/daily-note'

type Props = {
  date: string
  initialText: string | null
  persistOverride?: (text: string) => Promise<void>
}

export function DailyNoteCard({ date, initialText, persistOverride }: Props) {
  const [value, setValue] = useState(initialText ?? '')
  const [isPending, startTransition] = useTransition()

  const save = () => {
    startTransition(async () => {
      if (persistOverride) {
        await persistOverride(value)
      } else {
        await upsertDailyNote(date, value)
      }
    })
  }

  return (
    <section className="rounded-2xl border border-border/50 bg-card/90 px-4 py-4 shadow-sm">
      <Label htmlFor="daily-note" className="text-sm font-semibold">
        筆記
      </Label>
      <Textarea
        id="daily-note"
        placeholder="今天想記下什麼…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        disabled={isPending}
        rows={4}
        className="mt-2 text-sm"
      />
      {isPending && (
        <p className="mt-1 text-xs text-muted-foreground">儲存中…</p>
      )}
    </section>
  )
}
