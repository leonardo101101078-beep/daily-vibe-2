// =============================================================================
// Daily-Vibe 2.0 — Push Cron Endpoint
// POST /api/push/cron
// =============================================================================
// Called by an external scheduler (Vercel Cron, cron-job.org, etc.) every
// minute. Finds users whose local reminder time matches now, then sends a
// Web Push notification to every subscribed device.
//
// Authentication: Bearer token matching the CRON_SECRET env var.
// =============================================================================

import { getSupabaseServiceRoleKey, getSupabaseUrl } from '@/lib/supabase/env'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendPushNotification } from '@/lib/web-push'
import type { NotificationSettingsRow, SubscriptionRow } from '@/types/database'

// ---------------------------------------------------------------------------
// Helper: convert a UTC Date to 'HH:MM' in an arbitrary IANA timezone
// ---------------------------------------------------------------------------
function toLocalHHMM(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

// ---------------------------------------------------------------------------
// Helper: return true when two 'HH:MM' strings are within ±1 minute of each other
// ---------------------------------------------------------------------------
function isTimeMatch(target: string, current: string): boolean {
  const toMinutes = (t: string) => {
    const [h, m] = t.split(':').map(Number)
    return h * 60 + m
  }
  return Math.abs(toMinutes(target) - toMinutes(current)) <= 1
}

// ---------------------------------------------------------------------------
// Notification copy for each slot
// ---------------------------------------------------------------------------
function buildPayload(slot: 'morning' | 'evening' | 'sync') {
  if (slot === 'morning') {
    return {
      title: '早安！今日任務來了 ☀️',
      body: '打開 Daily-Vibe 2.0，確認今天的待辦清單。',
      url: '/today',
    }
  }
  if (slot === 'evening') {
    return {
      title: '今天過得如何？🌙',
      body: '花幾分鐘回顧今日進度，規劃明天的計畫。',
      url: '/today',
    }
  }
  return {
    title: '該同步到雲端了 ☁️',
    body: '開啟 Daily-Vibe 2.0，將本機與雲端資料合併。',
    url: '/today',
  }
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  // 1. Verify secret
  const authHeader = req.headers.get('authorization') ?? ''
  const secret = process.env.CRON_SECRET
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Use a service-role client so we can read all users' settings
  //    (bypasses RLS — only safe on the server with a protected route)
  const supabaseAdmin = createClient(
    getSupabaseUrl(),
    getSupabaseServiceRoleKey(),
  )

  const now = new Date()

  // 3. Fetch all enabled notification settings
  const { data: allSettings, error: settingsErr } = await supabaseAdmin
    .from('notification_settings')
    .select('*')
    .eq('enabled', true)

  if (settingsErr) {
    console.error('[push/cron] Failed to fetch settings:', settingsErr.message)
    return NextResponse.json({ error: settingsErr.message }, { status: 500 })
  }

  const settings = (allSettings ?? []) as NotificationSettingsRow[]

  let sent = 0
  let failed = 0

  for (const s of settings) {
    const localTime = toLocalHHMM(now, s.timezone)
    const nightlyEnabled = s.nightly_sync_enabled ?? true
    const nightlyTime = s.nightly_sync_time ?? '23:00'
    const nightlySync = nightlyEnabled && isTimeMatch(nightlyTime, localTime)

    const slot: 'morning' | 'evening' | 'sync' | null = isTimeMatch(
      s.morning_time,
      localTime,
    )
      ? 'morning'
      : isTimeMatch(s.evening_time, localTime)
        ? 'evening'
        : nightlySync
          ? 'sync'
          : null

    if (!slot) continue

    // 4. Fetch this user's subscriptions
    const { data: subs } = await supabaseAdmin
      .from('subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', s.user_id)

    if (!subs || subs.length === 0) continue

    const payload = buildPayload(slot)

    // 5. Send push to every subscribed device
    const results = await Promise.allSettled(
      (subs as Pick<SubscriptionRow, 'endpoint' | 'p256dh' | 'auth'>[]).map(
        (sub) => sendPushNotification(sub.endpoint, sub.p256dh, sub.auth, payload),
      ),
    )

    for (const r of results) {
      if (r.status === 'fulfilled') {
        sent++
      } else {
        failed++
        // If subscription is gone (410 Gone), remove it from the database
        const errMsg: string = (r.reason as Error)?.message ?? ''
        if (errMsg.includes('410') || errMsg.includes('404')) {
          const endpoint = (r.reason as { endpoint?: string })?.endpoint
          if (endpoint) {
            await supabaseAdmin
              .from('subscriptions')
              .delete()
              .eq('endpoint', endpoint)
          }
        }
      }
    }
  }

  return NextResponse.json({
    ok: true,
    checked: settings.length,
    sent,
    failed,
    timestamp: now.toISOString(),
  })
}
