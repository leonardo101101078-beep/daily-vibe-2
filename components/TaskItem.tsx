'use client'

import { useState } from 'react'
import { NotebookPen, ChevronUp } from 'lucide-react'
import { AppIcon } from '@/components/AppIcon'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { labelForCategory, styleForCategory } from '@/lib/task-categories'
import type { LogWithTemplate, TaskStatus } from '@/types/database'

interface TaskItemProps {
  log: LogWithTemplate
  onToggle: (logId: string, currentStatus: TaskStatus) => void
  onNoteChange: (logId: string, note: string) => void
}

export function TaskItem({ log, onToggle, onNoteChange }: TaskItemProps) {
  const [noteOpen, setNoteOpen] = useState(!!log.note)
  const [noteValue, setNoteValue] = useState(log.note ?? '')

  const template = log.task_templates
  const isCompleted = log.status === 'completed'

  const catStyle = styleForCategory(template?.category ?? '')

  const handleNoteBlur = () => {
    const original = log.note ?? ''
    if (noteValue !== original) {
      onNoteChange(log.id, noteValue)
    }
  }

  return (
    <Card
      className={cn(
        'duration-200 motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100',
        isCompleted && 'opacity-55',
      )}
    >
      <CardContent className="px-4 py-3">
        {/* ── Main row ── */}
        <div className="flex items-start gap-3">
          <Checkbox
            checked={isCompleted}
            onCheckedChange={() => onToggle(log.id, log.status)}
            className="mt-0.5 shrink-0"
            aria-label={`Mark "${template?.title}" as ${isCompleted ? 'incomplete' : 'complete'}`}
          />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span
                className={cn(
                  'text-sm font-medium leading-snug',
                  isCompleted && 'text-muted-foreground line-through',
                )}
              >
                {template?.title ?? '(已刪除任務)'}
              </span>

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

            {template?.description && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {template.description}
              </p>
            )}
          </div>

          {/* Note toggle button */}
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

        {/* ── Expandable note ── */}
        {noteOpen && (
          <div className="mt-3 pl-8">
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
