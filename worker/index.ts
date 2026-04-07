// =============================================================================
// Daily-Vibe 2.0 — Custom Service Worker Extension
// =============================================================================
// This file is compiled and merged into the Workbox-generated SW by
// @ducanh2912/next-pwa via the `customWorkerSrc: 'worker/index.ts'` option.
//
// It adds:
//   - push     : displays a native notification when the server sends a push
//   - notificationclick : opens/focuses the app when the user taps a notification
// =============================================================================
// `self` is provided by the service worker global scope (no declare — avoids
// duplicate with merged Workbox bundle during next-pwa child compilation).

type PushPayload = {
  title: string
  body: string
  url?: string
  icon?: string
  badge?: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sw = self as any

// ---------------------------------------------------------------------------
// push — receive a payload from the server and show a native notification
// ---------------------------------------------------------------------------
sw.addEventListener('push', (event: Event) => {
  const pushEvent = event as Event & {
    data?: { json(): PushPayload } | null
    waitUntil(p: Promise<unknown>): void
  }
  const data = pushEvent.data?.json() as PushPayload | undefined

  if (!data) return

  const { title, body, url = '/', icon, badge } = data

  pushEvent.waitUntil(
    sw.registration.showNotification(title, {
      body,
      icon: icon ?? '/icons/icon-192.png',
      badge: badge ?? '/icons/icon-192.png',
      // Stored in event.notification.data so notificationclick can read it
      data: { url },
      // Vibration pattern for Android (milliseconds on/off)
      vibrate: [200, 100, 200],
    }),
  )
})

// ---------------------------------------------------------------------------
// notificationclick — focus an existing window or open a new one
// ---------------------------------------------------------------------------
sw.addEventListener('notificationclick', (event: Event) => {
  const ne = event as Event & {
    notification: Notification
    waitUntil(p: Promise<unknown>): void
  }
  ne.notification.close()

  const targetUrl: string = (ne.notification.data as { url?: string })?.url ?? '/'

  ne.waitUntil(
    sw.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients: unknown) => {
        const clients = windowClients as {
          url: string
          focus?: () => Promise<unknown>
        }[]
        // If app is already open, focus that window
        for (const client of clients) {
          if (client.url === targetUrl && client.focus) {
            return client.focus()
          }
        }
        // Otherwise open a new tab/window
        return sw.clients.openWindow(targetUrl)
      }),
  )
})
