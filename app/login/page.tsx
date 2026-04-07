'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CalendarDays, Loader2, Lock, Mail } from 'lucide-react'
import { AppIcon } from '@/components/AppIcon'
import { createClient } from '@/lib/supabase/client'
import { APP_DISPLAY_NAME } from '@/lib/app-brand'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    router.replace('/today')
    router.refresh()
  }

  const handleForgot = async () => {
    if (!email.trim()) {
      setError('請先輸入信箱，再按忘記密碼')
      return
    }
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback`,
    })
    setLoading(false)
    if (error) setError(error.message)
    else setError('')
    if (!error) {
      alert('已寄出重設密碼信，請至信箱點擊連結。')
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-bento-peach/90 via-background to-bento-sky/40 px-6">
      <div className="w-full max-w-xs space-y-7 rounded-3xl border border-border/50 bg-card/90 p-6 shadow-xl shadow-primary/5 backdrop-blur-sm">
        <div className="space-y-3 text-center">
          <div className="flex justify-center">
            <div className="rounded-2xl bg-primary/12 p-5 transition-transform duration-200 hover:scale-105">
              <AppIcon
                icon={CalendarDays}
                size="md"
                className="h-10 w-10 text-primary"
              />
            </div>
          </div>
          <div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight">
              {APP_DISPLAY_NAME}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              使用信箱與密碼登入
            </p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-3">
          <div className="relative">
            <AppIcon
              icon={Mail}
              size="sm"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full rounded-xl border border-input bg-background py-3 pl-10 pr-4 text-sm transition-shadow duration-200 focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="relative">
            <AppIcon
              icon={Lock}
              size="sm"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="password"
              placeholder="密碼"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full rounded-xl border border-input bg-background py-3 pl-10 pr-4 text-sm transition-shadow duration-200 focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <button
            type="submit"
            disabled={loading || !email || !password}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-md transition-all duration-200 hover:brightness-105 active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? (
              <AppIcon icon={Loader2} size="sm" className="animate-spin" />
            ) : null}
            {loading ? '登入中…' : '登入'}
          </button>
        </form>

        <div className="flex flex-col gap-2 text-center text-xs">
          <button
            type="button"
            onClick={handleForgot}
            disabled={loading}
            className="text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            忘記密碼
          </button>
          <p className="text-muted-foreground">
            還沒有帳號？{' '}
            <Link
              href="/register"
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              註冊
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
