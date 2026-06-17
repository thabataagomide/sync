
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'task';

UPDATE public.tasks
SET kind = 'routine'
WHERE recurrence IS NOT NULL OR COALESCE(times_per_day, 1) > 1;

CREATE INDEX IF NOT EXISTS idx_tasks_user_kind ON public.tasks(user_id, kind);
