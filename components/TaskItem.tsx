'use client'

import { useEffect, useState, type HTMLAttributes, type ReactNode } from 'react'
import { NotebookPen, ChevronUp, GripVertical } from 'lucide-react'
import { AppIcon } from '@/components/AppIcon'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useLongPress } from '@/lib/hooks/use-long-press'
import { labelForCategory, styleForCategory } from '@/lib/task-categories'
import type { LogWithTemplate, TaskStatus } from '@/types/database'

interface TaskItemProps {
  log: LogWithTemplate
  onToggle: (logId: string, currentStatus: TaskStatus) => void
  onNoteChange: (logId: string, note: string) => void
  /** Optional drag handle (e.g. from @dnd-kit useSortable). */
  dragHandleProps?: HTMLAttributes<HTMLButtonElement>
  /** When set, title/description become editable; commits on blur or Enter. */
  onTemplateFieldsCommit?: (
    templateId: string,
    fields: { title: string; description: string | null },
  ) => void | Promise<void>
  /** Long-press to reveal delete; same semantics as previous「停用」. */
  onDeactivateTemplate?: (templateId: string) => void
}

export function TaskItem({
  log,
  onToggle,
  onNoteChange,
  dragHandleProps,
  onTemplateFieldsCommit,
  onDeactivateTemplate,
}: TaskItemProps) {
  const [noteOpen, setNoteOpen] = useState(!!log.note)
  const [noteValue, setNoteValue] = useState(log.note ?? '')
  const [editingTitle, setEditingTitle] = useState(false)
  const [editingDesc, setEditingDesc] = useState(false)
  const [titleValue, setTitleValue] = useState(log.task_templates?.title ?? '')
  const [descValue, setDescValue] = useState(log.task_templates?.description ?? '')
  const [showDelete, setShowDelete] = useState(false)
  const [fieldsBusy, setFieldsBusy] = useState(false)

  const template = log.task_templates
  const isCompleted = log.status === 'completed'

  const catStyle = styleForCategory(template?.category ?? '')

  useEffect(() => {
    setTitleValue(template?.title ?? '')
    setDescValue(template?.description ?? '')
  }, [template?.title, template?.description])

  useEffect(() => {
    if (!showDelete) return
    const down = (e: PointerEvent) => {
      const row = document.querySelector(`[data-task-row="${log.id}"]`)
      if (row?.contains(e.target as Node)) return
      setShowDelete(false)
    }
    document.addEventListener('pointerdown', down)
    return () => document.removeEventListener('pointerdown', down)
  }, [showDelete, log.id])

  const longPress = useLongPress(() => {
    if (onDeactivateTemplate && template?.id) setShowDelete(true)
  })

  const handleNoteBlur = () => {
    const original = log.note ?? ''
    if (noteValue !== original) {
      onNoteChange(log.id, noteValue)
    }
  }

  const commitTitle = async () => {
    if (!template?.id || !onTemplateFieldsCommit) {
      setEditingTitle(false)
      return
    }
    const next = titleValue.trim()
    if (!next) {
      setTitleValue(template.title ?? '')
      setEditingTitle(false)
      return
    }
    const prev = (template.title ?? '').trim()
    if (next === prev) {
      setEditingTitle(false)
      return
    }
    setFieldsBusy(true)
    try {
      await onTemplateFieldsCommit(template.id, {
        title: next,
        description: template.description ?? null,
      })
      setEditingTitle(false)
    } catch {
      setTitleValue(template.title ?? '')
    } finally {
      setFieldsBusy(false)
    }
  }

  const commitDesc = async () => {
    if (!template?.id || !onTemplateFieldsCommit) {
      setEditingDesc(false)
      return
    }
    const raw = descValue.trim()
    const nextDesc = raw === '' ? null : raw
    const prev = template.description ?? null
    if (nextDesc === prev || (nextDesc === '' && prev == null)) {
      setEditingDesc(false)
      return
    }
    setFieldsBusy(true)
    try {
      await onTemplateFieldsCommit(template.id, {
        title: template.title ?? '',
        description: nextDesc,
      })
      setEditingDesc(false)
    } catch {
      setDescValue(template.description ?? '')
    } finally {
      setFieldsBusy(false)
    }
  }

  return (
    <Card
      data-task-row={log.id}
      className={cn(
        'motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100',
        isCompleted && 'opacity-55',
      )}
    >
      <CardContent className="px-4 py-3">
        <div className="flex items-start gap-2">
          {dragHandleProps ? (
            <button
              type="button"
              className="touch-none mt-0.5 shrink-0 cursor-grab rounded-md p-0.5 text-muted-foreground hover:bg-muted active:cursor-grabbing"
              aria-label="拖曳排序"
              {...dragHandleProps}
            >
              <GripVertical className="h-4 w-4" />
            </button>
          ) : null}

          <Checkbox
            checked={isCompleted}
            onCheckedChange={() => onToggle(log.id, log.status)}
            className="mt-0.5 shrink-0"
            aria-label={`Mark "${template?.title}" as ${isCompleted ? 'incomplete' : 'complete'}`}
          />

          <div className="min-w-0 flex-1" {...(onDeactivateTemplate ? longPress : {})}>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              {editingTitle && onTemplateFieldsCommit ? (
                <Input
                  value={titleValue}
                  disabled={fieldsBusy}
                  onChange={(e) => setTitleValue(e.target.value)}
                  onBlur={() => void commitTitle()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      void commitTitle()
                    }
                  }}
                  className="h-8 text-sm font-medium"
                  autoFocus
                />
              ) : onTemplateFieldsCommit ? (
                <button
                  type="button"
                  className={cn(
                    'text-left text-sm font-medium leading-snug',
                    isCompleted && 'text-muted-foreground line-through',
                    'rounded-sm hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  )}
                  onClick={() => setEditingTitle(true)}
                >
                  {template?.title ?? '(已刪除任務)'}
                </button>
              ) : (
                <span
                  className={cn(
                    'text-sm font-medium leading-snug',
                    isCompleted && 'text-muted-foreground line-through',
                  )}
                >
                  {template?.title ?? '(已刪除任務)'}
                </span>
              )}

              {template?.category && (
                <Badge
                  variant="outline"
                  className={cn(
                    'border-transparent px-1.5 py-0 text-[11px]',
                    catStyle.bg,
                    catStyle.text,
                  )}
                >
                  {labelForCategory(template.category)}
                </Badge>
              )}
            </div>

            {onTemplateFieldsCommit ? (
              editingDesc ? (
                <Textarea
                  value={descValue}
                  disabled={fieldsBusy}
                  onChange={(e) => setDescValue(e.target.value)}
                  onBlur={() => void commitDesc()}
                  className="mt-1.5 min-h-[60px] text-xs"
                  placeholder="說明（選填）"
                  autoFocus
                />
              ) : (
                <button
                  type="button"
                  className={cn(
                    'mt-0.5 block w-full rounded-sm text-left text-xs text-muted-foreground hover:bg-muted/60',
                    !template?.description && 'italic text-muted-foreground/70',
                  )}
                  onClick={() => setEditingDesc(true)}
                >
                  {template?.description?.trim()
                    ? template.description
                    : '點擊加入說明'}
                </button>
              )
            ) : template?.description ? (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {template.description}
              </p>
            ) : null}

            {showDelete && template?.id && onDeactivateTemplate ? (
              <div className="mt-2 flex items-center gap-2">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => {
                    onDeactivateTemplate(template.id)
                    setShowDelete(false)
                  }}
                >
                  刪除
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => setShowDelete(false)}
                >
                  取消
                </Button>
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => setNoteOpen((v) => !v)}
            className={cn(
              '-mr-1 shrink-0 rounded-md p-1 transition-colors',
              noteOpen
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground',
            )}
            aria-label={noteOpen ? '收起備註' : '展開備註'}
          >
            {noteOpen ? (
              <AppIcon icon={ChevronUp} size="sm" />
            ) : (
              <AppIcon icon={NotebookPen} size="sm" />
            )}
          </button>
        </div>

        {noteOpen && (
          <div
            className={cn('mt-3', dragHandleProps ? 'pl-16' : 'pl-8')}
          >
            <Textarea
              placeholder="記下此刻的想法..."
              value={noteValue}
              onChange={(e) => setNoteValue(e.target.value)}
              onBlur={handleNoteBlur}
              className="text-sm"
              rows={3}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
