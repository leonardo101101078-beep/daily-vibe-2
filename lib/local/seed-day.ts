import { calendarDaysBetween, mondayBasedWeekday } from '@/lib/recurrence-helpers'
import type {
  DailyLogInsert,
  DailyLogRow,
  TaskTemplateRow,
} from '@/types/database'
import type { TemplateSeedRow } from '@/lib/task-seed-rows'
import { getLocalDB, type LocalMetaRow } from '@/lib/local/dexie-db'

function newId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `log_${Date.now()}_${Math.random().toString(36).slice(2)}`
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

function wrapLog(insert: DailyLogInsert): LocalMetaRow<DailyLogRow> {
  const id = newId()
  const now = new Date().toISOString()
  return {
    id,
    user_id: insert.user_id,
    task_template_id: insert.task_template_id,
    date: insert.date,
    status: insert.status,
    note: insert.note,
    progress: insert.progress,
    completed_at: insert.completed_at,
    sync_revision: 1,
    created_at: now,
    updated_at: now,
    dirty: true,
    serverRevision: 0,
  }
}

/** Deactivate past single-day templates locally (marks dirty for sync). */
export async function deactivatePastOnceTemplatesLocal(
  userId: string,
  calendarToday: string,
): Promise<void> {
  const db = getLocalDB()
  const rows = await db.taskTemplates
    .where('user_id')
    .equals(userId)
    .filter(
      (t) =>
        t.recurrence === 'once' &&
        t.occurrence_date != null &&
        t.occurrence_date < calendarToday &&
        t.is_active,
    )
    .toArray()

  for (const t of rows) {
    const next: LocalMetaRow<TaskTemplateRow> = {
      ...t,
      is_active: false,
      dirty: true,
      serverRevision: t.serverRevision,
    }
    await db.taskTemplates.put(next)
  }
}

/**
 * Ensures daily_logs rows exist for `day` (client-side), mirroring server seed.
 * Creates local-only log rows (serverRevision 0, dirty) until first sync succeeds.
 */
export async function seedDailyLogsForDayLocal(
  userId: string,
  day: string,
  calendarToday: string,
): Promise<void> {
  const cap = calendarToday
  if (day > cap) return

  const db = getLocalDB()
  await deactivatePastOnceTemplatesLocal(userId, cap)

  const templates = await db.taskTemplates
    .where('user_id')
    .equals(userId)
    .filter((t) => t.is_active)
    .toArray()

  if (templates.length === 0) return

  const seeds: TemplateSeedRow[] = templates.map((t) => ({
    id: t.id,
    recurrence: t.recurrence,
    occurrence_date: t.occurrence_date,
    recurrence_weekday: t.recurrence_weekday,
    alternate_anchor_date: t.alternate_anchor_date,
  }))

  const eligible = seeds.filter((t) => isEligibleForDay(t, day))
  if (eligible.length === 0) return

  const existing = await db.dailyLogs
    .where('user_id')
    .equals(userId)
    .filter((l) => l.date === day)
    .toArray()
  const existingTpl = new Set(existing.map((e) => e.task_template_id))

  for (const t of eligible) {
    if (existingTpl.has(t.id)) continue
    const insert: DailyLogInsert = {
      user_id: userId,
      task_template_id: t.id,
      date: day,
      status: 'pending',
      note: null,
      progress: null,
      completed_at: null,
    }
    await db.dailyLogs.put(wrapLog(insert))
  }
}
