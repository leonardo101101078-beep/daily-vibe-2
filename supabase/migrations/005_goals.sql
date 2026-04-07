-- =============================================================================
-- Daily-Vibe 2.0 — Annual / monthly / weekly user goals
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.annual_goals (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  title       TEXT        NOT NULL,
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_annual_goals_updated_at ON public.annual_goals;
CREATE TRIGGER trg_annual_goals_updated_at
  BEFORE UPDATE ON public.annual_goals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_annual_goals_user_id
  ON public.annual_goals (user_id);

ALTER TABLE public.annual_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "annual_goals: owner access" ON public.annual_goals;
CREATE POLICY "annual_goals: owner access"
  ON public.annual_goals FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


CREATE TABLE IF NOT EXISTS public.monthly_goals (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  year        INTEGER     NOT NULL CHECK (year >= 2000 AND year <= 2100),
  month       INTEGER     NOT NULL CHECK (month >= 1 AND month <= 12),
  title       TEXT        NOT NULL,
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_monthly_goals_updated_at ON public.monthly_goals;
CREATE TRIGGER trg_monthly_goals_updated_at
  BEFORE UPDATE ON public.monthly_goals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_monthly_goals_user_ym
  ON public.monthly_goals (user_id, year, month);

ALTER TABLE public.monthly_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "monthly_goals: owner access" ON public.monthly_goals;
CREATE POLICY "monthly_goals: owner access"
  ON public.monthly_goals FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


CREATE TABLE IF NOT EXISTS public.weekly_goals (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  week_start  DATE        NOT NULL,
  title       TEXT        NOT NULL,
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_weekly_goals_updated_at ON public.weekly_goals;
CREATE TRIGGER trg_weekly_goals_updated_at
  BEFORE UPDATE ON public.weekly_goals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_weekly_goals_user_week
  ON public.weekly_goals (user_id, week_start);

ALTER TABLE public.weekly_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "weekly_goals: owner access" ON public.weekly_goals;
CREATE POLICY "weekly_goals: owner access"
  ON public.weekly_goals FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
