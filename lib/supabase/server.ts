import { createServerClient } from '@supabase/ssr'
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/supabase/env'
import { cookies } from 'next/headers'

/**
 * Creates a Supabase client for use in Server Components, Server Actions,
 * and Route Handlers. Manages session cookies automatically.
 *
 * Note: No Database generic — hand-written Row/Insert interfaces do not
 * satisfy postgrest-js GenericTable (Record<string, unknown>) and break
 * `.upsert()` inference. Use `supabase gen types` for full typing.
 */
export function createClient() {
  const cookieStore = cookies()

  return createServerClient(
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
            options?: Parameters<ReturnType<typeof cookies>['set']>[2]
          }[],
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // setAll called from a Server Component — safe to ignore.
            // Auth middleware should handle session refresh.
          }
        },
      },
    },
  )
}
