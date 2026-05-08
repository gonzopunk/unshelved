
-- Tagging system: structured axes + free tags
create table public.tag_axes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  key text not null,
  label text not null,
  kind text not null check (kind in ('scale','single','multi')),
  scale_min int,
  scale_max int,
  values text[] not null default '{}',
  open boolean not null default false,
  hidden boolean not null default false,
  position int not null default 0,
  built_in boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, key)
);

create table public.book_axis_values (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  book_id uuid not null,
  axis_id uuid not null references public.tag_axes(id) on delete cascade,
  scale_value int,
  values text[] not null default '{}',
  updated_at timestamptz not null default now(),
  unique (user_id, book_id, axis_id)
);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  color text,
  use_count int not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table public.book_tags (
  user_id uuid not null,
  book_id uuid not null,
  tag_id uuid not null references public.tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (book_id, tag_id)
);

create index on public.book_axis_values (user_id, book_id);
create index on public.book_tags (user_id, book_id);
create index on public.tags (user_id, name);

alter table public.tag_axes enable row level security;
alter table public.book_axis_values enable row level security;
alter table public.tags enable row level security;
alter table public.book_tags enable row level security;

create policy "own tag_axes all" on public.tag_axes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own book_axis_values all" on public.book_axis_values for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own tags all" on public.tags for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own book_tags all" on public.book_tags for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Seed built-in axes for a user
create or replace function public.seed_tag_axes(_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.tag_axes (user_id, key, label, kind, scale_min, scale_max, values, open, position, built_in) values
    (_user_id, 'spice', 'Spice 🌶', 'scale', 0, 5, '{}', false, 0, true),
    (_user_id, 'pace', 'Pace', 'scale', 1, 5, '{}', false, 1, true),
    (_user_id, 'mood', 'Mood', 'multi', null, null,
      array['cozy','melancholy','propulsive','dreamy','brutal','hopeful','weird','comforting','unsettling','tender'], true, 2, true),
    (_user_id, 'pov', 'POV', 'single', null, null,
      array['1st','close 3rd','omniscient','multi-POV','2nd','epistolary'], false, 3, true),
    (_user_id, 'tense', 'Tense', 'single', null, null,
      array['past','present','mixed'], false, 4, true),
    (_user_id, 'content_warnings', 'Content warnings', 'multi', null, null,
      array['sexual assault','overdose','suicide','animal harm','child harm','graphic violence','eating disorders'], true, 5, true),
    (_user_id, 'tropes', 'Tropes', 'multi', null, null,
      array['enemies-to-lovers','found family','locked room','chosen one','slow burn','heist','quest','portal fantasy'], true, 6, true),
    (_user_id, 'setting_era', 'Setting era', 'single', null, null,
      array['contemporary','near-future','far-future','historical','secondary-world','ahistorical'], false, 7, true),
    (_user_id, 'form', 'Form', 'single', null, null,
      array['novel','novella','short stories','essays','poetry','memoir','hybrid'], false, 8, true)
  on conflict (user_id, key) do nothing;
end;
$$;

-- Extend handle_new_user to seed axes for new accounts
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
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

  perform public.seed_tag_axes(new.id);

  return new;
end;
$$;
