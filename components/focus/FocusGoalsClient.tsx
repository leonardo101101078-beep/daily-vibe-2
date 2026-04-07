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
  addAnnualGoal,
  addMonthlyGoal,
  deleteAnnualGoal,
  deleteMonthlyGoal,
  reorderAnnualGoals,
  reorderMonthlyGoals,
} from '@/lib/actions/goals'
import { useLongPress } from '@/lib/hooks/use-long-press'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { AnnualGoalRow, MonthlyGoalRow } from '@/types/database'

type Props = {
  annualGoals: AnnualGoalRow[]
  monthlyGoals: MonthlyGoalRow[]
  year: number
  month: number
}

function shiftMonth(y: number, m: number, delta: number): { year: number; month: number } {
  let mm = m + delta
  let yy = y
  while (mm < 1) {
    mm += 12
    yy -= 1
  }
  while (mm > 12) {
    mm -= 12
    yy += 1
  }
  return { year: yy, month: mm }
}

function SortableGoalRow({
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
      data-goal-id={id}
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
      <span
        className="min-w-0 flex-1 select-none"
        {...longPress}
      >
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
            if (!confirm('刪除此項目？')) return
            onDelete()
          }}
        >
          刪除
        </Button>
      ) : null}
    </li>
  )
}

export function FocusGoalsClient({
  annualGoals,
  monthlyGoals,
  year,
  month,
}: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [annualTitle, setAnnualTitle] = useState('')
  const [monthlyTitle, setMonthlyTitle] = useState('')
  const [annualItems, setAnnualItems] = useState(annualGoals)
  const [monthlyItems, setMonthlyItems] = useState(monthlyGoals)
  const [deleteRevealId, setDeleteRevealId] = useState<string | null>(null)

  useEffect(() => {
    setAnnualItems(annualGoals)
  }, [annualGoals])

  useEffect(() => {
    setMonthlyItems(monthlyGoals)
  }, [monthlyGoals])

  useEffect(() => {
    if (deleteRevealId == null) return
    const down = (e: PointerEvent) => {
      const row = document.querySelector(`[data-goal-id="${deleteRevealId}"]`)
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

  const onAnnualDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const oldIndex = annualItems.findIndex((g) => g.id === active.id)
    const newIndex = annualItems.findIndex((g) => g.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    const next = arrayMove(annualItems, oldIndex, newIndex)
    setAnnualItems(next)
    const ids = next.map((g) => g.id)
    startTransition(async () => {
      await reorderAnnualGoals(ids)
      refresh()
    })
  }

  const onMonthlyDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const oldIndex = monthlyItems.findIndex((g) => g.id === active.id)
    const newIndex = monthlyItems.findIndex((g) => g.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    const next = arrayMove(monthlyItems, oldIndex, newIndex)
    setMonthlyItems(next)
    const ids = next.map((g) => g.id)
    startTransition(async () => {
      await reorderMonthlyGoals(year, month, ids)
      refresh()
    })
  }

  const prev = shiftMonth(year, month, -1)
  const next = shiftMonth(year, month, 1)

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          目前目標
        </h2>
        <div className="rounded-2xl border border-primary/25 bg-primary/5 p-5 shadow-sm">
          <div className="space-y-4">
            <div>
              <h3 className="font-display text-lg font-bold">年度目標</h3>
              {annualItems.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">尚無年度目標</p>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={onAnnualDragEnd}
                >
                  <SortableContext
                    items={annualItems.map((g) => g.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <ul className="mt-3 space-y-2" role="list">
                      {annualItems.map((g) => (
                        <SortableGoalRow
                          key={g.id}
                          id={g.id}
                          title={g.title}
                          showDelete={deleteRevealId === g.id}
                          onRevealDelete={() => setDeleteRevealId(g.id)}
                          disabled={pending}
                          onDelete={() => {
                            startTransition(async () => {
                              await deleteAnnualGoal(g.id)
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
            </div>
            <div className="border-t border-border/40 pt-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-display text-lg font-bold">月度重點</h3>
                <div className="flex items-center gap-2 text-sm">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/focus?year=${prev.year}&month=${prev.month}`}>
                      上月
                    </Link>
                  </Button>
                  <span className="tabular-nums text-muted-foreground">
                    {year} 年 {month} 月
                  </span>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/focus?year=${next.year}&month=${next.month}`}>
                      下月
                    </Link>
                  </Button>
                </div>
              </div>
              {monthlyItems.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">本月尚無重點</p>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={onMonthlyDragEnd}
                >
                  <SortableContext
                    items={monthlyItems.map((g) => g.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <ul className="mt-3 space-y-2" role="list">
                      {monthlyItems.map((g) => (
                        <SortableGoalRow
                          key={g.id}
                          id={g.id}
                          title={g.title}
                          showDelete={deleteRevealId === g.id}
                          onRevealDelete={() => setDeleteRevealId(g.id)}
                          disabled={pending}
                          onDelete={() => {
                            startTransition(async () => {
                              await deleteMonthlyGoal(g.id)
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
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          新增目標
        </h2>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">年度目標</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                const t = annualTitle.trim()
                if (!t) return
                startTransition(async () => {
                  await addAnnualGoal(t)
                  setAnnualTitle('')
                  refresh()
                })
              }}
            >
              <Input
                value={annualTitle}
                onChange={(e) => setAnnualTitle(e.target.value)}
                placeholder="新增年度目標…"
                disabled={pending}
              />
              <Button type="submit" disabled={pending}>
                新增
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">月度重點</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                const t = monthlyTitle.trim()
                if (!t) return
                startTransition(async () => {
                  await addMonthlyGoal(year, month, t)
                  setMonthlyTitle('')
                  refresh()
                })
              }}
            >
              <Input
                value={monthlyTitle}
                onChange={(e) => setMonthlyTitle(e.target.value)}
                placeholder="新增本月重點…"
                disabled={pending}
              />
              <Button type="submit" disabled={pending}>
                新增
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
