import Dexie, { type Table } from 'dexie'
import type {
  AnnualGoalRow,
  DailyLogRow,
  DailyReviewRow,
  DailyWellnessRow,
  MonthlyGoalRow,
  NotificationSettingsRow,
  ProfileRow,
  TaskTemplateRow,
  WeeklyGoalRow,
} from '@/types/database'

/** Last confirmed server revision for this row; `dirty` means local edits not yet pushed. */
export type LocalMetaRow<T> = T & {
  dirty: boolean
  serverRevision: number
}

export type SyncConflictRecord = {
  id: string
  table:
    | 'profiles'
    | 'notification_settings'
    | 'task_templates'
    | 'daily_logs'
    | 'daily_reviews'
    | 'daily_wellness'
    | 'annual_goals'
    | 'monthly_goals'
    | 'weekly_goals'
    | 'notification_settings'
  rowId: string
  localSnapshot: unknown
  remoteSnapshot: unknown
  createdAt: string
}

export const META_SESSION_ID = 'session' as const

export type LocalMetaState = {
  id: typeof META_SESSION_ID
  userId: string
  deviceId: string
  lastFullPullAt: string | null
  lastSyncAt: string | null
  /** Rolling window for daily-ish rows (default 90). */
  retentionDays: number
}

const DB_NAME = 'dailyvibe_2_0'

export class DailyVibeLocalDB extends Dexie {
  meta!: Table<LocalMetaState>
  profiles!: Table<LocalMetaRow<ProfileRow>>
  notificationSettings!: Table<LocalMetaRow<NotificationSettingsRow>>
  taskTemplates!: Table<LocalMetaRow<TaskTemplateRow>>
  dailyLogs!: Table<LocalMetaRow<DailyLogRow>>
  dailyReviews!: Table<LocalMetaRow<DailyReviewRow>>
  dailyWellness!: Table<LocalMetaRow<DailyWellnessRow>>
  annualGoals!: Table<LocalMetaRow<AnnualGoalRow>>
  monthlyGoals!: Table<LocalMetaRow<MonthlyGoalRow>>
  weeklyGoals!: Table<LocalMetaRow<WeeklyGoalRow>>
  conflicts!: Table<SyncConflictRecord>

  constructor() {
    super(DB_NAME)
    this.version(1).stores({
      meta: 'id',
      profiles: 'id',
      notificationSettings: 'user_id',
      taskTemplates: 'id, user_id, is_active, sort_order',
      dailyLogs: 'id, user_id, date, task_template_id',
      dailyReviews: 'id, user_id, date',
      dailyWellness: 'id, user_id, date',
      annualGoals: 'id, user_id, sort_order',
      monthlyGoals: 'id, user_id, year, month, sort_order',
      weeklyGoals: 'id, user_id, week_start, sort_order',
      conflicts: 'id, table, rowId',
    })
  }
}

let dbSingleton: DailyVibeLocalDB | null = null

export function getLocalDB(): DailyVibeLocalDB {
  if (typeof indexedDB === 'undefined') {
    throw new Error('IndexedDB is not available in this environment')
  }
  if (!dbSingleton) {
    dbSingleton = new DailyVibeLocalDB()
  }
  return dbSingleton
}

export async function clearAllLocalData(): Promise<void> {
  const db = getLocalDB()
  await db.transaction(
    'rw',
    [
      db.meta,
      db.profiles,
      db.notificationSettings,
      db.taskTemplates,
      db.dailyLogs,
      db.dailyReviews,
      db.dailyWellness,
      db.annualGoals,
      db.monthlyGoals,
      db.weeklyGoals,
      db.conflicts,
    ],
    async () => {
      await Promise.all([
        db.meta.clear(),
        db.profiles.clear(),
        db.notificationSettings.clear(),
        db.taskTemplates.clear(),
        db.dailyLogs.clear(),
        db.dailyReviews.clear(),
        db.dailyWellness.clear(),
        db.annualGoals.clear(),
        db.monthlyGoals.clear(),
        db.weeklyGoals.clear(),
        db.conflicts.clear(),
      ])
    },
  )
}

/**
 * Ensures IndexedDB scope matches the signed-in user. If the user changed,
 * wipes local tables (cloud remains authoritative on next full pull).
 */
export async function ensureSessionForUser(
  userId: string,
  deviceId: string,
): Promise<LocalMetaState> {
  const db = getLocalDB()
  const existing = await db.meta.get(META_SESSION_ID)
  if (existing && existing.userId === userId) {
    return existing
  }
  await clearAllLocalData()
  const next: LocalMetaState = {
    id: META_SESSION_ID,
    userId,
    deviceId,
    lastFullPullAt: null,
    lastSyncAt: null,
    retentionDays: 90,
  }
  await db.meta.put(next)
  return next
}

export async function updateSessionMeta(
  patch: Partial<Omit<LocalMetaState, 'id'>>,
): Promise<void> {
  const db = getLocalDB()
  const cur = await db.meta.get(META_SESSION_ID)
  if (!cur) return
  await db.meta.put({ ...cur, ...patch })
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Remove daily-scoped rows older than retention window (by `date` field). */
export async function pruneLocalHistoryByDate(
  retentionDays: number,
): Promise<void> {
  const db = getLocalDB()
  const cutoff = new Date()
  cutoff.setUTCDate(cutoff.getUTCDate() - retentionDays)
  const cutoffStr = cutoff.toISOString().slice(0, 10)

  await db.transaction(
    'rw',
    db.dailyLogs,
    db.dailyReviews,
    db.dailyWellness,
    async () => {
      await db.dailyLogs
        .filter((r) => r.date < cutoffStr)
        .delete()
      await db.dailyReviews
        .filter((r) => r.date < cutoffStr)
        .delete()
      await db.dailyWellness
        .filter((r) => r.date < cutoffStr)
        .delete()
    },
  )
}

export const localDateUtils = { todayIsoDate }
