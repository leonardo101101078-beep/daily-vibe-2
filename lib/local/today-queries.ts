import { getLocalDB } from '@/lib/local/dexie-db'
import { toPlainRow } from '@/lib/local/plain-row'
import type { LogWithTemplate, TaskTemplate } from '@/types/database'

export async function getLogsWithTemplatesForDate(
  userId: string,
  date: string,
): Promise<LogWithTemplate[]> {
  const db = getLocalDB()
  const logs = await db.dailyLogs
    .where('user_id')
    .equals(userId)
    .filter((l) => l.date === date)
    .toArray()

  const templates = await db.taskTemplates.where('user_id').equals(userId).toArray()
  const tplMap = new Map(templates.map((t) => [t.id, t]))

  const merged: LogWithTemplate[] = []
  for (const l of logs) {
    const tpl = tplMap.get(l.task_template_id)
    if (!tpl) continue
    if (tpl.is_active === false) continue
    const logRow = toPlainRow(l)
    const tplRow = toPlainRow(tpl) as TaskTemplate
    merged.push({
      ...logRow,
      task_templates: tplRow,
    })
  }

  merged.sort(
    (a, b) =>
      (a.task_templates.sort_order ?? 0) - (b.task_templates.sort_order ?? 0),
  )
  return merged
}
