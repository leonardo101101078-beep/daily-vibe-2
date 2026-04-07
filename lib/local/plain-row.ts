import type { LocalMetaRow } from '@/lib/local/dexie-db'

/** Strip local sync fields for UI / server-shaped types. */
export function toPlainRow<T extends { dirty?: boolean; serverRevision?: number }>(
  row: T,
): Omit<T, 'dirty' | 'serverRevision'> {
  const { dirty: _d, serverRevision: _s, ...rest } = row
  return rest as Omit<T, 'dirty' | 'serverRevision'>
}

export function wrapServerRow<T extends { sync_revision: number }>(
  row: T,
): LocalMetaRow<T> {
  return {
    ...row,
    dirty: false,
    serverRevision: row.sync_revision,
  }
}
