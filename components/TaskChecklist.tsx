'use client'

import { useOptimistic } from 'react'
import Link from 'next/link'
import { ClipboardList, Plus } from 'lucide-react'
import { AppIcon } from '@/components/AppIcon'
import { Button } from '@/components/ui/button'
import { DailyProgress } from '@/components/DailyProgress'
import { TaskItem } from '@/components/TaskItem'
import { updateLogStatus, updateLogNote } from '@/lib/actions/daily-logs'
import type { LogWithTemplate, TaskStatus } from '@/types/database'

interface TaskChecklistProps {
  initialLogs: LogWithTemplate[]
}

export function TaskChecklist({ initialLogs }: TaskChecklistProps) {
  // Optimistic state: sync UI first, then persist in background
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

  const completed = logs.filter((l) => l.status === 'completed').length

  const handleToggle = (logId: string, currentStatus: TaskStatus) => {
    const next: TaskStatus =
      currentStatus === 'completed' ? 'pending' : 'completed'

    applyOptimistic({ id: logId, status: next })
    void (async () => {
      try {
        await updateLogStatus(logId, next)
      } catch {
        applyOptimistic({ id: logId, status: currentStatus })
      }
    })()
  }

  const handleNoteChange = (logId: string, note: string) => {
    const previousNote = logs.find((l) => l.id === logId)?.note ?? ''
    applyOptimistic({ id: logId, note })
    void (async () => {
      try {
        await updateLogNote(logId, note)
      } catch {
        applyOptimistic({ id: logId, note: previousNote })
      }
    })()
  }

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-5 py-20 text-center">
        <div className="rounded-2xl bg-muted p-5">
          <AppIcon
            icon={ClipboardList}
            size="sm"
            className="h-8 w-8 text-muted-foreground"
          />
        </div>
        <p className="mt-4 text-sm font-medium">今天還沒有任何任務</p>
        <p className="mt-1 text-xs text-muted-foreground">
          新增任務模板後，每天開啟 App 就會自動生成今日清單。
        </p>
        <Button asChild className="mt-6">
          <Link href="/today#add-task">
            <AppIcon icon={Plus} size="sm" />
            新增任務模板
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div>
      {/* Sticky progress bar */}
      <DailyProgress completed={completed} total={logs.length} />

      {/* Task list */}
      <ul className="space-y-2.5 px-5 py-4" role="list">
        {logs.map((log) => (
          <li key={log.id}>
            <TaskItem
              log={log}
              onToggle={handleToggle}
              onNoteChange={handleNoteChange}
            />
          </li>
        ))}
      </ul>
    </div>
  )
}
