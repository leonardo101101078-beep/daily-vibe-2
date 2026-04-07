-- =============================================================================
-- Daily-Vibe 2.0 — Initial Schema Migration
-- =============================================================================
-- Run this in the Supabase SQL Editor or via `supabase db push`.
-- The script is idempotent: safe to re-run thanks to IF NOT EXISTS guards.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 0. Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- provides gen_random_uuid()


-- ---------------------------------------------------------------------------
-- 1. Custom Types
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.task_status AS ENUM (
    'pending',
    'in_progress',
    'completed',
    'skipped'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;


-- ---------------------------------------------------------------------------
-- 2. Helper: auto-update updated_at on every row change
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


-- ---------------------------------------------------------------------------
-- 3. profiles
--    One row per Supabase Auth user.  Created automatically via trigger.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id             UUID        PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  username       TEXT        UNIQUE,
  display_name   TEXT,
  avatar_url     TEXT,
  timezone       TEXT        NOT NULL DEFAULT 'UTC',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger: keep updated_at current
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Trigger: auto-insert a profile row when a new Auth user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_on_auth_user_created ON auth.users;
CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ---------------------------------------------------------------------------
-- 4. task_templates
--    User-defined recurring task definitions.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.task_templates (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  title          TEXT        NOT NULL,
  description    TEXT,
  -- suggested values: 'health' | 'work' | 'learning' | 'personal'
  category       TEXT        NOT NULL DEFAULT 'personal',
  icon           TEXT,                            -- e.g. Lucide icon name
  color          TEXT,                            -- e.g. hex '#6366f1' or Tailwind class
  sort_order     INTEGER     NOT NULL DEFAULT 0,
  is_active      BOOLEAN     NOT NULL DEFAULT TRUE,
  -- progress tracking: target_value + unit (e.g. 8 glasses, 30 minutes)
  target_value   NUMERIC,
  unit           TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_task_templates_updated_at ON public.task_templates;
CREATE TRIGGER trg_task_templates_updated_at
  BEFORE UPDATE ON public.task_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_task_templates_user_id
  ON public.task_templates (user_id);

CREATE INDEX IF NOT EXISTS idx_task_templates_user_active
  ON public.task_templates (user_id, is_active);


-- ---------------------------------------------------------------------------
-- 5. daily_logs
--    One row per (user, task_template, date) — the execution record.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.daily_logs (
  id                 UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID           NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  task_template_id   UUID           NOT NULL REFERENCES public.task_templates (id) ON DELETE CASCADE,
  date               DATE           NOT NULL,
  status             public.task_status NOT NULL DEFAULT 'pending',
  note               TEXT,
  -- actual progress value; compare with task_templates.target_value for %
  progress           NUMERIC,
  completed_at       TIMESTAMPTZ,
  created_at         TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

  -- One record per task per day per user
  CONSTRAINT uq_daily_logs_user_task_date
    UNIQUE (user_id, task_template_id, date)
);

DROP TRIGGER IF EXISTS trg_daily_logs_updated_at ON public.daily_logs;
CREATE TRIGGER trg_daily_logs_updated_at
  BEFORE UPDATE ON public.daily_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_daily_logs_user_date
  ON public.daily_logs (user_id, date);

CREATE INDEX IF NOT EXISTS idx_daily_logs_task_template_id
  ON public.daily_logs (task_template_id);


-- ---------------------------------------------------------------------------
-- 6. daily_reviews
--    One nightly review entry per user per day.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.daily_reviews (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  date            DATE        NOT NULL,
  review_text     TEXT,
  tomorrow_plan   TEXT,
  -- mood score 1 (terrible) → 5 (great)
  mood            SMALLINT    CHECK (mood BETWEEN 1 AND 5),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One review per day per user
  CONSTRAINT uq_daily_reviews_user_date
    UNIQUE (user_id, date)
);

DROP TRIGGER IF EXISTS trg_daily_reviews_updated_at ON public.daily_reviews;
CREATE TRIGGER trg_daily_reviews_updated_at
  BEFORE UPDATE ON public.daily_reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_daily_reviews_user_date
  ON public.daily_reviews (user_id, date);


-- ---------------------------------------------------------------------------
-- 7. Row Level Security (RLS)
--    Every user can only read/write their own rows.
-- ---------------------------------------------------------------------------

-- profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles: owner access" ON public.profiles;
CREATE POLICY "profiles: owner access"
  ON public.profiles FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- task_templates
ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "task_templates: owner access" ON public.task_templates;
CREATE POLICY "task_templates: owner access"
  ON public.task_templates FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- daily_logs
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "daily_logs: owner access" ON public.daily_logs;
CREATE POLICY "daily_logs: owner access"
  ON public.daily_logs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- daily_reviews
ALTER TABLE public.daily_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "daily_reviews: owner access" ON public.daily_reviews;
CREATE POLICY "daily_reviews: owner access"
  ON public.daily_reviews FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ---------------------------------------------------------------------------
-- Done
-- ---------------------------------------------------------------------------
