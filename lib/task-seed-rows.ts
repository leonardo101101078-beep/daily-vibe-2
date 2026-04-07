import type { TaskTemplate } from '@/types/database'

export type TemplateSeedRow = {
  id: string
  recurrence: string | null
  occurrence_date: string | null
  recurrence_weekday: number | null
  alternate_anchor_date: string | null
}

/** 由已載入的模板建立 seed 列（僅啟用中），避免再查一次 task_templates。 */
export function toSeedRowsFromTemplates(
  templates: TaskTemplate[],
): TemplateSeedRow[] {
  return templates
    .filter((t) => t.is_active)
    .map((t) => ({
      id: t.id,
      recurrence: t.recurrence,
      occurrence_date: t.occurrence_date,
      recurrence_weekday: t.recurrence_weekday,
      alternate_anchor_date: t.alternate_anchor_date,
    }))
}
