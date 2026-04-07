import { createServerClient } from '@supabase/ssr'
import type { User } from '@supabase/supabase-js'
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/supabase/env'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const supabaseUrl = getSupabaseUrl()
  const supabaseAnonKey = getSupabaseAnonKey()

  let supabaseResponse = NextResponse.next({ request })
  let user: User | null = null

  if (supabaseUrl && supabaseAnonKey) {
    try {
      const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(
            cookiesToSet: {
              name: string
              value: string
              options?: Parameters<typeof supabaseResponse.cookies.set>[2]
            }[],
          ) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value),
            )
            supabaseResponse = NextResponse.next({ request })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options),
            )
          },
        },
      })

      // Refresh session — must NOT be removed, keeps JWT fresh
      const {
        data: { user: u },
      } = await supabase.auth.getUser()
      user = u
    } catch (err) {
      console.error('[middleware] Supabase error:', err)
      supabaseResponse = NextResponse.next({ request })
      user = null
    }
  } else {
    console.error(
      '[middleware] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY',
    )
  }

  const { pathname } = request.nextUrl

  const isPublicPath =
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/auth')

  if (!user && !isPublicPath) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    const res = NextResponse.redirect(loginUrl)
    res.headers.set(
      'Cache-Control',
      'private, no-cache, no-store, must-revalidate',
    )
    return res
  }

  if (user && (pathname === '/login' || pathname === '/register')) {
    const homeUrl = request.nextUrl.clone()
    homeUrl.pathname = '/today'
    const res = NextResponse.redirect(homeUrl)
    res.headers.set(
      'Cache-Control',
      'private, no-cache, no-store, must-revalidate',
    )
    return res
  }

  supabaseResponse.headers.set(
    'Cache-Control',
    'private, no-cache, no-store, must-revalidate',
  )
  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons|manifest).*)',
  ],
}
