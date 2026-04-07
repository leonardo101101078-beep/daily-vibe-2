'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Daily-Vibe 2.0]', error)
  }, [error])

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <div className="max-w-sm space-y-2">
        <h1 className="text-lg font-semibold text-foreground">發生錯誤</h1>
        <p className="text-sm text-muted-foreground">
          頁面無法正常顯示。若剛更新過專案，可試著清除快取後重新整理，或刪除{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">.next</code>{' '}
          後再執行{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">npm run dev</code>
          。
        </p>
        {process.env.NODE_ENV === 'development' && (
          <pre className="mt-3 max-h-32 overflow-auto rounded-lg border bg-muted/50 p-2 text-left text-xs text-destructive">
            {error.message}
          </pre>
        )}
      </div>
      <button
        type="button"
        onClick={() => reset()}
        className="rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
      >
        再試一次
      </button>
    </main>
  )
}
