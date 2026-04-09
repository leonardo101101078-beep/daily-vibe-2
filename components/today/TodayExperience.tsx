'use client'

import { useCallback, useEffect, useState } from 'react'
import nextDynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { getOrCreateDeviceId } from '@/lib/local/device-id'
import {
  ensureSessionForUser,
  META_SESSION_ID,
  getLocalDB,
} from '@/lib/local/dexie-db'
import { mergeTemplatesFromServer } from '@/lib/local/merge-server-templates'
import { seedDailyLogsForDayLocal } from '@/lib/local/seed-day'
import { getLogsWithTemplatesForDate } from '@/lib/local/today-queries'
import {
  bootstrapFromCloudIfNeeded,
  performFullSync,
} from '@/lib/sync/sync-engine'
import { countDirtyRows } from '@/lib/local/dirty-count'
import type { WellnessFormState } from '@/lib/actions/wellness'
import {
  getWellnessForDateLocal,
  getDailyReviewTextLocal,
  upsertWellnessLocal,
  upsertDailyNoteLocal,
} from '@/lib/local/wellness-note-local'
import type { TaskTemplate } from '@/types/database'
import type { LogWithTemplate } from '@/types/database'
import { SyncStatusBar } from '@/components/today/SyncStatusBar'
import { TodayClock } from '@/components/TodayClock'
import { WellnessCard } from '@/components/WellnessCard'
import { DailyNoteCard } from '@/components/DailyNoteCard'
import { GroupedDayChecklist } from '@/components/GroupedDayChecklist'

const TemplateForm = nextDynamic(
  () =>
    import('@/components/TemplateForm').then((m) => ({
      default: m.TemplateForm,
    })),
  {
    loading: () => (
      <div className="h-28 animate-pulse rounded-2xl border border-border/50 bg-muted/40" />
    ),
  },
)

const ManageTaskTemplates = nextDynamic(
  () =>
    import('@/components/ManageTaskTemplates').then((m) => ({
      default: m.ManageTaskTemplates,
    })),
  {
    loading: () => (
      <div className="h-24 animate-pulse rounded-xl border border-border/50 bg-muted/40" />
    ),
  },
)

