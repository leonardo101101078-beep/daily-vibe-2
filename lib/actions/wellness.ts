'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/session'

export interface WellnessFormState {
  weight: number | null
  diet_note: string | null
  exercise_done: boolean
  exercise_note: string | null
}

export async function getWellnessForDate(
  userId: string,
  date: string,
): Promise<WellnessFormState | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('daily_wellness')
    .select('weight, diet_note, exercise_done, exercise_note')
    .eq('user_id', userId)
    .eq('date', date)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null

  const row = data as {
    weight: number | null
    diet_note: string | null
    exercise_done: boolean
    exercise_note: string | null
  }
  return {
    weight: row.weight != null ? Number(row.weight) : null,
    diet_note: row.diet_note,
    exercise_done: row.exercise_done,
    exercise_note: row.exercise_note,
  }
}

export async function upsertWellness(
  date: string,
  payload: WellnessFormState,
): Promise<void> {
  const user = await getSessionUser()
  if (!user) throw new Error('Not authenticated')

  const supabase = createClient()

  const { error } = await supabase.from('daily_wellness').upsert(
    {
      user_id: user.id,
      date,
      weight: payload.weight,
      diet_note: payload.diet_note?.trim() || null,
      exercise_done: payload.exercise_done,
      exercise_note: payload.exercise_note?.trim() || null,
    },
    { onConflict: 'user_id,date' },
  )

  if (error) throw new Error(error.message)
  revalidatePath('/today')
}
