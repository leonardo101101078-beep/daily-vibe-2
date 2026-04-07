import { getLocalDB } from '@/lib/local/dexie-db'
import type { TaskStatus } from '@/types/database'

export async function updateLogStatusLocal(
  logId: string,
  status: TaskStatus,
): Promise<void> {
  const db = getLocalDB()
  const row = await db.dailyLogs.get(logId)
  if (!row) return

  const completedAt =
    status === 'completed' ? new Date().toISOString() : null

  await db.dailyLogs.put({
    ...row,
    status,
    completed_at: completedAt,
    updated_at: new Date().toISOString(),
    dirty: true,
  })

  if (row.task_template_id) {
    const tpl = await db.taskTemplates.get(row.task_template_id)
    if (tpl?.recurrence === 'once') {
      await db.taskTemplates.put({
        ...tpl,
        is_active: status === 'pending',
        updated_at: new Date().toISOString(),
        dirty: true,
      })
    }
  }
}

export async function updateLogNoteLocal(logId: string, note: string): Promise<void> {
  const db = getLocalDB()
  const row = await db.dailyLogs.get(logId)
  if (!row) return
  await db.dailyLogs.put({
    ...row,
    note,
    updated_at: new Date().toISOString(),
    dirty: true,
  })
}
