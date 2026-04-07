import { createServerClient } from '@supabase/ssr'
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/supabase/env'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/today'
  const errorParam = searchParams.get('error')

  // If Supabase returned an error in the URL, redirect to login with message
  if (errorParam) {
    return NextResponse.redirect(`${origin}/login?error=${errorParam}`)
  }

  if (code) {
    const cookieStore = cookies()

    const supabase = createServerClient(
      getSupabaseUrl(),
      getSupabaseAnonKey(),
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(
            cookiesToSet: {
              name: string
              value: string
              options?: Parameters<typeof cookieStore.set>[2]
            }[],
          ) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          },
        },
      },
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Successful auth — redirect to the intended page (default: home)
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Something went wrong — redirect back to login
  return NextResponse.redirect(`${origin}/login?error=auth_code_error`)
}
