import { createBrowserClient } from '@supabase/ssr'
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/supabase/env'

/**
 * Creates a Supabase client for use in Client Components.
 * Reads credentials from NEXT_PUBLIC_ env vars.
 */
export function createClient() {
  return createBrowserClient(getSupabaseUrl(), getSupabaseAnonKey())
}
