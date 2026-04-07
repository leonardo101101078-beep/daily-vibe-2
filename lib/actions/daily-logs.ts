'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { calendarDaysBetween, mondayBasedWeekday } from '@/lib/recurrence-helpers'
import type {
  TaskStatus,
  LogWithTemplate,
  DailyLogInsert,
} from '@/types/database'
import type { TemplateSeedRow } from '@/lib/task-seed-rows'

export type { TemplateSeedRow } from '@/lib/task-seed-rows'

export type SeedTodayLogsOptions = {
  preloadedActiveTemplates?: TemplateSeedRow[]
}

function isEligibleForDay(t: TemplateSeedRow, day: string): boolean {
  const r = t.recurrence ?? 'daily'
  switch (r) {
    case 'daily':
      return true
    case 'once':
      return t.occurrence_date === day
    case 'weekly':
      if (t.recurrence_weekday == null) return false
      return mondayBasedWeekday(day) === t.recurrence_weekday
    case 'every_other_day':
      if (!t.alternate_anchor_date) return false
      const diff = calendarDaysBetween(t.alternate_anchor_date, day)
      return diff >= 0 && diff % 2 === 0
    default:
      return false
  }
}

/** Seeds logs for `day`. Skips if `day` is after `calendarToday` (future days). */
export async function seedTodayLogs(
  userId: string,
  day: string,
  calendarToday?: string,
  options?: SeedTodayLogsOptions,
): Promise<void> {
  const cap = calendarToday ?? day
  if (day > cap) return

  const supabase = createClient()

  const { error: deactivateErr } = await supabase
    .from('task_templates')
    .update({ is_active: false })
    .eq('user_id', userId)
    .eq('recurrence', 'once')
    .lt('occurrence_date', cap)

  if (deactivateErr) throw new Error(deactivateErr.message)

  let rows: TemplateSeedRow[]

  if (options?.preloadedActiveTemplates) {
    rows = options.preloadedActiveTemplates
  } else {
    const { data: templates, error: tErr } = await supabase
      .from('task_templates')
      .select(
        'id, recurrence, occurrence_date, recurrence_weekday, alternate_anchor_date',
      )
      .eq('user_id', userId)
      .eq('is_active', true)

    if (tErr) {
      const msg = tErr.message ?? String(tErr)
      if (
        (msg.includes('recurrence_weekday') ||
          msg.includes('alternate_anchor_date')) &&
        (msg.includes('does not exist') || msg.includes('Could not find'))
      ) {
        throw new Error(
          '資料庫尚未套用 migration 006（task_recurrence_extended）。請在 Supabase SQL Editor 執行 supabase/migrations/006_task_recurrence_extended.sql。',
        )
      }
      throw new Error(msg)
    }
    if (!templates || templates.length === 0) return
    rows = templates as TemplateSeedRow[]
  }

  if (rows.length === 0) return
  const eligible = rows.filter((t) => isEligibleForDay(t, day))

  if (eligible.length === 0) return

  const logs: DailyLogInsert[] = eligible.map((t) => ({
    user_id: userId,
    task_template_id: t.id,
    date: day,
    status: 'pending',
    note: null,
    progress: null,
    completed_at: null,
  }))

  const { error: uErr } = await supabase
    .from('daily_logs')
    .upsert(logs, {
      onConflict: 'user_id,task_template_id,date',
      ignoreDuplicates: true,
    })

  if (uErr) throw new Error(uErr.message)
}

export async function fetchTodayLogs(
  userId: string,
  today: string,
): Promise<LogWithTemplate[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('daily_logs')
    .select('*, task_templates(*)')
    .eq('user_id', userId)
    .eq('date', today)
    .order('task_templates(sort_order)', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as LogWithTemplate[]
}

/** Completion counts for a single day (for 紀錄 / weekly). */
export async function getDayCompletionStats(
  userId: string,
  day: string,
): Promise<{ completed: number; total: number }> {
  const logs = await fetchTodayLogs(userId, day)
  const total = logs.length
  const completed = logs.filter((l) => l.status === 'completed').length
  return { completed, total }
}

export async function updateLogStatus(
  logId: string,
  status: TaskStatus,
): Promise<void> {
  const supabase = createClient()

  const completedAt =
    status === 'completed' ? new Date().toISOString() : null

  const { error } = await supabase
    .from('daily_logs')
    .update({ status, completed_at: completedAt })
    .eq('id', logId)

  if (error) throw new Error(error.message)

  if (status === 'completed' || status === 'pending') {
    const { data: logRow, error: fetchErr } = await supabase
      .from('daily_logs')
      .select('task_template_id')
      .eq('id', logId)
      .maybeSingle()

    if (!fetchErr && logRow?.task_template_id) {
      const { data: tpl } = await supabase
        .from('task_templates')
        .select('recurrence')
        .eq('id', logRow.task_template_id)
        .maybeSingle()

      const rec = (tpl as { recurrence?: string } | null)?.recurrence
      if (rec === 'once') {
        if (status === 'completed') {
          await supabase
            .from('task_templates')
            .update({ is_active: false })
            .eq('id', logRow.task_template_id)
        } else {
          await supabase
            .from('task_templates')
            .update({ is_active: true })
            .eq('id', logRow.task_template_id)
        }
      }
    }
  }

  revalidatePath('/')
  revalidatePath('/today')
  revalidatePath('/weekly')
  revalidatePath('/weekly/record')
  revalidatePath('/focus')
}

export async function updateLogNote(
  logId: string,
  note: string,
): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('daily_logs')
    .update({ note })
    .eq('id', logId)

  if (error) throw new Error(error.message)

  revalidatePath('/today')
  revalidatePath('/weekly')
  revalidatePath('/weekly/record')
}

export async function fetchLogsBetweenDates(
  userId: string,
  startDate: string,
  endDate: string,
): Promise<LogWithTemplate[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('daily_logs')
    .select('*, task_templates(*)')
    .eq('user_id', userId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as LogWithTemplate[]
}
