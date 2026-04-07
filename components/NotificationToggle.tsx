'use client'

import { useState, useEffect, useTransition } from 'react'
import { Bell, BellOff, BellRing, Loader2 } from 'lucide-react'
import { AppIcon } from '@/components/AppIcon'
import { subscribePush, unsubscribePush, updateNotificationSettings } from '@/lib/actions/push'
import { NotificationSettings } from '@/components/NotificationSettings'
import type { NotificationSettingsRow } from '@/types/database'

interface NotificationToggleProps {
  /** Initial settings fetched server-side; null means no row exists yet. */
  initialSettings: Pick<
    NotificationSettingsRow,
    'enabled' | 'morning_time' | 'evening_time' | 'timezone'
  > | null
}

// Converts a browser PushSubscription to the plain-object shape we need
function serializeSubscription(sub: PushSubscription) {
  const json = sub.toJSON()
  return {
    endpoint: sub.endpoint,
    keys: {
      p256dh: json.keys?.p256dh ?? '',
      auth: json.keys?.auth ?? '',
    },
    userAgent: navigator.userAgent,
  }
}

/**
 * Resolves the registration that controls push, without hanging in dev.
 * `navigator.serviceWorker.ready` can stay pending forever when no SW is registered
 * (e.g. `next dev` disables PWA), which breaks hydration follow-up and the enable flow.
 */
async function getActiveServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return null
  }
  const reg = await navigator.serviceWorker.getRegistration()
  if (reg?.active) return reg
  if (reg?.installing || reg?.waiting) {
    return navigator.serviceWorker.ready
  }
  return null
}

// Subscribes the browser to push via the VAPID public key
async function browserSubscribe(): Promise<PushSubscription | null> {
  const reg = await getActiveServiceWorkerRegistration()
  if (!reg) {
    console.warn(
      '[Daily-Vibe 2.0] No active service worker — push needs a production build with PWA enabled.',
    )
    return null
  }
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!vapidKey) {
    console.error('NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set')
    return null
  }

  // Convert base64url VAPID key to Uint8Array
  const padding = '='.repeat((4 - (vapidKey.length % 4)) % 4)
  const base64 = (vapidKey + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawKey = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))

  return reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: rawKey,
  })
}

export function NotificationToggle({ initialSettings }: NotificationToggleProps) {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [enabled, setEnabled] = useState(initialSettings?.enabled ?? false)
  const [subscription, setSubscription] = useState<PushSubscription | null>(null)
  const [isPending, startTransition] = useTransition()

  const settings = initialSettings ?? {
    enabled: false,
    morning_time: '09:00',
    evening_time: '21:00',
    timezone: 'Asia/Singapore',
  }

  // Read current browser permission state on mount
  useEffect(() => {
    if (typeof Notification !== 'undefined') {
      setPermission(Notification.permission)
    }
    let cancelled = false
    void (async () => {
      const reg = await getActiveServiceWorkerRegistration()
      if (cancelled || !reg) return
      const sub = await reg.pushManager.getSubscription()
      if (cancelled) return
      setSubscription(sub)
      if (sub) setEnabled(initialSettings?.enabled ?? true)
    })()
    return () => {
      cancelled = true
    }
  }, [initialSettings?.enabled])

  // ── Request permission & subscribe ──
  const handleEnable = () => {
    startTransition(async () => {
      const perm = await Notification.requestPermission()
      setPermission(perm)
      if (perm !== 'granted') return

      const sub = await browserSubscribe()
      if (!sub) return

      setSubscription(sub)
      await subscribePush(serializeSubscription(sub))
      await updateNotificationSettings({ ...settings, enabled: true })
      setEnabled(true)
    })
  }

  // ── Disable & unsubscribe ──
  const handleDisable = () => {
    startTransition(async () => {
      if (subscription) {
        await subscription.unsubscribe()
        await unsubscribePush(subscription.endpoint)
        setSubscription(null)
      }
      await updateNotificationSettings({ ...settings, enabled: false })
      setEnabled(false)
    })
  }

  // ── Permission denied — nothing we can do from JS ──
  if (permission === 'denied') {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3">
        <BellOff className="h-5 w-5 shrink-0 text-destructive" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-destructive">通知已封鎖</p>
          <p className="text-xs text-muted-foreground">
            請在瀏覽器網址列的「網站設定」中允許通知，然後重新整理頁面。
          </p>
        </div>
      </div>
    )
  }

  // ── Notifications not yet requested or already granted but not enabled ──
  if (!enabled) {
    return (
      <div className="rounded-xl border px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-primary/10 p-2">
            <AppIcon icon={Bell} size="sm" className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">每日提醒</p>
            <p className="text-xs text-muted-foreground">
              早晨任務提醒 + 晚間回顧通知
            </p>
          </div>
          <button
            onClick={handleEnable}
            disabled={isPending}
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity disabled:opacity-60"
          >
            {isPending ? (
              <AppIcon
                icon={Loader2}
                size="sm"
                className="h-3.5 w-3.5 animate-spin"
              />
            ) : (
              <AppIcon icon={BellRing} size="sm" className="h-3.5 w-3.5" />
            )}
            {isPending ? '設定中…' : '開啟提醒'}
          </button>
        </div>
      </div>
    )
  }

  // ── Enabled: show toggle + time settings ──
  return (
    <div className="rounded-xl border px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-primary/10 p-2">
          <AppIcon icon={BellRing} size="sm" className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">每日提醒已開啟</p>
          <p className="text-xs text-muted-foreground">
            早晨 {settings.morning_time} · 晚間 {settings.evening_time}
          </p>
        </div>
        <button
          onClick={handleDisable}
          disabled={isPending}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60"
        >
          {isPending ? (
            <AppIcon
              icon={Loader2}
              size="sm"
              className="h-3.5 w-3.5 animate-spin"
            />
          ) : (
            <AppIcon icon={BellOff} size="sm" className="h-3.5 w-3.5" />
          )}
          {isPending ? '處理中…' : '關閉'}
        </button>
      </div>

      {/* Time picker */}
      <NotificationSettings settings={{ ...settings, enabled: true }} />
    </div>
  )
}
