ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS cover_url text,
  ADD COLUMN IF NOT EXISTS cover_secondary_color text;