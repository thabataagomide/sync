
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS times_per_day integer DEFAULT 1;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE public.habits ADD COLUMN IF NOT EXISTS image_url text;

CREATE TABLE IF NOT EXISTS public.achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  code text NOT NULL,
  title text NOT NULL,
  description text,
  icon text DEFAULT '🏆',
  rarity text NOT NULL DEFAULT 'common',
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, code)
);
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own achievements all" ON public.achievements FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

INSERT INTO storage.buckets (id, name, public)
VALUES ('habit-icons', 'habit-icons', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "habit-icons public read" ON storage.objects FOR SELECT
  USING (bucket_id = 'habit-icons');
CREATE POLICY "habit-icons user upload" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'habit-icons' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "habit-icons user update" ON storage.objects FOR UPDATE
  USING (bucket_id = 'habit-icons' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "habit-icons user delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'habit-icons' AND auth.uid()::text = (storage.foldername(name))[1]);
