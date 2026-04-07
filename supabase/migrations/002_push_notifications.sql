-- =============================================================================
-- Daily-Vibe 2.0 — Push Notifications Migration
-- =============================================================================
-- Adds:
--   1. public.subscriptions       — stores Web Push endpoint + encryption keys
--   2. public.notification_settings — per-user on/off switch + reminder times
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1. subscriptions
--    One row per (user, device) browser push subscription.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- Web Push subscription fields (from PushSubscription.toJSON())
  endpoint    TEXT        NOT NULL,
  p256dh      TEXT        NOT NULL,  -- client public key (base64url)
  auth        TEXT        NOT NULL,  -- auth secret (base64url)
  -- Optional metadata
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- A browser endpoint is globally unique
  CONSTRAINT uq_subscription_endpoint UNIQUE (endpoint)
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id
  ON public.subscriptions (user_id);

-- RLS: users can only manage their own subscriptions
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subscriptions: owner access" ON public.subscriptions;
CREATE POLICY "subscriptions: owner access"
  ON public.subscriptions FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ---------------------------------------------------------------------------
-- 2. notification_settings
--    One row per user. Records the reminder switch and custom times.
--    morning_time / evening_time are stored as 'HH:MM' in the user's timezone.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notification_settings (
  user_id       UUID        PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  enabled       BOOLEAN     NOT NULL DEFAULT FALSE,
  morning_time  TEXT        NOT NULL DEFAULT '09:00',  -- 'HH:MM' in user's local timezone
  evening_time  TEXT        NOT NULL DEFAULT '21:00',
  timezone      TEXT        NOT NULL DEFAULT 'Asia/Singapore',
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger: keep updated_at current
DROP TRIGGER IF EXISTS trg_notification_settings_updated_at ON public.notification_settings;
CREATE TRIGGER trg_notification_settings_updated_at
  BEFORE UPDATE ON public.notification_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS: users can only manage their own settings
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notification_settings: owner access" ON public.notification_settings;
CREATE POLICY "notification_settings: owner access"
  ON public.notification_settings FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ---------------------------------------------------------------------------
-- Done
-- ---------------------------------------------------------------------------
