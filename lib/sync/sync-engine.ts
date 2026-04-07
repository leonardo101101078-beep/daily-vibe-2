import { createClient } from '@/lib/supabase/client'
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
import {
  META_SESSION_ID,
  getLocalDB,
  pruneLocalHistoryByDate,
  updateSessionMeta,
  type LocalMetaRow,
  type SyncConflictRecord,
} from '@/lib/local/dexie-db'

function stripMeta<T extends Record<string, unknown>>(row: T): Omit<T, 'dirty' | 'serverRevision'> {
  const { dirty: _d, serverRevision: _s, ...rest } = row as T & {
    dirty?: boolean
    serverRevision?: number
  }
  return rest as Omit<T, 'dirty' | 'serverRevision'>
}

function wrapClean<T extends { sync_revision: number }>(row: T): LocalMetaRow<T> {
  return {
    ...row,
    dirty: false,
    serverRevision: row.sync_revision,
  }
}

function cloneForConflict(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value))
}

async function addConflict(
  table: SyncConflictRecord['table'],
  rowId: string,
  localRow: unknown,
  remoteSnapshot: unknown,
): Promise<void> {
  const db = getLocalDB()
  const id = `cf_${table}_${rowId}_${Date.now()}`
  const rec: SyncConflictRecord = {
    id,
    table,
    rowId,
    localSnapshot: cloneForConflict(localRow),
    remoteSnapshot: cloneForConflict(remoteSnapshot),
    createdAt: new Date().toISOString(),
  }
  await db.conflicts.put(rec)
}

export type SyncOutcome = {
  ok: boolean
  pulled: boolean
  pushed: number
  conflicts: number
  error?: string
}

/** Full replace from Supabase into IndexedDB (cloud wins for non-dirty merge handled elsewhere). */
export async function fullPullFromRemote(userId: string): Promise<void> {
  const supabase = createClient()
  const db = getLocalDB()

  const [
    profileRes,
    tplRes,
    logsRes,
    revRes,
    wellRes,
    agRes,
    mgRes,
    wgRes,
    notifRes,
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase.from('task_templates').select('*').eq('user_id', userId),
    supabase.from('daily_logs').select('*').eq('user_id', userId),
    supabase.from('daily_reviews').select('*').eq('user_id', userId),
    supabase.from('daily_wellness').select('*').eq('user_id', userId),
    supabase.from('annual_goals').select('*').eq('user_id', userId),
    supabase.from('monthly_goals').select('*').eq('user_id', userId),
    supabase.from('weekly_goals').select('*').eq('user_id', userId),
    supabase.from('notification_settings').select('*').eq('user_id', userId).maybeSingle(),
  ])

  const err =
    profileRes.error?.message ||
    tplRes.error?.message ||
    logsRes.error?.message ||
    revRes.error?.message ||
    wellRes.error?.message ||
    agRes.error?.message ||
    mgRes.error?.message ||
    wgRes.error?.message ||
    notifRes.error?.message

  if (err) throw new Error(err)

  await db.transaction(
    'rw',
    [
      db.profiles,
      db.notificationSettings,
      db.taskTemplates,
      db.dailyLogs,
      db.dailyReviews,
      db.dailyWellness,
      db.annualGoals,
      db.monthlyGoals,
      db.weeklyGoals,
    ],
    async () => {
      await db.profiles.clear()
      await db.notificationSettings.clear()
      await db.taskTemplates.clear()
      await db.dailyLogs.clear()
      await db.dailyReviews.clear()
      await db.dailyWellness.clear()
      await db.annualGoals.clear()
      await db.monthlyGoals.clear()
      await db.weeklyGoals.clear()

      if (profileRes.data) {
        await db.profiles.put(
          wrapClean(profileRes.data as ProfileRow),
        )
      }
      if (notifRes.data) {
        await db.notificationSettings.put(
          wrapClean(notifRes.data as NotificationSettingsRow),
        )
      }

      const tpls = (tplRes.data ?? []) as TaskTemplateRow[]
      for (const t of tpls) {
        await db.taskTemplates.put(wrapClean(t))
      }
      const logs = (logsRes.data ?? []) as DailyLogRow[]
      for (const l of logs) {
        await db.dailyLogs.put(wrapClean(l))
      }
      const revs = (revRes.data ?? []) as DailyReviewRow[]
      for (const r of revs) {
        await db.dailyReviews.put(wrapClean(r))
      }
      const wells = (wellRes.data ?? []) as DailyWellnessRow[]
      for (const w of wells) {
        await db.dailyWellness.put(wrapClean(w))
      }
      const ags = (agRes.data ?? []) as AnnualGoalRow[]
      for (const g of ags) {
        await db.annualGoals.put(wrapClean(g))
      }
      const mgs = (mgRes.data ?? []) as MonthlyGoalRow[]
      for (const g of mgs) {
        await db.monthlyGoals.put(wrapClean(g))
      }
      const wgs = (wgRes.data ?? []) as WeeklyGoalRow[]
      for (const g of wgs) {
        await db.weeklyGoals.put(wrapClean(g))
      }
    },
  )

  const meta = await db.meta.get(META_SESSION_ID)
  const retention = meta?.retentionDays ?? 90
  await pruneLocalHistoryByDate(retention)

  await updateSessionMeta({
    lastFullPullAt: new Date().toISOString(),
    lastSyncAt: new Date().toISOString(),
  })
}

