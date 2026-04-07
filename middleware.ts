import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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
          // Write updated cookies to both the request and the response
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // Refresh session — must NOT be removed, keeps JWT fresh
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Unauthenticated users can only access /login and /auth/*.
  // All other routes (e.g. /, /templates) require a session.
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

  // Authenticated users visiting /login or /register → redirect to home
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
    // Run on all paths except static files, images, and icons
    '/((?!_next/static|_next/image|favicon.ico|icons|manifest).*)',
  ],
}
