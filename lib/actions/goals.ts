'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type {
  AnnualGoalRow,
  MonthlyGoalRow,
  WeeklyGoalRow,
} from '@/types/database'

const PATHS = ['/focus', '/weekly'] as const

// --- Annual ---
export async function listAnnualGoals(): Promise<AnnualGoalRow[]> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('annual_goals')
    .select('*')
    .eq('user_id', user.id)
    .order('sort_order', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as AnnualGoalRow[]
}

export async function addAnnualGoal(title: string): Promise<void> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const t = title.trim()
  if (!t) throw new Error('請輸入目標')

  const { data: last } = await supabase
    .from('annual_goals')
    .select('sort_order')
    .eq('user_id', user.id)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { error } = await supabase.from('annual_goals').insert({
    user_id: user.id,
    title: t,
    sort_order: (last?.sort_order ?? -1) + 1,
  })

  if (error) throw new Error(error.message)
  for (const p of PATHS) revalidatePath(p)
}

export async function reorderAnnualGoals(orderedIds: string[]): Promise<void> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .from('annual_goals')
      .update({ sort_order: i })
      .eq('id', orderedIds[i])
      .eq('user_id', user.id)

    if (error) throw new Error(error.message)
  }
  for (const p of PATHS) revalidatePath(p)
}

export async function deleteAnnualGoal(id: string): Promise<void> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('annual_goals')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)
  for (const p of PATHS) revalidatePath(p)
}

// --- Monthly ---
export async function listMonthlyGoals(
  year: number,
  month: number,
): Promise<MonthlyGoalRow[]> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('monthly_goals')
    .select('*')
    .eq('user_id', user.id)
    .eq('year', year)
    .eq('month', month)
    .order('sort_order', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as MonthlyGoalRow[]
}

export async function addMonthlyGoal(
  year: number,
  month: number,
  title: string,
): Promise<void> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const t = title.trim()
  if (!t) throw new Error('請輸入目標')

  const { data: last } = await supabase
    .from('monthly_goals')
    .select('sort_order')
    .eq('user_id', user.id)
    .eq('year', year)
    .eq('month', month)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { error } = await supabase.from('monthly_goals').insert({
    user_id: user.id,
    year,
    month,
    title: t,
    sort_order: (last?.sort_order ?? -1) + 1,
  })

  if (error) throw new Error(error.message)
  for (const p of PATHS) revalidatePath(p)
}

export async function reorderMonthlyGoals(
  year: number,
  month: number,
  orderedIds: string[],
): Promise<void> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .from('monthly_goals')
      .update({ sort_order: i })
      .eq('id', orderedIds[i])
      .eq('user_id', user.id)
      .eq('year', year)
      .eq('month', month)

    if (error) throw new Error(error.message)
  }
  for (const p of PATHS) revalidatePath(p)
}

export async function deleteMonthlyGoal(id: string): Promise<void> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('monthly_goals')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)
  for (const p of PATHS) revalidatePath(p)
}

// --- Weekly ---
export async function listWeeklyGoals(weekStart: string): Promise<WeeklyGoalRow[]> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('weekly_goals')
    .select('*')
    .eq('user_id', user.id)
    .eq('week_start', weekStart)
    .order('sort_order', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as WeeklyGoalRow[]
}

export async function addWeeklyGoal(weekStart: string, title: string): Promise<void> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const t = title.trim()
  if (!t) throw new Error('請輸入目標')

  const { data: existing, error: listErr } = await supabase
    .from('weekly_goals')
    .select('id, sort_order')
    .eq('user_id', user.id)
    .eq('week_start', weekStart)
    .order('sort_order', { ascending: false })

  if (listErr) throw new Error(listErr.message)

  for (const row of existing ?? []) {
    const { error: bumpErr } = await supabase
      .from('weekly_goals')
      .update({ sort_order: row.sort_order + 1 })
      .eq('id', row.id)
      .eq('user_id', user.id)
    if (bumpErr) throw new Error(bumpErr.message)
  }

  const { error } = await supabase.from('weekly_goals').insert({
    user_id: user.id,
    week_start: weekStart,
    title: t,
    sort_order: 0,
  })

  if (error) throw new Error(error.message)
  for (const p of PATHS) revalidatePath(p)
}

export async function reorderWeeklyGoals(
  weekStart: string,
  orderedIds: string[],
): Promise<void> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: rows, error: fetchErr } = await supabase
    .from('weekly_goals')
    .select('id')
    .eq('user_id', user.id)
    .eq('week_start', weekStart)
    .order('sort_order', { ascending: true })

  if (fetchErr) throw new Error(fetchErr.message)

  const expected = new Set((rows ?? []).map((r) => r.id as string))
  if (orderedIds.length !== expected.size) throw new Error('排序內容無效')
  for (const id of orderedIds) {
    if (!expected.has(id)) throw new Error('排序內容無效')
  }

  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .from('weekly_goals')
      .update({ sort_order: i })
      .eq('id', orderedIds[i])
      .eq('user_id', user.id)

    if (error) throw new Error(error.message)
  }
  for (const p of PATHS) revalidatePath(p)
}

export async function deleteWeeklyGoal(id: string): Promise<void> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('weekly_goals')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)
  for (const p of PATHS) revalidatePath(p)
}
