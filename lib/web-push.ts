// =============================================================================
// Daily-Vibe 2.0 — web-push Utility
// =============================================================================
// Server-side only. Import only in API routes or Server Actions.
// =============================================================================

import webPush from 'web-push'

const subj = process.env.VAPID_SUBJECT
const pub = process.env.VAPID_PUBLIC_KEY
const priv = process.env.VAPID_PRIVATE_KEY
if (subj && pub && priv) {
  try {
    webPush.setVapidDetails(subj, pub, priv)
  } catch {
    /* invalid keys in dev / CI — push disabled until env fixed */
  }
}

export interface PushPayload {
  title: string
  body: string
  url?: string
}

/**
 * Sends a Web Push notification to a single subscription.
 *
 * Returns the web-push SendResult on success.
 * Throws if the push service returns a non-2xx status.
 */
export async function sendPushNotification(
  endpoint: string,
  p256dh: string,
  auth: string,
  payload: PushPayload,
): Promise<webPush.SendResult> {
  return webPush.sendNotification(
    { endpoint, keys: { p256dh, auth } },
    JSON.stringify(payload),
    {
      TTL: 60 * 60 * 4, // keep message for 4 hours if device is offline
    },
  )
}

export default webPush