function formatDisplayDate(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00`)
  return date.toLocaleDateString('zh-TW', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 6) return '深夜好'
  if (hour < 12) return '早安'
  if (hour < 18) return '午安'
  return '晚安'
}

type Props = {
  userId: string
  viewDate: string
  calendarToday: string
  serverTemplates: TaskTemplate[]
}

export function TodayExperience({
  userId,
  viewDate,
  calendarToday,
  serverTemplates,
}: Props) {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [initError, setInitError] = useState<string | null>(null)
  const [logs, setLogs] = useState<LogWithTemplate[]>([])
  const [wellness, setWellness] = useState<Awaited<
    ReturnType<typeof getWellnessForDateLocal>
  > | null>(null)
  const [noteText, setNoteText] = useState<string | null>(null)
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null)
  const [dirtyCount, setDirtyCount] = useState(0)
  const [conflictCount, setConflictCount] = useState(0)
  const [syncing, setSyncing] = useState(false)

  const refreshFromDexie = useCallback(async () => {
    const [nextLogs, d, c, meta, w, note] = await Promise.all([
      getLogsWithTemplatesForDate(userId, viewDate),
      countDirtyRows(),
      getLocalDB().conflicts.count(),
      getLocalDB().meta.get(META_SESSION_ID),
      getWellnessForDateLocal(userId, viewDate),
      getDailyReviewTextLocal(userId, viewDate),
    ])
    setLogs(nextLogs)
    setDirtyCount(d)
    setConflictCount(c)
    setLastSyncAt(meta?.lastSyncAt ?? null)
    setWellness(w)
    setNoteText(note)
  }, [userId, viewDate])

  useEffect(() => {
    let cancelled = false
    async function boot() {
      setInitError(null)
      try {
        const deviceId = getOrCreateDeviceId()
        await ensureSessionForUser(userId, deviceId)
        await bootstrapFromCloudIfNeeded(userId)
        await mergeTemplatesFromServer(serverTemplates)
        await seedDailyLogsForDayLocal(userId, viewDate, calendarToday)
        if (cancelled) return
        await refreshFromDexie()
        if (!cancelled) setReady(true)
      } catch (e) {
        if (!cancelled) {
          setInitError(e instanceof Error ? e.message : String(e))
        }
      }
    }
    void boot()
    return () => {
      cancelled = true
    }
    // refreshFromDexie is stable via useCallback; omit to avoid re-bootstrap noise
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, viewDate, calendarToday, serverTemplates])

  const handleSync = useCallback(async () => {
    setSyncing(true)
    try {
      const r = await performFullSync(userId)
      if (!r.ok && r.error) {
        setInitError(r.error)
      }
      await refreshFromDexie()
      router.refresh()
    } finally {
      setSyncing(false)
    }
  }, [userId, refreshFromDexie, router])

  const persistWellnessThenSync = useCallback(
    async (payload: WellnessFormState) => {
      await upsertWellnessLocal(userId, viewDate, payload)
      await refreshFromDexie()
      setSyncing(true)
      setInitError(null)
      try {
        const r = await performFullSync(userId)
        if (!r.ok && r.error) setInitError(r.error)
        await refreshFromDexie()
        router.refresh()
      } finally {
        setSyncing(false)
      }
    },
    [userId, viewDate, refreshFromDexie, router],
  )

  const persistDailyNoteThenSync = useCallback(
    async (text: string) => {
      await upsertDailyNoteLocal(userId, viewDate, text)
      await refreshFromDexie()
      setSyncing(true)
      setInitError(null)
      try {
        const r = await performFullSync(userId)
        if (!r.ok && r.error) setInitError(r.error)
        await refreshFromDexie()
        router.refresh()
      } finally {
        setSyncing(false)
      }
    },
    [userId, viewDate, refreshFromDexie, router],
  )

  const taskCount = logs.length
  const isViewingOtherDay = viewDate !== calendarToday

  if (initError && !ready) {
    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto max-w-md px-5 py-16 text-center text-sm text-destructive">
          <p>{initError}</p>
          <p className="mt-4 text-muted-foreground">
            請確認已套用 Supabase migration 007，且已登入網路。
          </p>
        </div>
      </main>
    )
  }

  if (!ready) {
    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto max-w-md px-5 py-16 text-center text-sm text-muted-foreground">
          載入本機資料與同步…
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-md">
        <header className="px-5 pb-4 pt-10">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            {formatDisplayDate(viewDate)}
          </p>
          <h1 className="font-display mt-3 text-[1.75rem] font-extrabold leading-tight tracking-tight text-foreground sm:text-4xl">
            今日事項
            <span className="text-muted-foreground">（{taskCount}）</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {getGreeting()}，今天繼續加油
          </p>
          {isViewingOtherDay && (
            <p className="mt-2 rounded-xl bg-muted/80 px-3 py-2 text-xs text-muted-foreground">
              正在檢視：{viewDate}（今日為 {calendarToday}）
            </p>
          )}
        </header>

        <div className="px-5 pb-4">
          <SyncStatusBar
            lastSyncAt={lastSyncAt}
            pendingLabel={
              dirtyCount > 0 ? `本機待上傳 ${dirtyCount} 筆` : undefined
            }
            conflictCount={conflictCount}
            syncing={syncing}
            onSync={handleSync}
          />
        </div>

        <div className="grid grid-cols-2 gap-3 px-5 pb-4">
          <div
            className="motion-bento-in flex flex-col justify-between rounded-2xl border border-border/50 bg-bento-mint/90 p-4 shadow-sm [animation-delay:0ms]"
            style={{ animationDelay: '0ms' }}
          >
            <TodayClock />
            <span className="mt-2 text-[11px] font-medium text-muted-foreground">
              本地時間
            </span>
          </div>
          <div
            className="motion-bento-in flex flex-col justify-center rounded-2xl border border-border/50 bg-bento-sky/90 p-4 shadow-sm"
            style={{ animationDelay: '70ms' }}
          >
            <p className="font-display text-2xl font-bold tabular-nums leading-none text-foreground">
              {taskCount > 0
                ? Math.round(
                    (logs.filter((l) => l.status === 'completed').length /
                      taskCount) *
                      100,
                  )
                : 0}
              <span className="text-lg font-semibold text-muted-foreground">
                %
              </span>
            </p>
            <span className="mt-2 text-[11px] font-medium text-muted-foreground">
              今日完成度
            </span>
          </div>
        </div>

        <div
          className="motion-bento-in px-5 pb-4"
          style={{ animationDelay: '140ms' }}
        >
          <WellnessCard
            date={viewDate}
            initial={wellness}
            persistOverride={persistWellnessThenSync}
          />
        </div>

        <div
          className="motion-bento-in px-5"
          style={{ animationDelay: '210ms' }}
        >
          <div className="overflow-hidden rounded-2xl border border-border/50 bg-card/90 shadow-sm backdrop-blur-sm">
            <GroupedDayChecklist
              key={viewDate}
              initialLogs={logs}
              localFirst
              onLocalLogPersist={refreshFromDexie}
            />
          </div>
        </div>

        <div
          className="motion-bento-in space-y-4 px-5 pb-4 pt-5"
          style={{ animationDelay: '260ms' }}
        >
          <DailyNoteCard
            date={viewDate}
            initialText={noteText}
            persistOverride={persistDailyNoteThenSync}
          />
        </div>

        <div
          className="motion-bento-in space-y-4 px-5 pb-6"
          style={{ animationDelay: '300ms' }}
        >
          <TemplateForm variant="card" minOccurrenceDate={calendarToday} />
          <ManageTaskTemplates templates={serverTemplates} />
        </div>
      </div>
    </main>
  )
}
