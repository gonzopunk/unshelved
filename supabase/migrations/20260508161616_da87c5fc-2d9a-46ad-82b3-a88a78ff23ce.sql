
create type public.connection_kind as enum ('book', 'reference_book', 'highlight', 'note');

create table public.reference_books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  author text,
  created_at timestamptz not null default now()
);
alter table public.reference_books enable row level security;
create policy "own reference_books all" on public.reference_books for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  source_kind public.connection_kind not null,
  source_id uuid not null,
  target_kind public.connection_kind not null,
  target_id uuid not null,
  why text,
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);
alter table public.connections enable row level security;
create policy "own connections all" on public.connections for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index idx_connections_user_source on public.connections(user_id, source_id);
create index idx_connections_user_target on public.connections(user_id, target_id);

-- Update seeding for new users
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  b1 uuid := gen_random_uuid();
  b2 uuid := gen_random_uuid();
  b3 uuid := gen_random_uuid();
  b4 uuid := gen_random_uuid();
  b5 uuid := gen_random_uuid();
  b6 uuid := gen_random_uuid();
  b7 uuid := gen_random_uuid();
  r1 uuid := gen_random_uuid(); -- Odyssey
  r2 uuid := gen_random_uuid(); -- Walden
  r3 uuid := gen_random_uuid(); -- Magician's Nephew
  r4 uuid := gen_random_uuid(); -- East of Eden
  r5 uuid := gen_random_uuid(); -- The Martian
  r6 uuid := gen_random_uuid(); -- Frankenstein
  h1 uuid := gen_random_uuid(); -- highlight on Overstory
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));

  insert into public.books (id, user_id, title, author, format, cover_color, cover_text_color, bookmark_color) values
    (b1, new.id, 'The Overstory', 'Richard Powers', 'print', '#1F5266', '#FAFBF3', '#D17648'),
    (b2, new.id, 'Piranesi', 'Susanna Clarke', 'ebook', '#5DA8D5', '#1F2630', '#1F5266'),
    (b3, new.id, 'Project Hail Mary', 'Andy Weir', 'audiobook', '#D17648', '#FAFBF3', '#1F5266'),
    (b4, new.id, 'Pachinko', 'Min Jin Lee', 'print', '#6FB37A', '#1F2630', '#D17648'),
    (b5, new.id, 'Klara and the Sun', 'Kazuo Ishiguro', 'print', '#FAFBF3', '#1F2630', '#5DA8D5'),
    (b6, new.id, 'Tomorrow, and Tomorrow, and Tomorrow', 'Gabrielle Zevin', 'ebook', '#2D6A95', '#FAFBF3', '#D17648'),
    (b7, new.id, 'A Gentleman in Moscow', 'Amor Towles', 'audiobook', '#1F2630', '#EEEEE3', '#D17648');

  insert into public.user_books (user_id, book_id, status, current_page, total_pages, current_seconds, total_seconds, progress_pct, started_at, finished_at, rating, board_position) values
    (new.id, b1, 'reading', 142, 502, null, null, 28, now() - interval '5 days', null, null, 0),
    (new.id, b2, 'reading', 88, 272, null, null, 32, now() - interval '2 days', null, null, 1),
    (new.id, b3, 'reading', 0, 0, 16200, 36000, 45, now() - interval '1 day', null, null, 2),
    (new.id, b4, 'want', 0, 490, null, null, 0, null, null, null, 0),
    (new.id, b5, 'later', 0, 320, null, null, 0, null, null, null, 0),
    (new.id, b6, 'loved', 401, 401, null, null, 100, now() - interval '40 days', now() - interval '10 days', 5, 0),
    (new.id, b7, 'liked', 462, 462, null, null, 100, now() - interval '70 days', now() - interval '50 days', 4, 0);

  insert into public.highlights (id, user_id, book_id, quote_text, page_number) values
    (h1, new.id, b1, 'The best arguments in the world won''t change a person''s mind. The only thing that can do that is a good story.', 312),
    (gen_random_uuid(), new.id, b2, 'The Beauty of the House is immeasurable; its Kindness infinite.', 5);

  insert into public.reference_books (id, user_id, title, author) values
    (r1, new.id, 'The Odyssey', 'Homer'),
    (r2, new.id, 'Walden', 'Henry David Thoreau'),
    (r3, new.id, 'The Magician''s Nephew', 'C.S. Lewis'),
    (r4, new.id, 'East of Eden', 'John Steinbeck'),
    (r5, new.id, 'The Martian', 'Andy Weir'),
    (r6, new.id, 'Frankenstein', 'Mary Shelley');

  insert into public.connections (user_id, source_kind, source_id, target_kind, target_id, why, tags) values
    (new.id, 'book', b1, 'reference_book', r2, 'Both ask whether trees and woods deserve our moral attention.', array['nature','ethics']),
    (new.id, 'book', b2, 'book', b5, 'Solitary narrators piecing together a world they only half understand.', array['voice','solitude']),
    (new.id, 'book', b2, 'reference_book', r3, 'Vast halls and statues — Piranesi feels like a grown-up Wood Between the Worlds.', array['architecture']),
    (new.id, 'book', b3, 'reference_book', r5, 'Weir doing Weir: one man, impossible odds, lots of math.', array['author']),
    (new.id, 'book', b4, 'reference_book', r4, 'Multigenerational family epics about land, identity, and inheritance.', array['family','epic']),
    (new.id, 'book', b5, 'reference_book', r6, 'A made being trying to understand the humans who made her.', array['ai','creation']),
    (new.id, 'book', b6, 'book', b5, 'Friendship and creation as the things we keep building each other into.', array['friendship']),
    (new.id, 'book', b7, 'reference_book', r4, 'Confined men finding the whole human comedy in a single setting.', array['confinement']),
    (new.id, 'highlight', h1, 'reference_book', r2, 'Powers'' line about story echoes Thoreau''s belief that we live by the tales we tell of the woods.', array['story','nature']),
    (new.id, 'book', b1, 'book', b4, 'Both novels braid many lives into one slow-growing whole.', array['structure']);

  return new;
end;
$function$;