async function fetchRemoteRevision(
  table: string,
  id: string,
): Promise<{ sync_revision: number } | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from(table)
    .select('sync_revision')
    .eq('id', id)
    .maybeSingle()
  if (error || !data) return null
  return data as { sync_revision: number }
}

async function pushRowIfClean(
  table: string,
  row: LocalMetaRow<{ id: string; sync_revision: number }>,
  tableName: SyncConflictRecord['table'],
): Promise<'pushed' | 'skipped' | 'conflict'> {
  if (!row.dirty) return 'skipped'

  const remote = await fetchRemoteRevision(table, row.id)
  if (remote && remote.sync_revision > row.serverRevision) {
    await addConflict(tableName, row.id, row, remote)
    return 'conflict'
  }

  const supabase = createClient()
  const payload = stripMeta(row as unknown as Record<string, unknown>) as Record<string, unknown>
  delete payload.sync_revision

  const { error } = await supabase.from(table).upsert(payload)
  if (error) throw new Error(error.message)

  const { data: fresh } = await supabase
    .from(table)
    .select('*')
    .eq('id', row.id)
    .maybeSingle()

  if (!fresh) return 'pushed'

  const db = getLocalDB()
  switch (tableName) {
    case 'task_templates':
      await db.taskTemplates.put(wrapClean(fresh as TaskTemplateRow))
      break
    case 'daily_logs':
      await db.dailyLogs.put(wrapClean(fresh as DailyLogRow))
      break
    case 'daily_reviews':
      await db.dailyReviews.put(wrapClean(fresh as DailyReviewRow))
      break
    case 'daily_wellness':
      await db.dailyWellness.put(wrapClean(fresh as DailyWellnessRow))
      break
    case 'annual_goals':
      await db.annualGoals.put(wrapClean(fresh as AnnualGoalRow))
      break
    case 'monthly_goals':
      await db.monthlyGoals.put(wrapClean(fresh as MonthlyGoalRow))
      break
    case 'weekly_goals':
      await db.weeklyGoals.put(wrapClean(fresh as WeeklyGoalRow))
      break
    default:
      break
  }
  return 'pushed'
}

/** Push profile by user id (PK = id). */
async function pushProfileIfClean(
  row: LocalMetaRow<ProfileRow>,
): Promise<'pushed' | 'skipped' | 'conflict'> {
  if (!row.dirty) return 'skipped'
  const supabase = createClient()
  const remote = await supabase
    .from('profiles')
    .select('sync_revision')
    .eq('id', row.id)
    .maybeSingle()

  const rrev = remote.data as { sync_revision: number } | null
  if (rrev && rrev.sync_revision > row.serverRevision) {
    await addConflict('profiles', row.id, row, rrev)
    return 'conflict'
  }

  const payload = stripMeta(row as unknown as Record<string, unknown>) as Record<string, unknown>
  delete payload.sync_revision

  const { error } = await supabase.from('profiles').upsert(payload)
  if (error) throw new Error(error.message)

  const { data: fresh } = await supabase.from('profiles').select('*').eq('id', row.id).maybeSingle()
  if (fresh) {
    await getLocalDB().profiles.put(wrapClean(fresh as ProfileRow))
  }
  return 'pushed'
}

