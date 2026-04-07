'use client'

import Link from 'next/link'
import { RefreshCw, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Props = {
  lastSyncAt: string | null
  pendingLabel?: string
  conflictCount: number
  syncing: boolean
  onSync: () => void
}

export function SyncStatusBar({
  lastSyncAt,
  pendingLabel,
  conflictCount,
  syncing,
  onSync,
}: Props) {
  const timeLabel = lastSyncAt
    ? new Date(lastSyncAt).toLocaleString('zh-TW', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '尚未同步'

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-muted/50 px-3 py-2 text-xs">
      <span className="text-muted-foreground">
        雲端同步：<span className="font-medium text-foreground">{timeLabel}</span>
        {pendingLabel ? (
          <span className="ml-2 text-amber-700 dark:text-amber-400">{pendingLabel}</span>
        ) : null}
      </span>
      {conflictCount > 0 && (
        <Link
          href="/sync/conflicts"
          className="inline-flex items-center gap-1 font-medium text-destructive"
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          {conflictCount} 筆衝突待處理
        </Link>
      )}
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="ml-auto h-7 gap-1 text-xs"
        disabled={syncing}
        onClick={onSync}
      >
        <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
        {syncing ? '同步中…' : '立即同步'}
      </Button>
    </div>
  )
}
