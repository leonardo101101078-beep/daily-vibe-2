'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function upsertDailyNote(date: string, reviewText: string): Promise<void> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const text = reviewText.trim() || null

  const { data: row } = await supabase
    .from('daily_reviews')
    .select('id')
    .eq('user_id', user.id)
    .eq('date', date)
    .maybeSingle()

  if (row) {
    const { error } = await supabase
      .from('daily_reviews')
      .update({ review_text: text })
      .eq('id', row.id)
    if (error) throw new Error(error.message)
  } else {
    const { error } = await supabase.from('daily_reviews').insert({
      user_id: user.id,
      date,
      review_text: text,
      tomorrow_plan: null,
      mood: null,
    })
    if (error) throw new Error(error.message)
  }

  revalidatePath('/today')
}