async function pushNotificationSettingsIfClean(
  row: LocalMetaRow<NotificationSettingsRow>,
): Promise<'pushed' | 'skipped' | 'conflict'> {
  if (!row.dirty) return 'skipped'
  const supabase = createClient()
  const remote = await supabase
    .from('notification_settings')
    .select('sync_revision')
    .eq('user_id', row.user_id)
    .maybeSingle()

  const rrev = remote.data as { sync_revision: number } | null
  if (rrev && rrev.sync_revision > row.serverRevision) {
    await addConflict('notification_settings', row.user_id, row, rrev)
    return 'conflict'
  }

  const payload = stripMeta(row as unknown as Record<string, unknown>) as Record<string, unknown>
  delete payload.sync_revision

  const { error } = await supabase
    .from('notification_settings')
    .upsert(payload, { onConflict: 'user_id' })
  if (error) throw new Error(error.message)

  const { data: fresh } = await supabase
    .from('notification_settings')
    .select('*')
    .eq('user_id', row.user_id)
    .maybeSingle()
  if (fresh) {
    await getLocalDB().notificationSettings.put(wrapClean(fresh as NotificationSettingsRow))
  }
  return 'pushed'
}

export async function pushDirtyToRemote(userId: string): Promise<{
  pushed: number
  conflicts: number
}> {
  const db = getLocalDB()
  let pushed = 0
  let conflicts = 0

  const prof = await db.profiles.get(userId)
  if (prof) {
    const r = await pushProfileIfClean(prof)
    if (r === 'pushed') pushed++
    if (r === 'conflict') conflicts++
  }

  const notif = await db.notificationSettings.get(userId)
  if (notif) {
    const r = await pushNotificationSettingsIfClean(notif)
    if (r === 'pushed') pushed++
    if (r === 'conflict') conflicts++
  }

  const tpls = await db.taskTemplates.filter((t) => t.dirty).toArray()
  for (const t of tpls) {
    const r = await pushRowIfClean('task_templates', t, 'task_templates')
    if (r === 'pushed') pushed++
    if (r === 'conflict') conflicts++
  }

  const logs = await db.dailyLogs.filter((l) => l.dirty).toArray()
  for (const l of logs) {
    const r = await pushRowIfClean('daily_logs', l, 'daily_logs')
    if (r === 'pushed') pushed++
    if (r === 'conflict') conflicts++
  }

  const revs = await db.dailyReviews.filter((r) => r.dirty).toArray()
  for (const r of revs) {
    const x = await pushRowIfClean('daily_reviews', r, 'daily_reviews')
    if (x === 'pushed') pushed++
    if (x === 'conflict') conflicts++
  }

  const wells = await db.dailyWellness.filter((w) => w.dirty).toArray()
  for (const w of wells) {
    const x = await pushRowIfClean('daily_wellness', w, 'daily_wellness')
    if (x === 'pushed') pushed++
    if (x === 'conflict') conflicts++
  }

  const ags = await db.annualGoals.filter((g) => g.dirty).toArray()
  for (const g of ags) {
    const x = await pushRowIfClean('annual_goals', g, 'annual_goals')
    if (x === 'pushed') pushed++
    if (x === 'conflict') conflicts++
  }

  const mgs = await db.monthlyGoals.filter((g) => g.dirty).toArray()
  for (const g of mgs) {
    const x = await pushRowIfClean('monthly_goals', g, 'monthly_goals')
    if (x === 'pushed') pushed++
    if (x === 'conflict') conflicts++
  }

  const wgs = await db.weeklyGoals.filter((g) => g.dirty).toArray()
  for (const g of wgs) {
    const x = await pushRowIfClean('weekly_goals', g, 'weekly_goals')
    if (x === 'pushed') pushed++
    if (x === 'conflict') conflicts++
  }

  await updateSessionMeta({ lastSyncAt: new Date().toISOString() })
  return { pushed, conflicts }
}

/**
 * 1) Push local dirty rows (conflict-safe).
 * 2) Full pull so local matches cloud for non-conflicting data.
 */
export async function performFullSync(userId: string): Promise<SyncOutcome> {
  try {
    const { pushed, conflicts: pushConflicts } = await pushDirtyToRemote(userId)
    if (pushConflicts === 0) {
      await fullPullFromRemote(userId)
    }
    const db = getLocalDB()
    const c = await db.conflicts.count()
    return {
      ok: true,
      pulled: pushConflicts === 0,
      pushed,
      conflicts: c,
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, pulled: false, pushed: 0, conflicts: 0, error: msg }
  }
}

/** First-time or explicit re-download: cloud wins. */
export async function bootstrapFromCloudIfNeeded(userId: string): Promise<void> {
  const db = getLocalDB()
  const meta = await db.meta.get(META_SESSION_ID)
  if (!meta?.lastFullPullAt) {
    await fullPullFromRemote(userId)
  }
}
