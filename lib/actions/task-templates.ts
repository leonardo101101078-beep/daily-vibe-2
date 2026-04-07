'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/session'
import type { TaskRecurrence, TaskTemplate } from '@/types/database'
import { isPresetCategory } from '@/lib/task-categories'

const REVALIDATE = ['/', '/today', '/templates', '/weekly', '/focus'] as const

/** 與 TaskTemplate 一致之欄位，避免 select * 難以追蹤。 */
const TASK_TEMPLATE_SELECT =
  'id, user_id, title, description, category, icon, color, sort_order, is_active, target_value, unit, recurrence, occurrence_date, recurrence_weekday, alternate_anchor_date, sync_revision, created_at, updated_at'

export interface CreateTaskTemplateInput {
  title: string
  description?: string | null
  category: string
  recurrence: TaskRecurrence
  occurrenceDate?: string | null
  /** 0=Mon .. 6=Sun when recurrence === 'weekly' */
  recurrenceWeekday?: number | null
  /** ISO date anchor when recurrence === 'every_other_day' */
  alternateAnchorDate?: string | null
}

export async function getTaskTemplates(): Promise<TaskTemplate[]> {
  const user = await getSessionUser()
  if (!user) return []

  const supabase = createClient()
  const { data, error } = await supabase
    .from('task_templates')
    .select(TASK_TEMPLATE_SELECT)
    .eq('user_id', user.id)
    .order('sort_order', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => {
    const r = row as TaskTemplate
    return {
      ...r,
      recurrence: r.recurrence ?? 'daily',
      occurrence_date: r.occurrence_date ?? null,
      recurrence_weekday: r.recurrence_weekday ?? null,
      alternate_anchor_date: r.alternate_anchor_date ?? null,
    }
  })
}

/** Active templates only (for pickers / today management UI) */
export async function getActiveTaskTemplates(): Promise<TaskTemplate[]> {
  const all = await getTaskTemplates()
  return all.filter((t) => t.is_active)
}

function normalizeCategory(category: string): string {
  const raw = category?.trim() ?? ''
  if (!isPresetCategory(raw)) throw new Error('請選擇有效類別')
  return raw
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export async function createTaskTemplate(
  input: CreateTaskTemplateInput,
): Promise<void> {
  const user = await getSessionUser()
  if (!user) throw new Error('Not authenticated')

  const supabase = createClient()

  const title = input.title?.trim()
  if (!title) throw new Error('標題為必填')

  const category = normalizeCategory(input.category)

  const recurrence = input.recurrence
  const allowed: TaskRecurrence[] = [
    'daily',
    'once',
    'weekly',
    'every_other_day',
  ]
  if (!allowed.includes(recurrence)) {
    throw new Error('無效的任務類型')
  }

  let occurrenceDate: string | null = null
  let recurrenceWeekday: number | null = null
  let alternateAnchorDate: string | null = null

  if (recurrence === 'once') {
    const d = input.occurrenceDate?.trim()
    if (!d || !ISO_DATE.test(d)) {
      throw new Error('單一任務請選擇日期')
    }
    occurrenceDate = d
  } else if (recurrence === 'weekly') {
    const w = input.recurrenceWeekday
    if (w == null || w < 0 || w > 6 || !Number.isInteger(w)) {
      throw new Error('每週任務請選擇星期')
    }
    recurrenceWeekday = w
  } else if (recurrence === 'every_other_day') {
    const a = input.alternateAnchorDate?.trim()
    if (!a || !ISO_DATE.test(a)) {
      throw new Error('隔日任務請選擇起始日期')
    }
    alternateAnchorDate = a
  }

  const { data: last } = await supabase
    .from('task_templates')
    .select('sort_order')
    .eq('user_id', user.id)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const sortOrder = (last?.sort_order ?? -1) + 1

  const { error } = await supabase.from('task_templates').insert({
    user_id: user.id,
    title,
    description: input.description?.trim() || null,
    category,
    sort_order: sortOrder,
    is_active: true,
    target_value: null,
    unit: null,
    icon: null,
    color: null,
    recurrence,
    occurrence_date: occurrenceDate,
    recurrence_weekday: recurrenceWeekday,
    alternate_anchor_date: alternateAnchorDate,
  })

  if (error) throw new Error(error.message)

  for (const p of REVALIDATE) revalidatePath(p)
}

export async function deactivateTaskTemplate(templateId: string): Promise<void> {
  const user = await getSessionUser()
  if (!user) throw new Error('Not authenticated')

  const supabase = createClient()

  const { error } = await supabase
    .from('task_templates')
    .update({ is_active: false })
    .eq('id', templateId)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)

  for (const p of REVALIDATE) revalidatePath(p)
}

/** Reassigns `sort_order` to 0..n-1 for every active template; `orderedTemplateIds` must be a permutation of those ids. */
export async function reorderTaskTemplates(
  orderedTemplateIds: string[],
): Promise<void> {
  const user = await getSessionUser()
  if (!user) throw new Error('Not authenticated')

  const supabase = createClient()
  const { data: rows, error: fetchErr } = await supabase
    .from('task_templates')
    .select('id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (fetchErr) throw new Error(fetchErr.message)

  const expected = new Set((rows ?? []).map((r) => r.id as string))
  if (orderedTemplateIds.length !== expected.size) {
    throw new Error('排序內容無效')
  }
  for (const id of orderedTemplateIds) {
    if (!expected.has(id)) throw new Error('排序內容無效')
  }

  for (let i = 0; i < orderedTemplateIds.length; i++) {
    const { error } = await supabase
      .from('task_templates')
      .update({ sort_order: i })
      .eq('id', orderedTemplateIds[i])
      .eq('user_id', user.id)

    if (error) throw new Error(error.message)
  }

  for (const p of REVALIDATE) revalidatePath(p)
}

export async function updateTaskTemplateFields(
  templateId: string,
  input: { title?: string; description?: string | null },
): Promise<void> {
  const user = await getSessionUser()
  if (!user) throw new Error('Not authenticated')

  const supabase = createClient()
  const { data: row, error: fetchErr } = await supabase
    .from('task_templates')
    .select('id')
    .eq('id', templateId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (fetchErr) throw new Error(fetchErr.message)
  if (!row) throw new Error('找不到任務')

  const patch: Record<string, string | null> = {}
  if (input.title !== undefined) {
    const t = input.title.trim()
    if (!t) throw new Error('標題為必填')
    patch.title = t
  }
  if (input.description !== undefined) {
    const d = input.description
    patch.description =
      d == null || d === '' ? null : d.trim() || null
  }
  if (Object.keys(patch).length === 0) return

  const { error } = await supabase
    .from('task_templates')
    .update(patch)
    .eq('id', templateId)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)

  for (const p of REVALIDATE) revalidatePath(p)
}
