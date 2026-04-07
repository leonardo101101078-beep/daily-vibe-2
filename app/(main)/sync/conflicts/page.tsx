'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { getLocalDB } from '@/lib/local/dexie-db'
import { wrapServerRow } from '@/lib/local/plain-row'
import type { LocalMetaRow, SyncConflictRecord } from '@/lib/local/dexie-db'
import type { DailyLogRow, TaskTemplateRow } from '@/types/database'

export default function SyncConflictsPage() {
  const [rows, setRows] = useState<SyncConflictRecord[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const db = getLocalDB()
    const list = await db.conflicts.toArray()
    list.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    setRows(list)
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function resolveKeepLocal(id: string) {
    const db = getLocalDB()
    const c = await db.conflicts.get(id)
    if (!c) return

    if (c.table === 'daily_logs') {
      const local = c.localSnapshot as LocalMetaRow<DailyLogRow>
      await db.dailyLogs.put({ ...local, dirty: true })
    } else if (c.table === 'task_templates') {
      const local = c.localSnapshot as LocalMetaRow<TaskTemplateRow>
      await db.taskTemplates.put({ ...local, dirty: true })
    }

    await db.conflicts.delete(id)
    await load()
  }

  async function resolveKeepRemote(id: string) {
    const db = getLocalDB()
    const c = await db.conflicts.get(id)
    if (!c) return
    const supabase = createClient()

    if (c.table === 'daily_logs') {
      const { data } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('id', c.rowId)
        .maybeSingle()
      if (data) {
        await db.dailyLogs.put(wrapServerRow(data as DailyLogRow))
      }
    } else if (c.table === 'task_templates') {
      const { data } = await supabase
        .from('task_templates')
        .select('*')
        .eq('id', c.rowId)
        .maybeSingle()
      if (data) {
        await db.taskTemplates.put(wrapServerRow(data as TaskTemplateRow))
      }
    }

    await db.conflicts.delete(id)
    await load()
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background px-5 py-10 text-sm text-muted-foreground">
        載入中…
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-5 py-8">
        <Button variant="ghost" size="sm" asChild className="mb-6 gap-1">
          <Link href="/today">
            <ArrowLeft className="h-4 w-4" />
            返回今日
          </Link>
        </Button>
        <h1 className="font-display text-2xl font-bold">同步衝突</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          兩端都曾修改同一筆資料。請選擇本機版本或雲端版本，然後再按「立即同步」。
        </p>

        {rows.length === 0 ? (
          <p className="mt-8 text-sm text-muted-foreground">目前沒有衝突。</p>
        ) : (
          <ul className="mt-6 space-y-4">
            {rows.map((c) => (
              <li
                key={c.id}
                className="rounded-2xl border border-border/60 bg-card p-4 text-sm"
              >
                <p className="font-medium">
                  {c.table} · {c.rowId.slice(0, 8)}…
                </p>
                <pre className="mt-2 max-h-32 overflow-auto rounded-lg bg-muted/50 p-2 text-xs">
                  {JSON.stringify(
                    { local: c.localSnapshot, remote: c.remoteSnapshot },
                    null,
                    2,
                  )}
                </pre>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => resolveKeepLocal(c.id)}
                  >
                    保留本機
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => resolveKeepRemote(c.id)}
                  >
                    保留雲端
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}
