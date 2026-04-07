const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  // Directory containing index.ts (or src/index.ts) for push + notificationclick.
  // Must be a folder path — not worker/index.ts (see @ducanh2912/next-pwa buildCustomWorker).
  customWorkerSrc: 'worker',
  reloadOnOnline: true,
  // App Router + aggressive nav caching can serve stale/empty shells → blank white page.
  cacheOnFrontEndNav: false,
  aggressiveFrontEndNavCaching: false,
  // Avoid precaching "/" and the NetworkFirst "start-url" rule — they caused stale HTML after deploy.
  cacheStartUrl: false,
  dynamicStartUrl: false,
  runtimeCaching: [
    {
      // HTML navigations: always network (no stale shell after refresh / new deploy).
      urlPattern: ({ request }) => request.mode === 'navigate',
      handler: 'NetworkOnly',
    },
    {
      // 即時資料為主：避免快取舊 REST 回應；本機資料以 IndexedDB 為準（見 lib/local、lib/sync）。
      urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/.*/i,
      handler: 'NetworkOnly',
    },
  ],
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
}

module.exports = withPWA(nextConfig)
