import { getLocalDB } from '@/lib/local/dexie-db'

export async function countDirtyRows(): Promise<number> {
  const db = getLocalDB()
  const chunks = await Promise.all([
    db.taskTemplates.filter((t) => t.dirty).toArray(),
    db.dailyLogs.filter((l) => l.dirty).toArray(),
    db.dailyReviews.filter((r) => r.dirty).toArray(),
    db.dailyWellness.filter((w) => w.dirty).toArray(),
    db.annualGoals.filter((g) => g.dirty).toArray(),
    db.monthlyGoals.filter((g) => g.dirty).toArray(),
    db.weeklyGoals.filter((g) => g.dirty).toArray(),
    db.profiles.filter((p) => p.dirty).toArray(),
    db.notificationSettings.filter((n) => n.dirty).toArray(),
  ])
  return chunks.reduce((acc, a) => acc + a.length, 0)
}
