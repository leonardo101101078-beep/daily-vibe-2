'use client'

import {
  useOptimistic,
  useState,
  useTransition,
  type HTMLAttributes,
  type ReactNode,
} from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ClipboardList, Plus } from 'lucide-react'
import { AppIcon } from '@/components/AppIcon'
import { Button } from '@/components/ui/button'
import { DailyProgress } from '@/components/DailyProgress'
import { TaskItem } from '@/components/TaskItem'
import {
  deactivateTaskTemplate,
  reorderTaskTemplates,
  updateTaskTemplateFields,
} from '@/lib/actions/task-templates'
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

function sectionKey(log: LogWithTemplate): string {
  const c = log.task_templates?.category ?? ''
  if (c === 'reminder') return 'reminder'
  if (isMainPreset(c)) return `main:${c}`
  return 'other'
}

function getSectionLogs(
  logs: LogWithTemplate[],
  key: string,
): LogWithTemplate[] {
  if (key === 'reminder') {
    return logs.filter((l) => l.task_templates?.category === 'reminder')
  }
  if (key.startsWith('main:')) {
    const k = key.slice(5)
    return logs.filter((l) => l.task_templates?.category === k)
  }
  return logs.filter((l) => {
    const c = l.task_templates?.category ?? ''
    if (c === 'reminder') return false
    if (isMainPreset(c)) return false
    return true
  })
}

function mergeSectionOrder(
  globalTemplateIds: string[],
  sectionTemplateIds: string[],
  newSectionTemplateIds: string[],
): string[] {
  const set = new Set(sectionTemplateIds)
  let si = 0
  return globalTemplateIds.map((id) => {
    if (set.has(id)) {
      return newSectionTemplateIds[si++]
    }
    return id
  })
}

