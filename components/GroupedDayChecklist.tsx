'use client'

import { useOptimistic, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ClipboardList, Plus } from 'lucide-react'
import { AppIcon } from '@/components/AppIcon'
import { Button } from '@/components/ui/button'
import { DailyProgress } from '@/components/DailyProgress'
import { TaskItem } from '@/components/TaskItem'
import { deactivateTaskTemplate } from '@/lib/actions/task-templates'
import { updateLogStatus, updateLogNote } from '@/lib/actions/daily-logs'
import { updateLogNoteLocal, updateLogStatusLocal } from '@/lib/local/log-mutations'
import {
  MAIN_TASK_CATEGORY_ORDER,
  PRESET_CATEGORY_LABELS,
  type PresetCategoryKey,
} from '@/lib/task-categories'
import type { LogWithTemplate, TaskStatus } from '@/types/database'

interface GroupedDayChecklistProps {
  initialLogs: LogWithTemplate[]
  /** When set, writes go to IndexedDB first (Daily-Vibe 2.0 local-first). */
  localFirst?: boolean
}

function isMainPreset(cat: string): cat is PresetCategoryKey {
  return (MAIN_TASK_CATEGORY_ORDER as readonly string[]).includes(cat)
}

export function GroupedDayChecklist({
  initialLogs,
  localFirst = false,
}: GroupedDayChecklistProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [templateFeedback, setTemplateFeedback] = useState<'idle' | 'ok' | 'err'>(
    'idle',
  )

  const [logs, applyOptimistic] = useOptimistic(
    initialLogs,
    (
      state: LogWithTemplate[],
      update: { id: string; status?: TaskStatus; note?: string },
    ) =>
      state.map((log) =>
        log.id === update.id ? { ...log, ...update } : log,
      ),
  )

  const handleToggle = (logId: string, currentStatus: TaskStatus) => {
    const next: TaskStatus =
      currentStatus === 'completed' ? 'pending' : 'completed'

    startTransition(() => {
      applyOptimistic({ id: logId, status: next })
    })
    void (async () => {
      try {
        if (localFirst) {
          await updateLogStatusLocal(logId, next)
        } else {
          await updateLogStatus(logId, next)
        }
      } catch {
        startTransition(() => {
          applyOptimistic({ id: logId, status: currentStatus })
        })
      }
    })()
  }

  const handleNoteChange = (logId: string, note: string) => {
    const previousNote =
      logs.find((l) => l.id === logId)?.note ?? ''
    startTransition(() => {
      applyOptimistic({ id: logId, note })
    })
    void (async () => {
      try {
        if (localFirst) {
          await updateLogNoteLocal(logId, note)
        } else {
          await updateLogNote(logId, note)
        }
      } catch {
        startTransition(() => {
          applyOptimistic({ id: logId, note: previousNote })
        })
      }
    })()
  }

  const handleDeactivateTemplate = (templateId: string, templateTitle: string) => {
    if (
      !confirm(
        `確定停用「${templateTitle}」？停用後不會再出現在未來日期；今日紀錄仍保留。`,
      )
    ) {
      return
    }
    void (async () => {
      try {
        await deactivateTaskTemplate(templateId)
        setTemplateFeedback('ok')
        window.setTimeout(() => setTemplateFeedback('idle'), 4000)
        router.refresh()
      } catch {
        setTemplateFeedback('err')
        window.setTimeout(() => setTemplateFeedback('idle'), 5000)
      }
    })()
  }

  const reminders = logs.filter((l) => l.task_templates?.category === 'reminder')
  const mainByCat = MAIN_TASK_CATEGORY_ORDER.map((key) => ({
    key,
    label: PRESET_CATEGORY_LABELS[key],
    items: logs.filter((l) => l.task_templates?.category === key),
  })).filter((g) => g.items.length > 0)

  const others = logs.filter((l) => {
    const c = l.task_templates?.category ?? ''
    if (c === 'reminder') return false
    if (isMainPreset(c)) return false
    return true
  })

  const completed = logs.filter((l) => l.status === 'completed').length

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
        <div className="rounded-2xl bg-muted p-5">
          <AppIcon
            icon={ClipboardList}
            size="sm"
            className="h-8 w-8 text-muted-foreground"
          />
        </div>
        <p className="mt-4 text-sm font-medium">今天還沒有任何任務</p>
        <p className="mt-1 text-xs text-muted-foreground">
          到「新增任務」建立模板後，每天會自動出現在清單中。
        </p>
        <Button asChild className="mt-6">
          <Link href="/today#add-task">
            <AppIcon icon={Plus} size="sm" />
            新增任務
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-4">
      <div className="px-4 pt-2">
        {templateFeedback === 'ok' ? (
          <p className="mb-2 text-xs font-medium text-primary">已停用任務模板</p>
        ) : null}
        {templateFeedback === 'err' ? (
          <p className="mb-2 text-xs font-medium text-destructive">
            停用失敗，請檢查網路後再試
          </p>
        ) : null}
        <DailyProgress completed={completed} total={logs.length} />
      </div>

      {reminders.length > 0 && (
        <section className="px-4">
          <h2 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            提醒事項
          </h2>
          <ul className="space-y-2.5" role="list">
            {reminders.map((log) => (
              <li key={log.id}>
                <TaskItem
                  log={log}
                  onToggle={handleToggle}
                  onNoteChange={handleNoteChange}
                  onDeactivateTemplate={
                    localFirst ? handleDeactivateTemplate : undefined
                  }
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {mainByCat.map(({ key, label, items }) => (
        <section key={key} className="px-4">
          <h2 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </h2>
          <ul className="space-y-2.5" role="list">
            {items.map((log) => (
              <li key={log.id}>
                <TaskItem
                  log={log}
                  onToggle={handleToggle}
                  onNoteChange={handleNoteChange}
                  onDeactivateTemplate={
                    localFirst ? handleDeactivateTemplate : undefined
                  }
                />
              </li>
            ))}
          </ul>
        </section>
      ))}

      {others.length > 0 && (
        <section className="px-4">
          <h2 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            其他
          </h2>
          <ul className="space-y-2.5" role="list">
            {others.map((log) => (
              <li key={log.id}>
                <TaskItem
                  log={log}
                  onToggle={handleToggle}
                  onNoteChange={handleNoteChange}
                  onDeactivateTemplate={
                    localFirst ? handleDeactivateTemplate : undefined
                  }
                />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
