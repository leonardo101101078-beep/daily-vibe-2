import type { WellnessFormState } from '@/lib/actions/wellness'
import { getLocalDB } from '@/lib/local/dexie-db'

export async function getWellnessForDateLocal(
  userId: string,
  date: string,
): Promise<WellnessFormState | null> {
  const db = getLocalDB()
  const row = await db.dailyWellness
    .where('user_id')
    .equals(userId)
    .filter((w) => w.date === date)
    .first()
  if (!row) return null
  return {
    weight: row.weight != null ? Number(row.weight) : null,
    diet_note: row.diet_note,
    exercise_done: row.exercise_done,
    exercise_note: row.exercise_note,
  }
}

export async function getDailyReviewTextLocal(
  userId: string,
  date: string,
): Promise<string | null> {
  const db = getLocalDB()
  const row = await db.dailyReviews
    .where('user_id')
    .equals(userId)
    .filter((r) => r.date === date)
    .first()
  return row?.review_text ?? null
}

function newId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `w_${Date.now()}_${Math.random().toString(36).slice(2)}`
}

export async function upsertWellnessLocal(
  userId: string,
  date: string,
  payload: WellnessFormState,
): Promise<void> {
  const db = getLocalDB()
  const existing = await db.dailyWellness
    .where('user_id')
    .equals(userId)
    .filter((w) => w.date === date)
    .first()

  const now = new Date().toISOString()
  if (existing) {
    await db.dailyWellness.put({
      ...existing,
      weight: payload.weight,
      diet_note: payload.diet_note?.trim() || null,
      exercise_done: payload.exercise_done,
      exercise_note: payload.exercise_note?.trim() || null,
      updated_at: now,
      dirty: true,
    })
    return
  }

  await db.dailyWellness.put({
    id: newId(),
    user_id: userId,
    date,
    weight: payload.weight,
    diet_note: payload.diet_note?.trim() || null,
    exercise_done: payload.exercise_done,
    exercise_note: payload.exercise_note?.trim() || null,
    sync_revision: 1,
    created_at: now,
    updated_at: now,
    dirty: true,
    serverRevision: 0,
  })
}

export async function upsertDailyNoteLocal(
  userId: string,
  date: string,
  reviewText: string,
): Promise<void> {
  const db = getLocalDB()
  const text = reviewText.trim() || null
  const existing = await db.dailyReviews
    .where('user_id')
    .equals(userId)
    .filter((r) => r.date === date)
    .first()

  const now = new Date().toISOString()
  if (existing) {
    await db.dailyReviews.put({
      ...existing,
      review_text: text,
      updated_at: now,
      dirty: true,
    })
    return
  }

  await db.dailyReviews.put({
    id: newId(),
    user_id: userId,
    date,
    review_text: text,
    tomorrow_plan: null,
    mood: null,
    sync_revision: 1,
    created_at: now,
    updated_at: now,
    dirty: true,
    serverRevision: 0,
  })
}
