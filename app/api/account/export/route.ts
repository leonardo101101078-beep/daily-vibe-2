import { NextResponse } from 'next/server'
import JSZip from 'jszip'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'
import { rowsToCsv } from '@/lib/account/csv'
import type { ExportBody } from '@/lib/account/export-types'

export const runtime = 'nodejs'

const MAX_EXPORTS_PER_USER_PER_DAY = 8

const rateBucket = new Map<string, number>()

function rateKey(userId: string): string {
  const day = new Date().toISOString().slice(0, 10)
  return `${userId}:${day}`
}

export async function POST(request: Request) {
  const resendKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.RESEND_FROM_EMAIL
  if (!resendKey || !fromEmail) {
    return NextResponse.json(
      { error: '匯出寄信未設定：請設定 RESEND_API_KEY 與 RESEND_FROM_EMAIL' },
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
  if ((rateBucket.get(rk) ?? 0) >= MAX_EXPORTS_PER_USER_PER_DAY) {
    return NextResponse.json({ error: '今日匯出次數已達上限，請明日再試' }, { status: 429 })
  }

  let body: ExportBody
  try {
    body = (await request.json()) as ExportBody
  } catch {
    return NextResponse.json({ error: '無效的請求內容' }, { status: 400 })
  }

  const raw = body.sections
  if (!raw) {
    return NextResponse.json({ error: '請至少勾選一項資料區塊' }, { status: 400 })
  }

  // profile / taskTemplates in body are ignored (legacy clients)
  const s = {
    dailyLogs: !!raw.dailyLogs,
    dailyWellness: !!raw.dailyWellness,
    dailyReviews: !!raw.dailyReviews,
  }

  if (!s.dailyLogs && !s.dailyWellness && !s.dailyReviews) {
    return NextResponse.json({ error: '請至少勾選一項資料區塊' }, { status: 400 })
  }

  const { dateFrom, dateTo } = body

  const zip = new JSZip()

  if (s.dailyLogs) {
    let q = supabase
      .from('daily_logs')
      .select('*, task_templates(title, category)')
      .eq('user_id', user.id)

    if (dateFrom) q = q.gte('date', dateFrom)
    if (dateTo) q = q.lte('date', dateTo)

    const { data: logs, error } = await q
      .order('date', { ascending: false })
      .limit(20000)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (logs?.length) {
      const headers = [
        'id',
        'date',
        'task_template_id',
        'task_title',
        'task_category',
        'status',
        'note',
        'progress',
        'completed_at',
        'created_at',
        'updated_at',
      ]
      const rows = logs.map((log) => {
        const row = log as {
          id: string
          date: string
          task_template_id: string
          status: string
          note: string | null
          progress: number | null
          completed_at: string | null
          created_at: string
          updated_at: string
          task_templates: { title?: string; category?: string } | null
        }
        const tt = row.task_templates
        return [
          row.id,
          row.date,
          row.task_template_id,
          tt?.title ?? '',
          tt?.category ?? '',
          row.status,
          row.note,
          row.progress,
          row.completed_at,
          row.created_at,
          row.updated_at,
        ]
      })
      zip.file('daily_logs.csv', rowsToCsv(headers, rows))
    } else {
      zip.file('daily_logs.csv', rowsToCsv(['message'], [['（無資料）']]))
    }
  }

  if (s.dailyWellness) {
    let q = supabase.from('daily_wellness').select('*').eq('user_id', user.id)

    if (dateFrom) q = q.gte('date', dateFrom)
    if (dateTo) q = q.lte('date', dateTo)

    const { data: wellness, error } = await q
      .order('date', { ascending: false })
      .limit(20000)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (wellness?.length) {
      const headers = [
        'id',
        'date',
        'weight',
        'diet_note',
        'exercise_done',
        'exercise_note',
        'created_at',
        'updated_at',
      ]
      const rows = wellness.map((w) => [
        w.id,
        w.date,
        w.weight,
        w.diet_note,
        w.exercise_done,
        w.exercise_note,
        w.created_at,
        w.updated_at,
      ])
      zip.file('daily_wellness.csv', rowsToCsv(headers, rows))
    } else {
      zip.file('daily_wellness.csv', rowsToCsv(['message'], [['（無資料）']]))
    }
  }

  if (s.dailyReviews) {
    let q = supabase.from('daily_reviews').select('*').eq('user_id', user.id)

    if (dateFrom) q = q.gte('date', dateFrom)
    if (dateTo) q = q.lte('date', dateTo)

    const { data: reviews, error } = await q
      .order('date', { ascending: false })
      .limit(20000)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (reviews?.length) {
      const headers = [
        'id',
        'date',
        'review_text',
        'tomorrow_plan',
        'mood',
        'created_at',
        'updated_at',
      ]
      const rows = reviews.map((r) => [
        r.id,
        r.date,
        r.review_text,
        r.tomorrow_plan,
        r.mood,
        r.created_at,
        r.updated_at,
      ])
      zip.file('daily_reviews.csv', rowsToCsv(headers, rows))
    } else {
      zip.file('daily_reviews.csv', rowsToCsv(['message'], [['（無資料）']]))
    }
  }

  const buffer = Buffer.from(await zip.generateAsync({ type: 'arraybuffer' }))
  const stamp = new Date().toISOString().slice(0, 10)
  const filename = `daily-vibe-2.0-export-${stamp}.zip`

  const resend = new Resend(resendKey)
  const { error: sendError } = await resend.emails.send({
    from: fromEmail,
    to: user.email,
    subject: `Daily-Vibe 2.0 資料匯出（${stamp}）`,
    text: `附件為您勾選的 Daily-Vibe 2.0 資料匯出（CSV 打包為 ZIP）。若未收到附件，請檢查垃圾郵件匣。`,
    attachments: [{ filename, content: buffer }],
  })

  if (sendError) {
    return NextResponse.json(
      { error: sendError.message ?? '寄信失敗' },
      { status: 502 },
    )
  }

  rateBucket.set(rk, (rateBucket.get(rk) ?? 0) + 1)

  return NextResponse.json({ ok: true, message: `已寄至 ${user.email}` })
}
