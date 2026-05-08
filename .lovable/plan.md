
# Library Import — Detailed Spec

Bring an existing reading life into Unshelved in one sitting. Four entry points, one unified review step, real previews, real undo.

## Entry points

The Add Book button gains a split: **Add a book** / **Import library…**. The latter opens a full-screen import wizard.

Sources offered, in priority order:

1. **Goodreads CSV export** — the file most people already have.
2. **StoryGraph CSV export** — second most common.
3. **Generic CSV** — column mapping UI (covers LibraryThing, Bookwyrm, Notion exports, etc.).
4. **Open Library / ISBN lookup** — paste a list of titles, ISBNs, or one per line. Each is resolved against Open Library.
5. **EPUB upload** — drop one or more `.epub` files; we read embedded metadata + cover.
6. **Paste from clipboard** — freeform text; we parse line-by-line as "Title — Author" or ISBNs.

Each source funnels into the same **Review & Map → Preview → Commit** pipeline.

## Wizard flow

```text
 ┌──────────┐   ┌──────────────┐   ┌──────────┐   ┌────────┐   ┌────────┐
 │ 1 Source │ → │ 2 Field map  │ → │ 3 Enrich │ → │ 4 Review│ → │ 5 Done │
 └──────────┘   └──────────────┘   └──────────┘   └────────┘   └────────┘
```

### 1. Source
Drop zone + tabs for the 6 sources. Shows a one-line "what to expect" hint per source, plus a link to step-by-step export instructions for Goodreads/StoryGraph.

### 2. Field map
- For known formats (Goodreads, StoryGraph), columns auto-map and the user just confirms.
- For Generic CSV, show a two-column mapper: detected source columns ↔ Unshelved fields. Required: `title`. Optional: `author`, `isbn`, `format`, `status`, `rating`, `date_started`, `date_finished`, `current_page`, `total_pages`, `tags`, `notes`, `series`, `series_number`.
- Status mapping is its own sub-panel: Goodreads `to-read → want`, `currently-reading → reading`, `read → liked` (default; user can switch the default for "read" rows to `loved` / `liked` / `meh` / `dnf`). Custom shelves become Unshelved tags.
- Rating mapping: 5★ → `loved`, 4★ → `liked`, 3★ → `meh`, 1–2★ → `dnf`, 0 → keep as-is. User can edit thresholds.

### 3. Enrich
For each parsed row, in parallel batches of 10:
- If row has ISBN → Open Library lookup by ISBN.
- Else → Open Library search by title + author.
- Pull: cover image URL, page count (only if missing), publisher, first-published year.
- Generate cover palette via existing `extractCoverPalette` so books still get a swatch when no cover is found.
- Cache results in `localStorage` keyed by `isbn||title|author` so re-runs are cheap.

User can toggle: "Fetch covers", "Overwrite my page counts", "Fetch series info".

### 4. Review
Virtualized table, one row per book, with inline editing:

```text
 ✓  Cover  Title / Author        Shelf       Rating  Tags          Match
 ✓  [img]  The Overstory         Reading     —       nature, ethics  OL ✓
 ✓  [img]  Piranesi              Liked       4★      —               OL ✓
 ⚠  [—]    Untitled Draft        Want        —       —               no match
 ✗  [img]  The Overstory         Reading     —       —               duplicate
```

- **Dedupe**: rows that match an existing book in the user's library (by ISBN, else by normalized title+author) are flagged `duplicate` and unchecked by default. Action toggle per row: `skip` / `merge` (update fields on existing) / `import as new`.
- **Bulk actions**: select all / none / only matched / only unmatched; bulk shelf reassignment; bulk tag add.
- **Filters**: by shelf, by match status, by has-cover.
- **Inline edit**: click any cell to fix title, author, shelf, tags before commit.
- Header bar shows live counters: `412 to import · 18 duplicates · 7 unmatched`.

### 5. Commit
- Writes are batched: `books` insert, then `user_books` insert, then `book_tags` insert, all chunked at 100 rows per request.
- Progress bar with "Importing 240 / 412…", cancel button.
- On finish: success screen with three counts and three CTAs: **View library**, **Undo this import**, **Import more**.

## Undo

Every import is recorded as an `import_batch` row (id, source, created_at, counts). Every inserted `book` and `user_book` carries `import_batch_id`. The Undo button on the success screen — and a full history under Settings → Imports — issues a single delete by batch id. Within 24h, undo is one click; after that, a confirm dialog appears.

## Edge cases

- **CSV variants**: handle BOM, CRLF, quoted commas, semicolon delimiters (LibraryThing EU exports).
- **Duplicate detection across the import itself**: two rows for the same book in one CSV collapse to one.
- **Long imports**: the wizard keeps a resumable cursor in `localStorage` so a refresh mid-enrich doesn't lose progress.
- **Rate limits**: Open Library lookups capped at 100/min; on 429 we back off and surface a banner ("Slowing down to be polite to Open Library").
- **Privacy**: CSV files stay client-side; only normalized title/author/ISBN strings are sent to Open Library.

## Out of scope (round 3 candidates)

- Direct Goodreads/StoryGraph OAuth (both lack stable public APIs).
- Amazon / Kindle highlight import.
- Auto-import on a schedule.
- Importing reviews as `notes` (we'll pull them into a `notes` field but not into the rich-notes table — users can promote later).

---

## Technical sketch

**Files**
- `src/components/import/ImportWizard.tsx` — shell + step state machine (`useReducer`, no router changes).
- `src/components/import/steps/{Source,FieldMap,Enrich,Review,Done}.tsx`.
- `src/lib/import/parsers/{goodreads,storygraph,generic,openlibrary,epub,paste}.ts` — each exports `parse(input) → ImportRow[]`.
- `src/lib/import/enrich.ts` — Open Library client + cache + palette hook.
- `src/lib/import/dedupe.ts` — normalized key (`title.toLowerCase().replace(/\W/g,'') + '|' + author…`).
- `src/lib/import/commit.ts` — batched inserts; wraps `supabase.from('books').insert([...])`.
- `src/routes/_authenticated/settings.imports.tsx` — history + undo.

**Dependencies**
- `papaparse` — CSV parsing (handles all the variants above).
- `epubjs` or just `jszip` + a tiny OPF reader for EPUB metadata (jszip is lighter, ~30kB).
- No new server functions — all parsing is client-side; writes go through the existing Supabase RLS-protected tables.

**Schema**
One migration:

```sql
create table public.import_batches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  source text not null,            -- 'goodreads' | 'storygraph' | ...
  row_count int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.import_batches enable row level security;
create policy "own batches" on public.import_batches for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.books      add column import_batch_id uuid;
alter table public.user_books add column import_batch_id uuid;
create index on public.books      (import_batch_id);
create index on public.user_books (import_batch_id);
```

No FKs to `import_batches` so undoing a batch never blocks on cascade order — we just `delete from books where import_batch_id = $1` then the batch row.

**Performance**
- Open Library calls are `Promise.all` in chunks of 10 with `AbortController` so leaving the wizard cancels in-flight work.
- Review table uses `@tanstack/react-virtual` (already in tree via shadcn) — comfortable up to ~5,000 rows.
- Commit chunks of 100 keep us well below Supabase's payload + 1000-row read cap.
