-- Daily-Vibe 2.0 — daily wellness (weight, diet, exercise) per user per day
CREATE TABLE IF NOT EXISTS public.daily_wellness (
  id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID           NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  date            DATE           NOT NULL,
  weight          NUMERIC,
  diet_note       TEXT,
  exercise_done   BOOLEAN        NOT NULL DEFAULT FALSE,
  exercise_note   TEXT,
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_daily_wellness_user_date UNIQUE (user_id, date)
);

DROP TRIGGER IF EXISTS trg_daily_wellness_updated_at ON public.daily_wellness;
CREATE TRIGGER trg_daily_wellness_updated_at
  BEFORE UPDATE ON public.daily_wellness
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_daily_wellness_user_date
  ON public.daily_wellness (user_id, date);

ALTER TABLE public.daily_wellness ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "daily_wellness: owner access" ON public.daily_wellness;
CREATE POLICY "daily_wellness: owner access"
  ON public.daily_wellness FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
