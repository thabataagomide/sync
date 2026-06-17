
-- 1) TaskFlow boards
CREATE TABLE public.taskflow_boards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.taskflow_boards TO authenticated;
GRANT ALL ON public.taskflow_boards TO service_role;
ALTER TABLE public.taskflow_boards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own boards" ON public.taskflow_boards FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER tg_taskflow_boards_updated BEFORE UPDATE ON public.taskflow_boards
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 2) TaskFlow cards
CREATE TABLE public.taskflow_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  board_id UUID NOT NULL REFERENCES public.taskflow_boards(id) ON DELETE CASCADE,
  column_key TEXT NOT NULL DEFAULT 'todo',
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium',
  tags TEXT[] DEFAULT '{}',
  due_date DATE,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.taskflow_cards TO authenticated;
GRANT ALL ON public.taskflow_cards TO service_role;
ALTER TABLE public.taskflow_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own cards" ON public.taskflow_cards FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_taskflow_cards_board ON public.taskflow_cards(board_id, column_key, position);
CREATE TRIGGER tg_taskflow_cards_updated BEFORE UPDATE ON public.taskflow_cards
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 3) Optional modules toggle (per-user)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS modules_enabled JSONB NOT NULL DEFAULT '{"hydration":false,"notes":false,"rituals":false,"library":false,"taskflow":true}'::jsonb;

-- 4) Weekday-based routines for habits and tasks
ALTER TABLE public.habits ADD COLUMN IF NOT EXISTS weekdays INT[] DEFAULT '{}';
ALTER TABLE public.tasks  ADD COLUMN IF NOT EXISTS weekdays INT[] DEFAULT '{}';
