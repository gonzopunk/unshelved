
create type public.book_status as enum ('want','reading','later','dnf','loved','liked','meh');
create type public.book_format as enum ('print','ebook','audiobook');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  yearly_goal int not null default 12,
  created_at timestamptz not null default now()
);

create table public.books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  author text,
  format book_format not null default 'print',
  cover_color text not null default '#1F5266',
  cover_text_color text not null default '#FAFBF3',
  cover_generic boolean not null default true,
  bookmark_color text not null default '#D17648',
  created_at timestamptz not null default now()
);

create table public.user_books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  status book_status not null default 'want',
  current_page int default 0,
  total_pages int,
  current_seconds int default 0,
  total_seconds int,
  progress_pct numeric default 0,
  started_at timestamptz,
  finished_at timestamptz,
  rating int check (rating between 1 and 5),
  note text,
  board_position int not null default 0,
  paused boolean not null default false,
  unique(user_id, book_id)
);

create table public.reading_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  pages_read int default 0,
  minutes int default 0,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create table public.highlights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  quote_text text not null,
  page_number int,
  created_at timestamptz not null default now()
);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.books enable row level security;
alter table public.user_books enable row level security;
alter table public.reading_sessions enable row level security;
alter table public.highlights enable row level security;
alter table public.notes enable row level security;

create policy "own profile select" on public.profiles for select using (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update using (auth.uid() = id);

create policy "own books all" on public.books for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own user_books all" on public.user_books for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own sessions all" on public.reading_sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own highlights all" on public.highlights for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own notes all" on public.notes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

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

  insert into public.highlights (user_id, book_id, quote_text, page_number) values
    (new.id, b1, 'The best arguments in the world won''t change a person''s mind. The only thing that can do that is a good story.', 312),
    (new.id, b2, 'The Beauty of the House is immeasurable; its Kindness infinite.', 5);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
