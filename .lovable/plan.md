# Round 3 — Tagging that earns its keep, Margins that travel

Round 2 made it cheap to bring a library *in*. Round 3 makes the library *legible*: every book gets a rich, multi-axis identity, and every quote/note becomes searchable across the whole shelf — not trapped on a single book page. This is the substrate that powers Weave filters, future stats, and recs.

Pulled from `roadmap.md` items **3 (Deep, User-Definable Tagging)** and **4 (Margins, deepened)**, plus the connective tissue between them.

Broken into three passes you can ship and live with independently.

---

## Pass A — Tag Axes & the Tagging UX

The data model already has `tag_axes` and `book_axis_values` — they're under-used. Pass A turns them into a first-class system.

### What ships

- **Built-in axes**, seeded for every new user (and backfilled for existing):
  - `pace` (scale 1–5)
  - `spice` (scale 0–5)
  - `mood` (multi-select: cozy, melancholy, propulsive, cerebral, hopeful, bleak, playful, dread, lush, dry)
  - `pov` (single: 1st, close 3rd, omniscient, multi-POV, 2nd)
  - `tropes` (free multi-select with autocomplete)
  - `content_warnings` (multi-select from a curated list + free-form)
  - `genre` (multi-select, autocomplete)
- **Free-form tags** stay (existing `tags` + `book_tags`) — coexist, don't replace.
- **Axis editor** under Settings → Tags & Axes: rename labels, hide built-ins, reorder, add custom axes (scale or multi-select), edit allowed values.
- **Per-book Tag Sheet** (replaces the thin `QuickTagBar`): a single popover on the book page with all axes laid out — sliders for scales, chip pickers for multi-select, free tags at the bottom. One save, optimistic.
- **Tag chips everywhere**: book cards on `/`, `/board`, and book detail show 2–3 most distinctive axis values (e.g. `pace 4 · cozy · 1st`).
- **Onboarding nudge**: when a book has zero axis values, the detail page surfaces a soft "Tag this book" prompt above the fold.

### Technical sketch

```text
src/components/tags/
  TagSheet.tsx        — full multi-axis editor popover
  AxisField.tsx       — renders one axis (scale | multi | single)
  AxisChip.tsx        — read-only chip used on cards
  AutocompleteInput.tsx — shared chip input (used by free tags + tropes)

src/routes/_authenticated/settings.tags.tsx — axis editor

src/lib/tags.ts       — already exists; extend with:
  - listAxes(), upsertAxisValue(), seedBuiltInAxes()
  - distinctiveAxesFor(book) helper for card chips
```

Schema work is small — the tables already exist. Migration adds:

```sql
-- one trigger to seed built-in axes for new users (idempotent)
create or replace function public.seed_builtin_axes_for_user(_uid uuid)
  returns void language plpgsql security definer set search_path = public as $$ ... $$;

-- one-shot RPC for backfill on first load:
create or replace function public.ensure_builtin_axes()
  returns void language plpgsql security definer set search_path = public as $$
    select public.seed_builtin_axes_for_user(auth.uid());
  $$;
```

No destructive changes; existing custom tags untouched.

---

## Pass B — Global Margins (`/margins`)

Today notes and quotes only exist on the book detail page. Pass B promotes them to a top-level commonplace book.

### What ships

- **New route `/margins`** in the top nav, between Library and Weave.
- **Unified feed** of every `note` and `highlight` you've written, newest first, grouped by month with sticky month headers.
- **Filters**:
  - kind: notes / quotes / both
  - book (autocomplete chip)
  - axis values (e.g. `mood: melancholy`) — pulls in Pass A's data
  - free tag chips
  - date range
  - has-page-number, has-quote-text length > N
- **Search** across `quote_text` and `content` with Postgres `websearch_to_tsquery` (cheap GIN index).
- **Card design**:
  - Quote card: large pull-quote in display serif, book + page below, swatch in the book's `cover_color`, "Weave" + "Copy" actions on hover.
  - Note card: smaller, body type, same metadata footer.
