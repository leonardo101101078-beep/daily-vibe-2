import { getLocalDB } from '@/lib/local/dexie-db'
import { wrapServerRow } from '@/lib/local/plain-row'
import type { TaskTemplate, TaskTemplateRow } from '@/types/database'

/** Merges server-fetched templates into IndexedDB without clobbering dirty local rows. */
export async function mergeTemplatesFromServer(
  templates: TaskTemplate[],
): Promise<void> {
  const db = getLocalDB()
  for (const t of templates) {
    const existing = await db.taskTemplates.get(t.id)
    if (existing?.dirty) continue
    const row = {
      ...(t as TaskTemplateRow),
      sync_revision: (t as TaskTemplateRow).sync_revision ?? 1,
    }
    await db.taskTemplates.put(wrapServerRow(row))
  }
}
