'use client'

import { useState, useTransition } from 'react'
import { Clock, MapPin, Loader2 } from 'lucide-react'
import { AppIcon } from '@/components/AppIcon'
import { updateNotificationSettings } from '@/lib/actions/push'
import type { NotificationSettingsRow } from '@/types/database'

interface NotificationSettingsProps {
  settings: Pick<NotificationSettingsRow, 'enabled' | 'morning_time' | 'evening_time' | 'timezone'>
}

export function NotificationSettings({ settings }: NotificationSettingsProps) {
  const [morningTime, setMorningTime] = useState(settings.morning_time)
  const [eveningTime, setEveningTime] = useState(settings.evening_time)
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleSave = () => {
    startTransition(async () => {
      await updateNotificationSettings({
        enabled: settings.enabled,
        morning_time: morningTime,
        evening_time: eveningTime,
        timezone: settings.timezone,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  return (
    <div className="mt-3 rounded-xl border bg-muted/30 px-4 py-3 space-y-3">
      {/* Timezone badge */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <AppIcon icon={MapPin} size="sm" className="h-3 w-3" />
        <span>{settings.timezone} (UTC+8)</span>
      </div>

      {/* Morning reminder */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm">🌅</span>
          <span className="text-sm font-medium">早晨提醒</span>
        </div>
        <input
          type="time"
          value={morningTime}
          onChange={(e) => setMorningTime(e.target.value)}
          className="rounded-md border border-input bg-background px-2 py-1 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Evening reminder */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm">🌙</span>
          <span className="text-sm font-medium">晚間回顧</span>
        </div>
        <input
          type="time"
          value={eveningTime}
          onChange={(e) => setEveningTime(e.target.value)}
          className="rounded-md border border-input bg-background px-2 py-1 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={isPending}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground transition-opacity disabled:opacity-60"
      >
        {isPending ? (
          <>
            <AppIcon
              icon={Loader2}
              size="sm"
              className="h-3.5 w-3.5 animate-spin"
            />
            儲存中…
          </>
        ) : saved ? (
          <>
            <AppIcon icon={Clock} size="sm" className="h-3.5 w-3.5" />
            已儲存 ✓
          </>
        ) : (
          <>
            <AppIcon icon={Clock} size="sm" className="h-3.5 w-3.5" />
            儲存提醒時間
          </>
        )}
      </button>
    </div>
  )
}
