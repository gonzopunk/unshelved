# Tagging System — Detailed Spec

The taxonomy layer that turns Unshelved from a shelf into a *queryable* library. Powers Weave filters, Margins search, recommendations, and the stats dashboard. Designed to feel as *cozy and editorial* as the rest of the app — not a database admin panel.

## Goals

1. **Two complementary surfaces**: structured **axes** (consistent, sortable, chartable) + free-form **tags** (expressive, idiosyncratic).
2. **Low-friction capture**: tag a book in <5 seconds without opening a modal.
3. **No dead taxonomies**: every tag/axis value should be useful somewhere — filtering, charts, Weave, or recs.
4. **User-owned**: every built-in axis can be renamed, hidden, or extended; new axes can be invented.

## Concept model

Two distinct primitives:

### A. Axes (structured)
A named dimension with a fixed value space and a UI control type. Each book gets at most one value per axis (or a small bounded set, e.g. content warnings).

Built-in axes (seeded for every user, all editable/hideable):

| Axis | Type | Values | Purpose |
|---|---|---|---|
| **Spice** | scale 0–5 | 🌶 chips | Heat level |
| **Pace** | scale 1–5 | slow → breakneck | Mood/expectation matching |
| **Mood** | multi-select | cozy, melancholy, propulsive, dreamy, brutal, hopeful, weird, comforting, unsettling, tender (editable) | Recs + stats radar |
| **POV** | single-select | 1st, close 3rd, omniscient, multi-POV, 2nd, epistolary | Craft signal |
| **Tense** | single-select | past, present, mixed | Craft signal |
| **Content warnings** | multi-select | SA, OD, suicide, animal harm, child harm, graphic violence, eating disorders, etc. (editable) | Safety filter |
| **Tropes** | multi-select free-tag | enemies-to-lovers, found family, locked room, etc. | Recs + Weave |
| **Setting era** | single-select | contemporary, near-future, far-future, historical, secondary-world, ahistorical | Recs |
| **Form** | single-select | novel, novella, short stories, essays, poetry, memoir, hybrid | Stats |

### B. Free tags (unstructured)
Lowercase, user-coined, autocompleted from prior use. Live alongside axes. Shown as paper-tape chips. Soft-merge suggestions when two tags differ only in case/whitespace/plural.

Both surfaces share filter and search UIs.

## Schema

```sql
-- One row per axis definition. Seed built-ins per user via handle_new_user.
create table tag_axes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  key text not null,                 -- stable slug: 'spice', 'mood'
  label text not null,               -- editable display: 'Spice 🌶'
  kind text not null,                -- 'scale' | 'single' | 'multi'
  scale_min int, scale_max int,      -- for kind='scale'
  values text[] default '{}',        -- for single/multi: allowed values (free-tag axis = empty + open=true)
  open boolean default false,        -- multi axis can accept new values inline
  hidden boolean default false,
  position int default 0,
  built_in boolean default false,
  created_at timestamptz default now(),
  unique (user_id, key)
);

-- One row per (book, axis) — structured values.
create table book_axis_values (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  book_id uuid not null,
  axis_id uuid not null references tag_axes(id) on delete cascade,
  scale_value int,                   -- for scale axes
  values text[] default '{}',        -- for single (1 elem) / multi
  updated_at timestamptz default now(),
  unique (user_id, book_id, axis_id)
);

-- Free tags. Lowercase, deduped.
create table tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,                -- lowercase, trimmed
  color text,                        -- optional, derives from cover palette by default
  use_count int default 0,
  created_at timestamptz default now(),
  unique (user_id, name)
);

create table book_tags (
  user_id uuid not null,
  book_id uuid not null,
  tag_id uuid references tags(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (book_id, tag_id)
);
```

All four tables: RLS `auth.uid() = user_id`. Indexes on `(user_id, book_id)` and `tags.name`.

`handle_new_user()` extended to seed the nine built-in axes + a starter set of moods/warnings/tropes.

## Capture UX

Three entry points, ranked by frequency:

