'use client'

import { useEffect, useState, useTransition } from 'react'
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
import { GripVertical } from 'lucide-react'
import {
  addWeeklyGoal,
  deleteWeeklyGoal,
  reorderWeeklyGoals,
} from '@/lib/actions/goals'
import { useLongPress } from '@/lib/hooks/use-long-press'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { WeeklyGoalRow } from '@/types/database'

const GOAL_HEADER_CLASS =
  'border-b border-rose-100 bg-rose-50 px-6 pb-4 pt-6 sm:px-6'

type Props = {
  weekStart: string
  goals: WeeklyGoalRow[]
  prevWeekStart: string
  nextWeekStart: string
}

function SortableWeeklyRow({
  id,
  title,
  showDelete,
  onRevealDelete,
  onDelete,
  disabled,
}: {
  id: string
  title: string
  showDelete: boolean
  onRevealDelete: () => void
  onDelete: () => void
  disabled: boolean
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.88 : 1,
  }

  const longPress = useLongPress(onRevealDelete)

  return (
    <li
      ref={setNodeRef}
      style={style}
      data-weekly-goal-id={id}
      className="flex items-center gap-2 rounded-xl border border-border/50 bg-background/80 px-2 py-2 text-sm font-medium"
    >
      <button
        type="button"
        className="touch-none shrink-0 cursor-grab rounded-md p-1 text-muted-foreground hover:bg-muted active:cursor-grabbing"
        aria-label="拖曳排序"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="min-w-0 flex-1 select-none" {...longPress}>
        {title}
      </span>
      {showDelete ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="shrink-0 text-destructive"
          disabled={disabled}
          onClick={() => {
            if (!confirm('刪除此目標？')) return
            onDelete()
          }}
        >
          刪除
        </Button>
      ) : null}
    </li>
  )
}

export function WeeklyGoalsClient({
  weekStart,
  goals,
  prevWeekStart,
  nextWeekStart,
}: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [title, setTitle] = useState('')
  const [weeklyItems, setWeeklyItems] = useState(goals)
  const [deleteRevealId, setDeleteRevealId] = useState<string | null>(null)

  useEffect(() => {
    setWeeklyItems(goals)
  }, [goals])

  useEffect(() => {
    if (deleteRevealId == null) return
    const down = (e: PointerEvent) => {
      const row = document.querySelector(
        `[data-weekly-goal-id="${deleteRevealId}"]`,
      )
      if (row?.contains(e.target as Node)) return
      setDeleteRevealId(null)
    }
    document.addEventListener('pointerdown', down)
    return () => document.removeEventListener('pointerdown', down)
  }, [deleteRevealId])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const refresh = () => router.refresh()

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const oldIndex = weeklyItems.findIndex((g) => g.id === active.id)
    const newIndex = weeklyItems.findIndex((g) => g.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    const next = arrayMove(weeklyItems, oldIndex, newIndex)
    setWeeklyItems(next)
    const ids = next.map((g) => g.id)
    startTransition(async () => {
      await reorderWeeklyGoals(weekStart, ids)
      refresh()
    })
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader
        className={`flex flex-row flex-wrap items-center justify-between gap-2 ${GOAL_HEADER_CLASS}`}
      >
        <CardTitle className="text-lg">本週目標</CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/weekly?week=${prevWeekStart}`}>上週</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/weekly?week=${nextWeekStart}`}>下週</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 px-6 pb-6 pt-4">
        <p className="text-xs text-muted-foreground">週起始（週一）：{weekStart}</p>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            const t = title.trim()
            if (!t) return
            startTransition(async () => {
              await addWeeklyGoal(weekStart, t)
              setTitle('')
              refresh()
            })
          }}
        >
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="新增本週目標…"
            disabled={pending}
          />
          <Button type="submit" disabled={pending}>
            新增
          </Button>
        </form>
        {weeklyItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">本週尚無目標</p>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onDragEnd}
          >
            <SortableContext
              items={weeklyItems.map((g) => g.id)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="space-y-2" role="list">
                {weeklyItems.map((g) => (
                  <SortableWeeklyRow
                    key={g.id}
                    id={g.id}
                    title={g.title}
                    showDelete={deleteRevealId === g.id}
                    onRevealDelete={() => setDeleteRevealId(g.id)}
                    disabled={pending}
                    onDelete={() => {
                      startTransition(async () => {
                        await deleteWeeklyGoal(g.id)
                        setDeleteRevealId(null)
                        refresh()
                      })
                    }}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </CardContent>
    </Card>
  )
}
