-- Daily-Vibe 2.0 — recurrence: daily (every day) vs once (single occurrence_date)
ALTER TABLE public.task_templates
  ADD COLUMN IF NOT EXISTS recurrence TEXT NOT NULL DEFAULT 'daily';

ALTER TABLE public.task_templates
  ADD COLUMN IF NOT EXISTS occurrence_date DATE;

ALTER TABLE public.task_templates
  DROP CONSTRAINT IF EXISTS task_templates_recurrence_check;

ALTER TABLE public.task_templates
  ADD CONSTRAINT task_templates_recurrence_check
  CHECK (recurrence IN ('daily', 'once'));

ALTER TABLE public.task_templates
  DROP CONSTRAINT IF EXISTS task_templates_recurrence_date_check;

ALTER TABLE public.task_templates
  ADD CONSTRAINT task_templates_recurrence_date_check
  CHECK (
    (recurrence = 'daily' AND occurrence_date IS NULL)
    OR
    (recurrence = 'once' AND occurrence_date IS NOT NULL)
  );
