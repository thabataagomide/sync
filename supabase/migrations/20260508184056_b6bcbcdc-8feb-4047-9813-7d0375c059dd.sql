ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS periods text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS daily_completed integer NOT NULL DEFAULT 0;