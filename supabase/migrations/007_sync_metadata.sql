-- =============================================================================
-- Daily-Vibe 2.0 — Sync metadata (per-row revision) + nightly sync reminder fields
-- =============================================================================
-- Adds sync_revision to user-owned tables for client-side merge / conflict
-- detection. Revision bumps on each UPDATE via trigger (INSERT defaults to 1).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Bump sync_revision on UPDATE (INSERT uses DEFAULT 1)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.bump_sync_revision()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.sync_revision := COALESCE(OLD.sync_revision, 0) + 1;
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. Add column + trigger per table
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS sync_revision BIGINT NOT NULL DEFAULT 1;

DROP TRIGGER IF EXISTS trg_profiles_sync_revision ON public.profiles;
CREATE TRIGGER trg_profiles_sync_revision
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.bump_sync_revision();

ALTER TABLE public.task_templates
  ADD COLUMN IF NOT EXISTS sync_revision BIGINT NOT NULL DEFAULT 1;

DROP TRIGGER IF EXISTS trg_task_templates_sync_revision ON public.task_templates;
CREATE TRIGGER trg_task_templates_sync_revision
  BEFORE UPDATE ON public.task_templates
  FOR EACH ROW EXECUTE FUNCTION public.bump_sync_revision();

ALTER TABLE public.daily_logs
  ADD COLUMN IF NOT EXISTS sync_revision BIGINT NOT NULL DEFAULT 1;

DROP TRIGGER IF EXISTS trg_daily_logs_sync_revision ON public.daily_logs;
CREATE TRIGGER trg_daily_logs_sync_revision
  BEFORE UPDATE ON public.daily_logs
  FOR EACH ROW EXECUTE FUNCTION public.bump_sync_revision();

ALTER TABLE public.daily_reviews
  ADD COLUMN IF NOT EXISTS sync_revision BIGINT NOT NULL DEFAULT 1;

DROP TRIGGER IF EXISTS trg_daily_reviews_sync_revision ON public.daily_reviews;
CREATE TRIGGER trg_daily_reviews_sync_revision
  BEFORE UPDATE ON public.daily_reviews
  FOR EACH ROW EXECUTE FUNCTION public.bump_sync_revision();

ALTER TABLE public.daily_wellness
  ADD COLUMN IF NOT EXISTS sync_revision BIGINT NOT NULL DEFAULT 1;

DROP TRIGGER IF EXISTS trg_daily_wellness_sync_revision ON public.daily_wellness;
CREATE TRIGGER trg_daily_wellness_sync_revision
  BEFORE UPDATE ON public.daily_wellness
  FOR EACH ROW EXECUTE FUNCTION public.bump_sync_revision();

ALTER TABLE public.annual_goals
  ADD COLUMN IF NOT EXISTS sync_revision BIGINT NOT NULL DEFAULT 1;

DROP TRIGGER IF EXISTS trg_annual_goals_sync_revision ON public.annual_goals;
CREATE TRIGGER trg_annual_goals_sync_revision
  BEFORE UPDATE ON public.annual_goals
  FOR EACH ROW EXECUTE FUNCTION public.bump_sync_revision();

ALTER TABLE public.monthly_goals
  ADD COLUMN IF NOT EXISTS sync_revision BIGINT NOT NULL DEFAULT 1;

DROP TRIGGER IF EXISTS trg_monthly_goals_sync_revision ON public.monthly_goals;
CREATE TRIGGER trg_monthly_goals_sync_revision
  BEFORE UPDATE ON public.monthly_goals
  FOR EACH ROW EXECUTE FUNCTION public.bump_sync_revision();

ALTER TABLE public.weekly_goals
  ADD COLUMN IF NOT EXISTS sync_revision BIGINT NOT NULL DEFAULT 1;

DROP TRIGGER IF EXISTS trg_weekly_goals_sync_revision ON public.weekly_goals;
CREATE TRIGGER trg_weekly_goals_sync_revision
  BEFORE UPDATE ON public.weekly_goals
  FOR EACH ROW EXECUTE FUNCTION public.bump_sync_revision();

ALTER TABLE public.notification_settings
  ADD COLUMN IF NOT EXISTS sync_revision BIGINT NOT NULL DEFAULT 1;

DROP TRIGGER IF EXISTS trg_notification_settings_sync_revision ON public.notification_settings;
CREATE TRIGGER trg_notification_settings_sync_revision
  BEFORE UPDATE ON public.notification_settings
  FOR EACH ROW EXECUTE FUNCTION public.bump_sync_revision();

-- ---------------------------------------------------------------------------
-- 3. Nightly sync reminder (Web Push copy targets ~23:00 local by default)
-- ---------------------------------------------------------------------------
ALTER TABLE public.notification_settings
  ADD COLUMN IF NOT EXISTS nightly_sync_enabled BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE public.notification_settings
  ADD COLUMN IF NOT EXISTS nightly_sync_time TEXT NOT NULL DEFAULT '23:00';

-- ---------------------------------------------------------------------------
-- Done
-- ---------------------------------------------------------------------------
