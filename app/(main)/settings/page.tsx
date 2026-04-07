import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/session'
import { SettingsClient } from '@/components/settings/SettingsClient'

export const metadata = {
  title: '個人檔案',
}

export default async function SettingsPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const supabase = createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, username')
    .eq('id', user.id)
    .maybeSingle()

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-5 pb-28 pt-10">
        <h1 className="font-display text-2xl font-extrabold tracking-tight">
          個人檔案
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          名稱、信箱、週報與資料匯出、登出與刪除帳戶
        </p>
        <SettingsClient
          initialEmail={user.email ?? ''}
          displayName={profile?.display_name ?? null}
          username={profile?.username ?? null}
        />
      </div>
    </main>
  )
}