1. **Quick-tag bar on the book detail page** (primary surface)
   - Horizontal strip under the title: each axis as a compact chip control. Spice/Pace = inline 🌶/🏃 1–5 dots. Single-select = pill dropdown. Multi-select = chip row + `+`. Free tags = paper-tape input.
   - All edits autosave on blur/click. No "save" button. No modal.
2. **Inline on the AddBookModal** "Tag-as-you-add" step
   - After cover/metadata confirm, optional "Quick tag" panel with the same controls. Skippable.
3. **Bulk tagger on `/library`**
   - Multi-select books → tag tray slides up → apply axes/tags to all. Critical for back-filling an imported library.

Autocomplete: free-tag input shows top 8 by `use_count`, with case-insensitive prefix match. Hitting Enter on an unknown tag creates it.

Suggested tags: lightweight heuristic — surface tags used on books that share author/series/format. Marked with a faint `↗`. (No AI in v1.)

## Display & filtering

- **Book card**: up to 3 tags + spice/pace dots in a compressed footer row. Overflow `+N`.
- **Library filter rail**: collapsible per-axis facets + free-tag cloud (sized by use_count). Multi-filter = AND across axes, OR within axis values. `match all tags` toggle.
- **Weave**: existing tag-string filter upgrades to multi-select chips drawn from this system. Connections written via the Weave modal can pull from the same vocabulary, ending the current tag-string drift between books and connections.
- **Margins (future)**: same filter rail, scoped to highlights/notes inherited from their book's tags.
- **Stats (future)**: mood radar, pace heatmap, spice histogram, top-N free tags.

## Tag management page (`/settings/tags`)

- List of axes with drag-to-reorder, rename, hide, add value, delete value (with usage count + "move existing books to…" merge).
- Free tags table: name, count, last used, merge-into, rename, delete. Bulk-merge by selection.
- "Create axis" flow: pick kind (scale/single/multi), define values, optional emoji label.

## Edge cases & rules

- Deleting a value from a single/multi axis: prompt to merge into another value or clear from N books.
- Hiding a built-in axis hides it from capture but preserves its data.
- Renaming an axis does not change its `key` (so queries/charts stay stable).
- Free tags are per-user, not global — no shared vocabulary in v1 (parked with social).
- Content warnings render with a slightly different chip style (muted, prefixed `cw:`) so they read as warnings, not flair.

## Integration touchpoints

- **Weave**: `connections.tags` migrates from free strings to references into `tags` (back-compat: keep the array column, write both during transition, swap reads after a window). Connection form replaces text input with the same tag chip control used elsewhere.
- **Recommendations (#9)**: every book becomes a vector over (mood, pace, spice, tropes, top free tags). Cheap cosine sim is a real first-pass rec engine.
- **Stats dashboard (#6)**: axes are the dashboard's spine — radar/heatmap/histogram each map to one axis.
- **Margins (#4)**: free-tag input on highlights/notes uses the same `tags` table, scoped to the parent book's tag set + global suggestions.
- **Import (#2)**: Goodreads "shelves" + StoryGraph "tags/moods/pace/content warnings" map directly onto axes during import — Storygraph especially is a near-perfect schema match.

## Build order (within this feature)

1. **Schema + seed** — migration, extend `handle_new_user`, types regen.
2. **`useAxes`, `useTags`, mutation hooks** in `src/lib/tagging.ts`.
3. **Quick-tag bar** on book detail page (the highest-leverage surface).
4. **Library filter rail** upgrade.
5. **Weave filter chip upgrade + connection form vocab unification.**
6. **Bulk tagger** on `/library`.
7. **`/settings/tags` management page.**
8. **AddBookModal "Quick tag" step.**

Steps 1–4 are the MVP that makes the feature genuinely useful; 5–8 are polish and unification that pay off as Margins, Stats, and Recs land.

## Out of scope (v1)

- AI-suggested tags (parked alongside AI-suggested connections).
- Shared/public tag vocabularies.
- Tag-based smart shelves (auto-updating saved filters) — easy follow-up once filters work.
- Per-quote tagging UI (schema supports it via `book_tags`-equivalent later; UI deferred to Margins-deepened).
