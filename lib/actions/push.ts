'use server'

import { createClient } from '@/lib/supabase/server'
import type { NotificationSettingsUpsert } from '@/types/database'

// ---------------------------------------------------------------------------
// subscribePush
// Saves a new PushSubscription to the database, keyed by endpoint.
// Safe to call multiple times — uses upsert to avoid duplicates.
// ---------------------------------------------------------------------------
export async function subscribePush(subscriptionJson: {
  endpoint: string
  keys: { p256dh: string; auth: string }
  userAgent?: string
}): Promise<void> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase.from('subscriptions').upsert(
    {
      user_id: user.id,
      endpoint: subscriptionJson.endpoint,
      p256dh: subscriptionJson.keys.p256dh,
      auth: subscriptionJson.keys.auth,
      user_agent: subscriptionJson.userAgent ?? null,
    },
    { onConflict: 'endpoint' },
  )

  if (error) throw new Error(error.message)

  // Auto-create notification_settings row if it doesn't exist yet
  await supabase
    .from('notification_settings')
    .upsert({ user_id: user.id }, { onConflict: 'user_id', ignoreDuplicates: true })
}

// ---------------------------------------------------------------------------
// unsubscribePush
// Removes a subscription by endpoint. Called when the user turns off the toggle
// or the browser revokes permission.
// ---------------------------------------------------------------------------
export async function unsubscribePush(endpoint: string): Promise<void> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('subscriptions')
    .delete()
    .eq('user_id', user.id)
    .eq('endpoint', endpoint)

  if (error) throw new Error(error.message)
}

// ---------------------------------------------------------------------------
// updateNotificationSettings
// Upserts the user's notification preferences (enabled, times, timezone).
// ---------------------------------------------------------------------------
export async function updateNotificationSettings(
  settings: Pick<
    NotificationSettingsUpsert,
    'enabled' | 'morning_time' | 'evening_time' | 'timezone'
  >,
): Promise<void> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase.from('notification_settings').upsert(
    { user_id: user.id, ...settings },
    { onConflict: 'user_id' },
  )

  if (error) throw new Error(error.message)
}

// ---------------------------------------------------------------------------
// getNotificationSettings
// Returns the current settings for the authenticated user, or null if none.
// ---------------------------------------------------------------------------
export async function getNotificationSettings() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('notification_settings')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  return data
}
