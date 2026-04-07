// =============================================================================
// Daily-Vibe 2.0 — Supabase Database Types
// =============================================================================
// Usage with the Supabase client:
//
//   import { createClient } from '@supabase/supabase-js'
//   import type { Database } from '@/types/database'
//
//   const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY)
//
// =============================================================================

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

/** Maps to the PostgreSQL `task_status` enum in `public`. */
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'skipped'

// ---------------------------------------------------------------------------
// Table row shapes
// ---------------------------------------------------------------------------

export interface ProfileRow {
  id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
  timezone: string
  /** Monotonic per row; bumps on each server-side UPDATE (see migration 007). */
  sync_revision: number
  created_at: string
  updated_at: string
}

/** `daily` | `weekly` | `every_other_day` = recurring; `once` = single occurrence_date */
export type TaskRecurrence =
  | 'daily'
  | 'once'
  | 'weekly'
  | 'every_other_day'

export interface TaskTemplateRow {
  id: string
  user_id: string
  title: string
  description: string | null
  category: string
  icon: string | null
  color: string | null
  sort_order: number
  is_active: boolean
  target_value: number | null
  unit: string | null
  recurrence: TaskRecurrence
  occurrence_date: string | null // ISO date when recurrence === 'once'
  /** 0=Mon .. 6=Sun when recurrence === 'weekly' */
  recurrence_weekday: number | null
  alternate_anchor_date: string | null // ISO date when recurrence === 'every_other_day'
  sync_revision: number
  created_at: string
  updated_at: string
}

export interface DailyWellnessRow {
  id: string
  user_id: string
  date: string
  weight: number | null
  diet_note: string | null
  exercise_done: boolean
  exercise_note: string | null
  sync_revision: number
  created_at: string
  updated_at: string
}

export interface DailyLogRow {
  id: string
  user_id: string
  task_template_id: string
  date: string              // ISO date string, e.g. "2026-03-30"
  status: TaskStatus
  note: string | null
  progress: number | null
  completed_at: string | null
  sync_revision: number
  created_at: string
  updated_at: string
}

