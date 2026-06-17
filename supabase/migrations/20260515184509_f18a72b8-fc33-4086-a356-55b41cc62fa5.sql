
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS theme text NOT NULL DEFAULT 'midnight-sync',
  ADD COLUMN IF NOT EXISTS last_active_date date;

CREATE TABLE IF NOT EXISTS public.mood_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  mood text NOT NULL,
  energy int,
  note text,
  log_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.mood_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own moods all" ON public.mood_logs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.rituals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  icon text DEFAULT '✨',
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.rituals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own rituals all" ON public.rituals FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.focus_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  duration_minutes int NOT NULL DEFAULT 25,
  break_minutes int NOT NULL DEFAULT 5,
  mode text NOT NULL DEFAULT 'work',
  related_habit_ids uuid[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.focus_presets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own presets all" ON public.focus_presets FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
