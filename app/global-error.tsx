'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="zh-TW">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif' }}>
        <main
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            textAlign: 'center',
            background: '#fafafa',
            color: '#171717',
          }}
        >
          <h1 style={{ fontSize: '1.125rem', fontWeight: 600 }}>
            Daily-Vibe 2.0 無法載入
          </h1>
          <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#525252', maxWidth: '20rem' }}>
            根版面發生嚴重錯誤。請重新整理頁面；若持續發生，請清除本站 Service Worker
            與快取後再試。
          </p>
          {process.env.NODE_ENV === 'development' && (
            <pre
              style={{
                marginTop: '1rem',
                maxWidth: '100%',
                overflow: 'auto',
                fontSize: '0.75rem',
                color: '#b91c1c',
                textAlign: 'left',
              }}
            >
              {error.message}
            </pre>
          )}
          <button
            type="button"
            onClick={() => reset()}
            style={{
              marginTop: '1.25rem',
              border: 'none',
              borderRadius: '0.75rem',
              padding: '0.625rem 1.25rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              background: '#6366f1',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            再試一次
          </button>
        </main>
      </body>
    </html>
  )
}
