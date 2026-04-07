import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const MAX_PER_DAY = 6

function rateKey(userId: string): string {
  const day = new Date().toISOString().slice(0, 10)
  return `${userId}:weekly:${day}`
}

const rateBucket = new Map<string, number>()

export async function POST(request: Request) {
  const resendKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.RESEND_FROM_EMAIL
  if (!resendKey || !fromEmail) {
    return NextResponse.json(
      { error: '寄信未設定：RESEND_API_KEY 與 RESEND_FROM_EMAIL' },
      { status: 503 },
    )
  }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) {
    return NextResponse.json({ error: '未登入' }, { status: 401 })
  }

  const rk = rateKey(user.id)
  if ((rateBucket.get(rk) ?? 0) >= MAX_PER_DAY) {
    return NextResponse.json({ error: '今日寄送次數已達上限' }, { status: 429 })
  }

  let body: { dateFrom?: string; dateTo?: string }
  try {
    body = (await request.json()) as { dateFrom?: string; dateTo?: string }
  } catch {
    return NextResponse.json({ error: '無效的請求內容' }, { status: 400 })
  }

  const { dateFrom, dateTo } = body
  if (!dateFrom || !dateTo || !/^\d{4}-\d{2}-\d{2}$/.test(dateFrom) || !/^\d{4}-\d{2}-\d{2}$/.test(dateTo)) {
    return NextResponse.json({ error: '請提供 dateFrom、dateTo（YYYY-MM-DD）' }, { status: 400 })
  }
  if (dateFrom > dateTo) {
    return NextResponse.json({ error: '起始日不可晚於結束日' }, { status: 400 })
  }

  /** Aggregate only — no task template titles or join to profiles. */
  const { data: logRows, error: logsErr } = await supabase
    .from('daily_logs')
    .select('date, status')
    .eq('user_id', user.id)
    .gte('date', dateFrom)
    .lte('date', dateTo)

  if (logsErr) {
    return NextResponse.json({ error: logsErr.message }, { status: 500 })
  }

  const { data: wellnessRows } = await supabase
    .from('daily_wellness')
    .select('date, weight, diet_note, exercise_done, exercise_note')
    .eq('user_id', user.id)
    .gte('date', dateFrom)
    .lte('date', dateTo)
    .order('date', { ascending: true })

  const { data: reviewRows } = await supabase
    .from('daily_reviews')
    .select('date, review_text')
    .eq('user_id', user.id)
    .gte('date', dateFrom)
    .lte('date', dateTo)
    .order('date', { ascending: true })

  const byDate = new Map<string, { done: number; total: number }>()
  for (const log of logRows ?? []) {
    const d = log.date
    if (!byDate.has(d)) byDate.set(d, { done: 0, total: 0 })
    const x = byDate.get(d)!
    x.total += 1
    if (log.status === 'completed') x.done += 1
  }

  const summaryLines: string[] = []
  const sortedDates = Array.from(byDate.entries()).sort((a, b) =>
    a[0].localeCompare(b[0]),
  )
  for (const [d, { done, total }] of sortedDates) {
    const pct = total > 0 ? Math.round((done / total) * 100) : 0
    summaryLines.push(`${d}：完成 ${done}/${total}（${pct}%）`)
  }

  const linesHtml = summaryLines.length
    ? `<ul>${summaryLines.map((l) => `<li>${escapeHtml(l)}</li>`).join('')}</ul>`
    : '<p>（此區間無任務日誌）</p>'

  const wellnessHtml = (wellnessRows ?? [])
    .map(
      (w) =>
        `<p><strong>${escapeHtml(w.date)}</strong> 體重：${w.weight ?? '—'}；運動：${w.exercise_done ? '有' : '無'}；飲食：${escapeHtml((w.diet_note ?? '').slice(0, 200))}</p>`,
    )
    .join('')

  const notesHtml = (reviewRows ?? [])
    .filter((r) => r.review_text?.trim())
    .map(
      (r) =>
        `<p><strong>${escapeHtml(r.date)}</strong><br/>${escapeHtml(r.review_text ?? '').replace(/\n/g, '<br/>')}</p>`,
    )
    .join('')

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; line-height: 1.5;">
  <h2>Daily-Vibe 2.0 週報摘要</h2>
  <p>區間：${escapeHtml(dateFrom)} ～ ${escapeHtml(dateTo)}</p>
  <h3>每日完成度</h3>
  ${linesHtml}
  <h3>健康管理</h3>
  ${wellnessHtml || '<p>（無）</p>'}
  <h3>筆記摘錄</h3>
  ${notesHtml || '<p>（無）</p>'}
</body>
</html>`

  const resend = new Resend(resendKey)
  const { error } = await resend.emails.send({
    from: fromEmail,
    to: user.email,
    subject: `Daily-Vibe 2.0 週報 ${dateFrom} ~ ${dateTo}`,
    html,
  })

  if (error) {
    return NextResponse.json(
      { error: typeof error === 'string' ? error : '寄信失敗' },
      { status: 502 },
    )
  }

  rateBucket.set(rk, (rateBucket.get(rk) ?? 0) + 1)

  return NextResponse.json({ ok: true, message: `已寄至 ${user.email}` })
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
