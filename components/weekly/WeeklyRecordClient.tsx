'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Props = {
  initialDate: string
  maxDate: string
  completed: number
  total: number
}

export function WeeklyRecordClient({
  initialDate,
  maxDate,
  completed,
  total,
}: Props) {
  const router = useRouter()
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="record-date">日期</Label>
        <Input
          key={initialDate}
          id="record-date"
          type="date"
          max={maxDate}
          defaultValue={initialDate}
          onChange={(e) => {
            const v = e.target.value
            if (!v) return
            const capped = v > maxDate ? maxDate : v
            router.push(`/weekly/record?date=${capped}`)
          }}
          className="max-w-xs rounded-xl"
        />
      </div>

      <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
        <p className="text-sm text-muted-foreground">完成度</p>
        <p className="mt-2 font-display text-3xl font-bold tabular-nums">
          {completed} / {total}
          <span className="ml-2 text-lg font-semibold text-muted-foreground">
            （{pct}%）
          </span>
        </p>
        {total === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            當日沒有排定的任務（或尚未產生日誌）。
          </p>
        ) : null}
        <Link
          href={`/today?date=${initialDate}`}
          className="mt-4 inline-flex rounded-full border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/15"
        >
          開啟當日清單
        </Link>
      </div>
    </div>
  )
}
