ALTER TABLE public.user_books DROP CONSTRAINT IF EXISTS user_books_rating_check;
ALTER TABLE public.user_books ALTER COLUMN rating TYPE numeric(3,1) USING rating::numeric(3,1);
ALTER TABLE public.user_books ADD CONSTRAINT user_books_rating_check CHECK (rating >= 0.5 AND rating <= 5.0);