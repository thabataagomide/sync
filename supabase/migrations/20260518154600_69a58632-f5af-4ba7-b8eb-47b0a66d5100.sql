-- TaskFlow column on tasks
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS flow_status text NOT NULL DEFAULT 'todo';
CREATE INDEX IF NOT EXISTS idx_tasks_user_flow ON public.tasks(user_id, flow_status);

-- Library toggle on profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS library_enabled boolean NOT NULL DEFAULT false;

-- Books table
CREATE TABLE IF NOT EXISTS public.books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  author text,
  cover_url text,
  status text NOT NULL DEFAULT 'want',
  rating integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own books all" ON public.books
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER books_touch BEFORE UPDATE ON public.books
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();