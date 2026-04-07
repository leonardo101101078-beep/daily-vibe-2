const STORAGE_KEY = 'daily-vibe-2.0:device_id'

function randomId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `dev_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`
}

/** Stable per-browser device id for sync bookkeeping. */
export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return 'ssr'
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY)
    if (existing) return existing
    const id = randomId()
    window.localStorage.setItem(STORAGE_KEY, id)
    return id
  } catch {
    return randomId()
  }
}