export interface DailyReviewRow {
  id: string
  user_id: string
  date: string              // ISO date string, e.g. "2026-03-30"
  review_text: string | null
  tomorrow_plan: string | null
  mood: 1 | 2 | 3 | 4 | 5 | null
  sync_revision: number
  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// Insert payloads (omit server-generated fields)
// ---------------------------------------------------------------------------

export type ProfileInsert = Omit<
  ProfileRow,
  'created_at' | 'updated_at' | 'sync_revision'
>

export type TaskTemplateInsert = Omit<
  TaskTemplateRow,
  'id' | 'created_at' | 'updated_at' | 'sync_revision'
>

export type DailyWellnessInsert = Omit<
  DailyWellnessRow,
  'id' | 'created_at' | 'updated_at' | 'sync_revision'
>

export type DailyLogInsert = Omit<
  DailyLogRow,
  'id' | 'created_at' | 'updated_at' | 'sync_revision'
>

export type DailyReviewInsert = Omit<
  DailyReviewRow,
  'id' | 'created_at' | 'updated_at' | 'sync_revision'
>

// ---------------------------------------------------------------------------
// Update payloads (all fields optional except immutable keys)
// ---------------------------------------------------------------------------

export type ProfileUpdate = Partial<
  Omit<ProfileRow, 'id' | 'created_at' | 'updated_at' | 'sync_revision'>
>

export type TaskTemplateUpdate = Partial<
  Omit<TaskTemplateRow, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'sync_revision'>
>

export type DailyWellnessUpdate = Partial<
  Omit<
    DailyWellnessRow,
    'id' | 'user_id' | 'date' | 'created_at' | 'updated_at' | 'sync_revision'
  >
>

export type DailyLogUpdate = Partial<
  Omit<
    DailyLogRow,
    | 'id'
    | 'user_id'
    | 'task_template_id'
    | 'date'
    | 'created_at'
    | 'updated_at'
    | 'sync_revision'
  >
>

export type DailyReviewUpdate = Partial<
  Omit<
    DailyReviewRow,
    'id' | 'user_id' | 'date' | 'created_at' | 'updated_at' | 'sync_revision'
  >
>

// ---------------------------------------------------------------------------
// Push notification rows (must appear before Database interface)
// ---------------------------------------------------------------------------

export interface SubscriptionRow {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
  user_agent: string | null
  created_at: string
}

export interface NotificationSettingsRow {
  user_id: string
  enabled: boolean
  morning_time: string
  evening_time: string
  /** Reminder to open the app for nightly cloud sync (~local 23:00). */
  nightly_sync_enabled: boolean
  nightly_sync_time: string
  timezone: string
  sync_revision: number
  updated_at: string
}

export type SubscriptionInsert = Omit<SubscriptionRow, 'id' | 'created_at'>

export type NotificationSettingsUpsert = Omit<
  NotificationSettingsRow,
  'updated_at' | 'sync_revision'
>

export interface AnnualGoalRow {
  id: string
  user_id: string
  title: string
  sort_order: number
  sync_revision: number
  created_at: string
  updated_at: string
}

export interface MonthlyGoalRow {
  id: string
  user_id: string
  year: number
  month: number
  title: string
  sort_order: number
  sync_revision: number
  created_at: string
  updated_at: string
}

export interface WeeklyGoalRow {
  id: string
  user_id: string
  week_start: string
  title: string
  sort_order: number
  sync_revision: number
  created_at: string
  updated_at: string
}

export type AnnualGoalInsert = Omit<
  AnnualGoalRow,
  'id' | 'created_at' | 'updated_at' | 'sync_revision'
>
export type MonthlyGoalInsert = Omit<
  MonthlyGoalRow,
  'id' | 'created_at' | 'updated_at' | 'sync_revision'
>
export type WeeklyGoalInsert = Omit<
  WeeklyGoalRow,
  'id' | 'created_at' | 'updated_at' | 'sync_revision'
>

export type AnnualGoalUpdate = Partial<
  Omit<AnnualGoalRow, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'sync_revision'>
>
export type MonthlyGoalUpdate = Partial<
  Omit<MonthlyGoalRow, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'sync_revision'>
>
export type WeeklyGoalUpdate = Partial<
  Omit<WeeklyGoalRow, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'sync_revision'>
>

// ---------------------------------------------------------------------------
// Database root interface — pass as generic to createClient<Database>()
// ---------------------------------------------------------------------------

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow
        Insert: ProfileInsert
        Update: ProfileUpdate
        Relationships: []
      }
      task_templates: {
        Row: TaskTemplateRow
        Insert: TaskTemplateInsert
        Update: TaskTemplateUpdate
        Relationships: []
      }
      daily_logs: {
        Row: DailyLogRow
        Insert: DailyLogInsert
        Update: DailyLogUpdate
        Relationships: []
      }
      daily_reviews: {
        Row: DailyReviewRow
        Insert: DailyReviewInsert
        Update: DailyReviewUpdate
        Relationships: []
      }
      subscriptions: {
        Row: SubscriptionRow
        Insert: SubscriptionInsert
        Update: Partial<SubscriptionInsert>
        Relationships: []
      }
      notification_settings: {
        Row: NotificationSettingsRow
        Insert: NotificationSettingsUpsert
        Update: Partial<NotificationSettingsUpsert>
        Relationships: []
      }
      daily_wellness: {
        Row: DailyWellnessRow
        Insert: DailyWellnessInsert
        Update: DailyWellnessUpdate
        Relationships: []
      }
      annual_goals: {
        Row: AnnualGoalRow
        Insert: AnnualGoalInsert
        Update: AnnualGoalUpdate
        Relationships: []
      }
      monthly_goals: {
        Row: MonthlyGoalRow
        Insert: MonthlyGoalInsert
        Update: MonthlyGoalUpdate
        Relationships: []
      }
      weekly_goals: {
        Row: WeeklyGoalRow
        Insert: WeeklyGoalInsert
        Update: WeeklyGoalUpdate
        Relationships: []
      }
    }
    // Must be `{}` so `keyof Views` is `never` — otherwise `Record<string, never>`
    // makes every string a valid view name and breaks `.from('daily_logs').upsert()`.
    Views: {}
    Functions: {}
    Enums: {
      task_status: TaskStatus
    }
  }
}

// ---------------------------------------------------------------------------
// Utility: extract Row / Insert / Update from the Database type
// ---------------------------------------------------------------------------

type PublicTables = Database['public']['Tables']

export type TableRow<T extends keyof PublicTables> =
  PublicTables[T]['Row']

export type TableInsert<T extends keyof PublicTables> =
  PublicTables[T]['Insert']

export type TableUpdate<T extends keyof PublicTables> =
  PublicTables[T]['Update']

// ---------------------------------------------------------------------------
// Convenience aliases
// ---------------------------------------------------------------------------

export type Profile        = TableRow<'profiles'>
export type TaskTemplate   = TableRow<'task_templates'>
export type DailyLog       = TableRow<'daily_logs'>
export type DailyReview    = TableRow<'daily_reviews'>
export type DailyWellness  = TableRow<'daily_wellness'>

// ---------------------------------------------------------------------------
// Join types (Supabase nested select results)
// ---------------------------------------------------------------------------

/** Result of daily_logs joined with task_templates via .select('*, task_templates(*)') */
export type LogWithTemplate = DailyLog & {
  task_templates: TaskTemplate
}
