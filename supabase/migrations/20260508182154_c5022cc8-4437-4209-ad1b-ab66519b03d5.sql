
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS is_sample boolean NOT NULL DEFAULT false;
ALTER TABLE public.reference_books ADD COLUMN IF NOT EXISTS is_sample boolean NOT NULL DEFAULT false;
ALTER TABLE public.highlights ADD COLUMN IF NOT EXISTS is_sample boolean NOT NULL DEFAULT false;
ALTER TABLE public.connections ADD COLUMN IF NOT EXISTS is_sample boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_books_user_sample ON public.books(user_id) WHERE is_sample;
CREATE INDEX IF NOT EXISTS idx_reference_books_user_sample ON public.reference_books(user_id) WHERE is_sample;
CREATE INDEX IF NOT EXISTS idx_highlights_user_sample ON public.highlights(user_id) WHERE is_sample;
CREATE INDEX IF NOT EXISTS idx_connections_user_sample ON public.connections(user_id) WHERE is_sample;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  b1 uuid := gen_random_uuid();
  b2 uuid := gen_random_uuid();
  b3 uuid := gen_random_uuid();
  b4 uuid := gen_random_uuid();
  b5 uuid := gen_random_uuid();
  b6 uuid := gen_random_uuid();
  b7 uuid := gen_random_uuid();
  r1 uuid := gen_random_uuid();
  r2 uuid := gen_random_uuid();
  r3 uuid := gen_random_uuid();
  r4 uuid := gen_random_uuid();
  r5 uuid := gen_random_uuid();
  r6 uuid := gen_random_uuid();
  h1 uuid := gen_random_uuid();
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));

  insert into public.books (id, user_id, title, author, format, cover_color, cover_text_color, bookmark_color, is_sample) values
    (b1, new.id, 'The Overstory', 'Richard Powers', 'print', '#1F5266', '#FAFBF3', '#D17648', true),
    (b2, new.id, 'Piranesi', 'Susanna Clarke', 'ebook', '#5DA8D5', '#1F2630', '#1F5266', true),
    (b3, new.id, 'Project Hail Mary', 'Andy Weir', 'audiobook', '#D17648', '#FAFBF3', '#1F5266', true),
    (b4, new.id, 'Pachinko', 'Min Jin Lee', 'print', '#6FB37A', '#1F2630', '#D17648', true),
    (b5, new.id, 'Klara and the Sun', 'Kazuo Ishiguro', 'print', '#FAFBF3', '#1F2630', '#5DA8D5', true),
    (b6, new.id, 'Tomorrow, and Tomorrow, and Tomorrow', 'Gabrielle Zevin', 'ebook', '#2D6A95', '#FAFBF3', '#D17648', true),
    (b7, new.id, 'A Gentleman in Moscow', 'Amor Towles', 'audiobook', '#1F2630', '#EEEEE3', '#D17648', true);

  insert into public.user_books (user_id, book_id, status, current_page, total_pages, current_seconds, total_seconds, progress_pct, started_at, finished_at, rating, board_position) values
    (new.id, b1, 'reading', 142, 502, null, null, 28, now() - interval '5 days', null, null, 0),
    (new.id, b2, 'reading', 88, 272, null, null, 32, now() - interval '2 days', null, null, 1),
    (new.id, b3, 'reading', 0, 0, 16200, 36000, 45, now() - interval '1 day', null, null, 2),
    (new.id, b4, 'want', 0, 490, null, null, 0, null, null, null, 0),
    (new.id, b5, 'later', 0, 320, null, null, 0, null, null, null, 0),
    (new.id, b6, 'loved', 401, 401, null, null, 100, now() - interval '40 days', now() - interval '10 days', 5, 0),
    (new.id, b7, 'liked', 462, 462, null, null, 100, now() - interval '70 days', now() - interval '50 days', 4, 0);

  insert into public.highlights (id, user_id, book_id, quote_text, page_number, is_sample) values
    (h1, new.id, b1, 'The best arguments in the world won''t change a person''s mind. The only thing that can do that is a good story.', 312, true),
    (gen_random_uuid(), new.id, b2, 'The Beauty of the House is immeasurable; its Kindness infinite.', 5, true);

  insert into public.reference_books (id, user_id, title, author, is_sample) values
    (r1, new.id, 'The Odyssey', 'Homer', true),
    (r2, new.id, 'Walden', 'Henry David Thoreau', true),
    (r3, new.id, 'The Magician''s Nephew', 'C.S. Lewis', true),
    (r4, new.id, 'East of Eden', 'John Steinbeck', true),
    (r5, new.id, 'The Martian', 'Andy Weir', true),
    (r6, new.id, 'Frankenstein', 'Mary Shelley', true);

  insert into public.connections (user_id, source_kind, source_id, target_kind, target_id, why, tags, is_sample) values
    (new.id, 'book', b1, 'reference_book', r2, 'Both ask whether trees and woods deserve our moral attention.', array['nature','ethics'], true),
    (new.id, 'book', b2, 'book', b5, 'Solitary narrators piecing together a world they only half understand.', array['voice','solitude'], true),
    (new.id, 'book', b2, 'reference_book', r3, 'Vast halls and statues — Piranesi feels like a grown-up Wood Between the Worlds.', array['architecture'], true),
    (new.id, 'book', b3, 'reference_book', r5, 'Weir doing Weir: one man, impossible odds, lots of math.', array['author'], true),
    (new.id, 'book', b4, 'reference_book', r4, 'Multigenerational family epics about land, identity, and inheritance.', array['family','epic'], true),
    (new.id, 'book', b5, 'reference_book', r6, 'A made being trying to understand the humans who made her.', array['ai','creation'], true),
    (new.id, 'book', b6, 'book', b5, 'Friendship and creation as the things we keep building each other into.', array['friendship'], true),
    (new.id, 'book', b7, 'reference_book', r4, 'Confined men finding the whole human comedy in a single setting.', array['confinement'], true),
    (new.id, 'highlight', h1, 'reference_book', r2, 'Powers'' line about story echoes Thoreau''s belief that we live by the tales we tell of the woods.', array['story','nature'], true),
    (new.id, 'book', b1, 'book', b4, 'Both novels braid many lives into one slow-growing whole.', array['structure'], true);

  perform public.seed_tag_axes(new.id);

  return new;
end;
$function$;
