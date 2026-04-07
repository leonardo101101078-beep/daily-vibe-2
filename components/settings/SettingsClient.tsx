'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, LogOut, Mail } from 'lucide-react'
import { AppIcon } from '@/components/AppIcon'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ExportBody } from '@/lib/account/export-types'
import { updateDisplayName } from '@/lib/actions/profile'

const DELETE_CONFIRM_PHRASE = '確認刪除'

type Props = {
  initialEmail: string
  displayName: string | null
  username: string | null
}

export function SettingsClient({ initialEmail, displayName, username }: Props) {
  const router = useRouter()
  const [nameValue, setNameValue] = useState(displayName ?? '')
  const [nameLoading, setNameLoading] = useState(false)
  const [nameMsg, setNameMsg] = useState('')
  const [email, setEmail] = useState(initialEmail)
  const [newEmail, setNewEmail] = useState('')
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailMsg, setEmailMsg] = useState('')

  const [sections, setSections] = useState({
    profile: true,
    taskTemplates: true,
    dailyLogs: true,
    dailyWellness: true,
    dailyReviews: true,
  })
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [exportLoading, setExportLoading] = useState(false)
  const [exportMsg, setExportMsg] = useState('')

  const [wrFrom, setWrFrom] = useState('')
  const [wrTo, setWrTo] = useState('')
  const [wrLoading, setWrLoading] = useState(false)
  const [wrMsg, setWrMsg] = useState('')

  const [logoutLoading, setLogoutLoading] = useState(false)

  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteMsg, setDeleteMsg] = useState('')

  useEffect(() => {
    setNameValue(displayName ?? '')
  }, [displayName])

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault()
    setNameLoading(true)
    setNameMsg('')
    try {
      await updateDisplayName(nameValue)
      setNameMsg('已儲存名稱')
      router.refresh()
    } catch (err) {
      setNameMsg(err instanceof Error ? err.message : '儲存失敗')
    } finally {
      setNameLoading(false)
    }
  }

  const handleWeeklyReport = async () => {
    if (!wrFrom || !wrTo) {
      setWrMsg('請選擇起始與結束日期')
      return
    }
    setWrLoading(true)
    setWrMsg('')
    try {
      const res = await fetch('/api/account/weekly-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dateFrom: wrFrom, dateTo: wrTo }),
      })
      const data = (await res.json()) as { ok?: boolean; message?: string; error?: string }
      if (!res.ok) {
        setWrMsg(data.error ?? '寄送失敗')
        return
      }
      setWrMsg(data.message ?? '已寄出')
    } catch {
      setWrMsg('網路錯誤')
    } finally {
      setWrLoading(false)
    }
  }

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newEmail.trim() || newEmail.trim() === email) return
    setEmailLoading(true)
    setEmailMsg('')
    const supabase = createClient()
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const { error } = await supabase.auth.updateUser(
      { email: newEmail.trim() },
      { emailRedirectTo: `${origin}/auth/callback` },
    )
    setEmailLoading(false)
    if (error) {
      setEmailMsg(error.message)
      return
    }
    setEmailMsg('已寄出驗證信至新信箱，請點擊信內連結完成變更。')
    setNewEmail('')
  }

  const handleExport = async () => {
    setExportLoading(true)
    setExportMsg('')
    const body: ExportBody = {
      sections: {
        profile: sections.profile,
        taskTemplates: sections.taskTemplates,
        dailyLogs: sections.dailyLogs,
        dailyWellness: sections.dailyWellness,
        dailyReviews: sections.dailyReviews,
      },
      dateFrom: dateFrom || null,
      dateTo: dateTo || null,
    }
    try {
      const res = await fetch('/api/account/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = (await res.json()) as { ok?: boolean; message?: string; error?: string }
      if (!res.ok) {
        setExportMsg(data.error ?? '匯出失敗')
        return
      }
      setExportMsg(data.message ?? '已寄出')
    } catch {
      setExportMsg('網路錯誤')
    } finally {
      setExportLoading(false)
    }
  }

  const handleLogout = async () => {
    setLogoutLoading(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/login')
    router.refresh()
  }

  const handleDelete = async () => {
    if (deleteConfirm !== DELETE_CONFIRM_PHRASE) {
      setDeleteMsg(`請輸入「${DELETE_CONFIRM_PHRASE}」以確認`)
      return
    }
    setDeleteLoading(true)
    setDeleteMsg('')
    try {
      const res = await fetch('/api/account/delete', { method: 'POST' })
      const data = (await res.json()) as { ok?: boolean; error?: string }
      if (!res.ok) {
        setDeleteMsg(data.error ?? '刪除失敗')
        setDeleteLoading(false)
        return
      }
      const supabase = createClient()
      await supabase.auth.signOut()
      router.replace('/login')
      router.refresh()
    } catch {
      setDeleteMsg('網路錯誤')
      setDeleteLoading(false)
    }
  }

  return (
    <div className="mt-8 space-y-6">
      <Card>
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="text-lg">個人資訊</CardTitle>
          <CardDescription>顯示名稱可編輯；使用者名稱（username）由系統同步。</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateName} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="display-name">顯示名稱</Label>
              <Input
                id="display-name"
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                placeholder="你的名字"
                className="rounded-xl"
                maxLength={80}
              />
            </div>
            {nameMsg ? (
              <p className="text-xs text-muted-foreground">{nameMsg}</p>
            ) : null}
            <Button type="submit" disabled={nameLoading}>
              {nameLoading ? (
                <AppIcon icon={Loader2} size="sm" className="animate-spin" />
              ) : null}
              儲存名稱
            </Button>
          </form>
          <p className="mt-4 text-sm text-muted-foreground">
            使用者名稱：<span className="text-foreground">{username ?? '—'}</span>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="text-lg">登入信箱</CardTitle>
          <CardDescription>目前：{email || '—'}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateEmail} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="new-email" className="flex items-center gap-2">
                <AppIcon
                  icon={Mail}
                  size="sm"
                  className="text-muted-foreground"
                />
                變更為新信箱
              </Label>
              <Input
                id="new-email"
                type="email"
                autoComplete="email"
                placeholder="new@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="rounded-xl"
              />
            </div>
            {emailMsg ? (
              <p className="text-xs text-muted-foreground">{emailMsg}</p>
            ) : null}
            <Button type="submit" disabled={emailLoading || !newEmail.trim()}>
              {emailLoading ? (
                <AppIcon icon={Loader2} size="sm" className="animate-spin" />
              ) : null}
              送出變更（將寄驗證信）
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="text-lg">匯出週報</CardTitle>
          <CardDescription>
            選擇日期區間，將摘要週報寄至目前登入信箱（{email || '—'}）。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="wr-from">起始日</Label>
              <Input
                id="wr-from"
                type="date"
                value={wrFrom}
                onChange={(e) => setWrFrom(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wr-to">結束日</Label>
              <Input
                id="wr-to"
                type="date"
                value={wrTo}
                onChange={(e) => setWrTo(e.target.value)}
                className="rounded-xl"
              />
            </div>
          </div>
          {wrMsg ? (
            <p className="text-xs text-muted-foreground">{wrMsg}</p>
          ) : null}
          <Button type="button" onClick={handleWeeklyReport} disabled={wrLoading}>
            {wrLoading ? (
              <AppIcon icon={Loader2} size="sm" className="animate-spin" />
            ) : null}
            寄送週報至信箱
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="text-lg">完整資料匯出（ZIP）</CardTitle>
          <CardDescription>
            勾選要匯出的區塊，可選日期範圍（適用於日誌、健康、回顧；模板與個人檔為全量）。ZIP 內含 CSV，將寄至目前登入信箱。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            {(
              [
                ['profile', '個人檔（profiles）'],
                ['taskTemplates', '任務模板'],
                ['dailyLogs', '每日任務日誌'],
                ['dailyWellness', '健康管理'],
                ['dailyReviews', '每日回顧'],
              ] as const
            ).map(([key, label]) => (
              <label
                key={key}
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-border/60 px-3 py-2"
              >
                <Checkbox
                  checked={sections[key]}
                  onCheckedChange={(v) =>
                    setSections((s) => ({ ...s, [key]: v === true }))
                  }
                />
                <span className="text-sm">{label}</span>
              </label>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="date-from">起始日（選填）</Label>
              <Input
                id="date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="date-to">結束日（選填）</Label>
              <Input
                id="date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="rounded-xl"
              />
            </div>
          </div>
          {exportMsg ? (
            <p className="text-xs text-muted-foreground">{exportMsg}</p>
          ) : null}
          <Button type="button" onClick={handleExport} disabled={exportLoading}>
            {exportLoading ? (
              <AppIcon icon={Loader2} size="sm" className="animate-spin" />
            ) : null}
            產生 ZIP 並寄至信箱
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">登出</CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            variant="outline"
            onClick={handleLogout}
            disabled={logoutLoading}
            className="w-full sm:w-auto"
          >
            {logoutLoading ? (
              <AppIcon icon={Loader2} size="sm" className="animate-spin" />
            ) : (
              <AppIcon icon={LogOut} size="sm" />
            )}
            登出此裝置
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="text-lg text-destructive">刪除帳戶</CardTitle>
          <CardDescription>
            將永久刪除帳號與所有關聯資料，無法復原。請輸入「{DELETE_CONFIRM_PHRASE}」後再按按鈕。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder={DELETE_CONFIRM_PHRASE}
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            className="rounded-xl"
            autoComplete="off"
          />
          {deleteMsg ? <p className="text-xs text-destructive">{deleteMsg}</p> : null}
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteLoading}
          >
            {deleteLoading ? (
              <AppIcon icon={Loader2} size="sm" className="animate-spin" />
            ) : null}
            刪除我的帳戶
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