function SortableTaskRow({
  log,
  children,
}: {
  log: LogWithTemplate
  children: (dragHandleProps: HTMLAttributes<HTMLButtonElement>) => ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: log.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.88 : 1,
  }
  const dragHandleProps = { ...attributes, ...listeners }
  return (
    <li ref={setNodeRef} style={style} className="list-none">
      {children(dragHandleProps)}
    </li>
  )
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

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const handleToggle = (logId: string, currentStatus: TaskStatus) => {
    const next: TaskStatus =
      currentStatus === 'completed' ? 'pending' : 'completed'

    // Sync optimistic update so checkbox matches wellness UX (paint first, then persist).
    applyOptimistic({ id: logId, status: next })
    void (async () => {
      try {
        if (localFirst) {
          await updateLogStatusLocal(logId, next)
        } else {
          await updateLogStatus(logId, next)
        }
      } catch {
        applyOptimistic({ id: logId, status: currentStatus })
      }
    })()
  }

  const handleNoteChange = (logId: string, note: string) => {
    const previousNote =
      logs.find((l) => l.id === logId)?.note ?? ''
    applyOptimistic({ id: logId, note })
    void (async () => {
      try {
        if (localFirst) {
          await updateLogNoteLocal(logId, note)
        } else {
          await updateLogNote(logId, note)
        }
      } catch {
        applyOptimistic({ id: logId, note: previousNote })
      }
    })()
  }

  const handleDeactivateTemplate = (templateId: string) => {
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

  const handleTemplateFieldsCommit = async (
    templateId: string,
    fields: { title: string; description: string | null },
  ) => {
    await updateTaskTemplateFields(templateId, {
      title: fields.title,
      description: fields.description,
    })
    router.refresh()
  }

  const handleDragEnd = (e: DragEndEvent) => {
    if (!localFirst) return
    const { active, over } = e
    if (!over || active.id === over.id) return
    const activeLog = logs.find((l) => l.id === active.id)
    const overLog = logs.find((l) => l.id === over.id)
    if (!activeLog || !overLog) return
    const keyA = sectionKey(activeLog)
    const keyB = sectionKey(overLog)
    if (keyA !== keyB) return
    const sectionLogs = getSectionLogs(logs, keyA)
    const oldIndex = sectionLogs.findIndex((l) => l.id === active.id)
    const newIndex = sectionLogs.findIndex((l) => l.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    const moved = arrayMove(sectionLogs, oldIndex, newIndex)
    const newSectionTemplateIds = moved.map((l) => l.task_template_id)
    const globalTemplateIds = logs.map((l) => l.task_template_id)
    const sectionTemplateIds = sectionLogs.map((l) => l.task_template_id)
    const merged = mergeSectionOrder(
      globalTemplateIds,
      sectionTemplateIds,
      newSectionTemplateIds,
    )
    startTransition(async () => {
      try {
        await reorderTaskTemplates(merged)
        router.refresh()
      } catch {
        setTemplateFeedback('err')
        window.setTimeout(() => setTemplateFeedback('idle'), 5000)
      }
    })
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

  const inner = (
    <>
      <div className="px-4 pt-2">
        {templateFeedback === 'ok' ? (
          <p className="mb-2 text-xs font-medium text-primary">已刪除</p>
        ) : null}
        {templateFeedback === 'err' ? (
          <p className="mb-2 text-xs font-medium text-destructive">
            操作失敗，請檢查網路後再試
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
            {localFirst ? (
              <SortableContext
                items={reminders.map((l) => l.id)}
                strategy={verticalListSortingStrategy}
              >
                {reminders.map((log) => (
                  <SortableTaskRow key={log.id} log={log}>
                    {(dragHandleProps) => (
                      <TaskItem
                        log={log}
                        onToggle={handleToggle}
                        onNoteChange={handleNoteChange}
                        dragHandleProps={dragHandleProps}
                        onTemplateFieldsCommit={handleTemplateFieldsCommit}
                        onDeactivateTemplate={handleDeactivateTemplate}
                      />
                    )}
                  </SortableTaskRow>
                ))}
              </SortableContext>
            ) : (
              reminders.map((log) => (
                <li key={log.id}>
                  <TaskItem
                    log={log}
                    onToggle={handleToggle}
                    onNoteChange={handleNoteChange}
                  />
                </li>
              ))
            )}
          </ul>
        </section>
      )}

      {mainByCat.map(({ key, label, items }) => (
        <section key={key} className="px-4">
          <h2 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </h2>
          <ul className="space-y-2.5" role="list">
            {localFirst ? (
              <SortableContext
                items={items.map((l) => l.id)}
                strategy={verticalListSortingStrategy}
              >
                {items.map((log) => (
                  <SortableTaskRow key={log.id} log={log}>
                    {(dragHandleProps) => (
                      <TaskItem
                        log={log}
                        onToggle={handleToggle}
                        onNoteChange={handleNoteChange}
                        dragHandleProps={dragHandleProps}
                        onTemplateFieldsCommit={handleTemplateFieldsCommit}
                        onDeactivateTemplate={handleDeactivateTemplate}
                      />
                    )}
                  </SortableTaskRow>
                ))}
              </SortableContext>
            ) : (
              items.map((log) => (
                <li key={log.id}>
                  <TaskItem
                    log={log}
                    onToggle={handleToggle}
                    onNoteChange={handleNoteChange}
                  />
                </li>
              ))
            )}
          </ul>
        </section>
      ))}

      {others.length > 0 && (
        <section className="px-4">
          <h2 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            其他
          </h2>
          <ul className="space-y-2.5" role="list">
            {localFirst ? (
              <SortableContext
                items={others.map((l) => l.id)}
                strategy={verticalListSortingStrategy}
              >
                {others.map((log) => (
                  <SortableTaskRow key={log.id} log={log}>
                    {(dragHandleProps) => (
                      <TaskItem
                        log={log}
                        onToggle={handleToggle}
                        onNoteChange={handleNoteChange}
                        dragHandleProps={dragHandleProps}
                        onTemplateFieldsCommit={handleTemplateFieldsCommit}
                        onDeactivateTemplate={handleDeactivateTemplate}
                      />
                    )}
                  </SortableTaskRow>
                ))}
              </SortableContext>
            ) : (
              others.map((log) => (
                <li key={log.id}>
                  <TaskItem
                    log={log}
                    onToggle={handleToggle}
                    onNoteChange={handleNoteChange}
                  />
                </li>
              ))
            )}
          </ul>
        </section>
      )}
    </>
  )

  return (
    <div className="space-y-6 pb-4">
      {localFirst ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          {inner}
        </DndContext>
      ) : (
        inner
      )}
    </div>
  )
}
