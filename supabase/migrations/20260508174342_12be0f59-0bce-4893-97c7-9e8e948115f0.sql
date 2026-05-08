
ALTER TABLE public.reading_sessions
  ADD COLUMN IF NOT EXISTS ended_at timestamptz,
  ADD COLUMN IF NOT EXISTS start_page integer,
  ADD COLUMN IF NOT EXISTS end_page integer,
  ADD COLUMN IF NOT EXISTS start_pct numeric,
  ADD COLUMN IF NOT EXISTS end_pct numeric,
  ADD COLUMN IF NOT EXISTS start_seconds integer,
  ADD COLUMN IF NOT EXISTS end_seconds integer,
  ADD COLUMN IF NOT EXISTS mood text,
  ADD COLUMN IF NOT EXISTS session_note text,
  ADD COLUMN IF NOT EXISTS location text;

CREATE INDEX IF NOT EXISTS reading_sessions_user_started_idx
  ON public.reading_sessions (user_id, started_at DESC);

CREATE INDEX IF NOT EXISTS reading_sessions_book_started_idx
  ON public.reading_sessions (book_id, started_at DESC);
