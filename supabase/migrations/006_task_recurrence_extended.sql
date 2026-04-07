-- Daily-Vibe 2.0 — Extend task_templates: weekly + every_other_day; weekday + anchor columns.

ALTER TABLE public.task_templates
  DROP CONSTRAINT IF EXISTS task_templates_recurrence_check;

ALTER TABLE public.task_templates
  DROP CONSTRAINT IF EXISTS task_templates_recurrence_date_check;

ALTER TABLE public.task_templates
  ADD COLUMN IF NOT EXISTS recurrence_weekday SMALLINT;

ALTER TABLE public.task_templates
  ADD COLUMN IF NOT EXISTS alternate_anchor_date DATE;

COMMENT ON COLUMN public.task_templates.recurrence_weekday IS '0=Mon .. 6=Sun when recurrence=weekly';

ALTER TABLE public.task_templates
  ADD CONSTRAINT task_templates_recurrence_check
  CHECK (recurrence IN ('daily', 'once', 'weekly', 'every_other_day'));

-- Safe to re-run: drop before add (42710 if duplicate name)
ALTER TABLE public.task_templates
  DROP CONSTRAINT IF EXISTS task_templates_recurrence_fields_check;

ALTER TABLE public.task_templates
  ADD CONSTRAINT task_templates_recurrence_fields_check
  CHECK (
    (
      recurrence = 'daily'
      AND occurrence_date IS NULL
      AND recurrence_weekday IS NULL
      AND alternate_anchor_date IS NULL
    )
    OR (
      recurrence = 'once'
      AND occurrence_date IS NOT NULL
      AND recurrence_weekday IS NULL
      AND alternate_anchor_date IS NULL
    )
    OR (
      recurrence = 'weekly'
      AND occurrence_date IS NULL
      AND recurrence_weekday IS NOT NULL
      AND recurrence_weekday >= 0
      AND recurrence_weekday <= 6
      AND alternate_anchor_date IS NULL
    )
    OR (
      recurrence = 'every_other_day'
      AND occurrence_date IS NULL
      AND recurrence_weekday IS NULL
      AND alternate_anchor_date IS NOT NULL
    )
  );
