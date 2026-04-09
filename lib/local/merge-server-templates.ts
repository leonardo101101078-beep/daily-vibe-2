import { getLocalDB, type LocalMetaRow } from '@/lib/local/dexie-db'
import { wrapServerRow } from '@/lib/local/plain-row'
import type { TaskTemplate, TaskTemplateRow } from '@/types/database'

/** Merges server-fetched templates into IndexedDB without clobbering dirty local rows. */
export async function mergeTemplatesFromServer(
  templates: TaskTemplate[],
): Promise<void> {
  if (templates.length === 0) return

  const db = getLocalDB()
  const ids = Array.from(new Set(templates.map((t) => t.id)))
  const existingList = await db.taskTemplates.bulkGet(ids)
  const existingById = new Map<string, LocalMetaRow<TaskTemplateRow> | undefined>()
  ids.forEach((id, i) => {
    existingById.set(id, existingList[i])
  })

  const toWrite: LocalMetaRow<TaskTemplateRow>[] = []

  for (const t of templates) {
    const existing = existingById.get(t.id)
    const row = {
      ...(t as TaskTemplateRow),
      sync_revision: (t as TaskTemplateRow).sync_revision ?? 1,
    }
    // User deactivated on server — always apply so IndexedDB stops showing the template,
    // even when the local row was dirty (unsynced edits).
    if (row.is_active === false) {
      const wrapped = wrapServerRow(row)
      toWrite.push(wrapped)
      existingById.set(t.id, wrapped)
      continue
    }
    if (existing?.dirty) continue
    const wrapped = wrapServerRow(row)
    toWrite.push(wrapped)
    existingById.set(t.id, wrapped)
  }

  if (toWrite.length > 0) {
    await db.taskTemplates.bulkPut(toWrite)
  }
}
