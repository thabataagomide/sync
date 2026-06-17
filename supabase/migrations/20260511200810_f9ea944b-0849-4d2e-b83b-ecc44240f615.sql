
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS hydration_goal_ml integer NOT NULL DEFAULT 2000,
  ADD COLUMN IF NOT EXISTS hydration_reminders jsonb NOT NULL DEFAULT '{"enabled": false, "times": ["09:00","13:00","17:00","20:00"]}'::jsonb;

CREATE TABLE IF NOT EXISTS public.hydration_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount_ml integer NOT NULL,
  log_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.hydration_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own hydration all" ON public.hydration_logs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_hydration_user_date ON public.hydration_logs(user_id, log_date DESC);
