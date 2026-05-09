create table public.import_batches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  source text not null,
  row_count int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.import_batches enable row level security;
create policy "own import_batches all" on public.import_batches for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.books      add column if not exists import_batch_id uuid;
alter table public.user_books add column if not exists import_batch_id uuid;
create index if not exists books_import_batch_id_idx      on public.books      (import_batch_id);
create index if not exists user_books_import_batch_id_idx on public.user_books (import_batch_id);