- **Detail drawer**: click any card → side drawer with full text, related connections (existing Weave query), edit / delete inline.
- **Today's resurface**: top of `/margins` shows 1 quote and 1 note from "this week, last year" or random if no anniversary — single dismissable strip, not a modal.
- **Export**: "Copy as Markdown" on any card; "Export filtered set" button (downloads `.md` + `.json`).

### Technical sketch

```text
src/routes/_authenticated/margins.tsx
src/components/margins/
  MarginsFeed.tsx       — virtualized list with month dividers
  MarginsFilters.tsx    — sticky left rail (collapses on mobile to a sheet)
  QuoteCard.tsx
  NoteCard.tsx
  ResurfaceStrip.tsx
  MarginDrawer.tsx
src/lib/margins.ts      — combined query: highlights ∪ notes with shared shape
```

Schema: one migration, additive.

```sql
alter table public.highlights add column if not exists tags text[] default '{}';
alter table public.notes      add column if not exists tags text[] default '{}';

create index if not exists highlights_text_fts
  on public.highlights using gin (to_tsvector('english', quote_text));
create index if not exists notes_text_fts
  on public.notes      using gin (to_tsvector('english', content));
```

No new RLS — existing per-user policies cover it.

---

## Pass C — Tag-aware Weave + Resurface email + polish

Pass C is the connective tissue: it makes Pass A and B *feel* like one feature, not two.

### What ships

- **Weave filter expansion**: the `FilterChip` rail on `/weave` gains an "Axes" group. Pick `mood: cozy` and the graph + list constrain to connections whose endpoints share that value. Same UX on the per-book Weave tab.
- **Distinctive-axis chips on Weave nodes**: web view labels show one axis value under the title for quicker scanning.
- **Smart Margins clusters**: at the top of `/margins`, three auto-generated chip groups appear based on your data:
  - "Most quoted books" (top 3)
  - "Most-tagged moods this year"
  - "Quotes you wove from" (highlights that anchor ≥1 connection)
  Each clicks to a pre-filtered view.
- **Weekly Resurface email** (opt-in toggle in Settings → Notifications):
  - Edge function `weekly-resurface` runs Sunday 09:00 in user's stored timezone (default UTC).
  - Picks 3 quotes + 1 note via a deterministic seed (so the same user/week always gets the same picks — replayable).
  - Sent via Resend; template lives in `supabase/functions/weekly-resurface/template.ts`.
  - One-click "unsubscribe" sets `profiles.resurface_email = false`.
- **Command Palette additions**: "Open Margins", "Filter Margins by mood…", "Open Tag Sheet for current book", "Edit tag axes".
- **Card chip everywhere**: `BookCard`, `BookSpine`, `/board` columns get the same 2–3 distinctive-axes chip strip from Pass A — closes the loop visually.

### Technical sketch

```text
supabase/functions/weekly-resurface/
  index.ts              — reads profiles where resurface_email = true
  template.ts           — minimal HTML, system-font, single accent color
  pick.ts               — seeded RNG + scoring

src/routes/_authenticated/settings.notifications.tsx — toggle + preview
```

Schema additions:

```sql
alter table public.profiles
  add column if not exists timezone text default 'UTC',
  add column if not exists resurface_email boolean not null default false,
  add column if not exists resurface_last_sent_at timestamptz;
```

Cron: pg_cron job calling the edge function hourly; the function self-filters by local-hour-of-week so we don't need a per-user scheduler.

---

## Out of scope for round 3 (deferred to round 4)

- Open-Reader Sync (KOSync, Audiobookshelf) — roadmap item 5, separate moat work.
- Editorial Stats Dashboard — needs Pass A's data to be dense first; revisit after a few weeks of real tagging.
- Public/shared Margins or Weave links — social surface, not now.
- AI-suggested connections from quote text — interesting but premature.

---

## Suggested shipping order

1. **Pass A** first — every other pass and every future feature is better when axis data exists. ~1 build session.
2. **Pass B** standalone — independently shippable; doesn't strictly need Pass A but is dramatically better with it.
3. **Pass C** last — it's polish + the email loop; only worthwhile once A and B are real.

Approve and I'll start with Pass A.
