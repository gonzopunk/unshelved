
# Round 3 — Pass A.0: Library

A new top-level **Library** route — a flat, filterable, sortable, searchable view of every book a user owns. The home of long-tail library management for users with hundreds of books that don't all fit cleanly into Want / Reading / Finished. Designed so chart click-throughs from the upcoming Visualizations pass land in a meaningful filtered view.

`/` (Home dashboard) and `/board` (kanban) are unchanged. Library is additive.

---

## 1. Routes & files

```
src/routes/_authenticated/
  library.tsx                     # the Library page
src/components/library/
  LibraryFilters.tsx              # left rail / collapsible filter bar (chips + dropdowns)
  LibraryGrid.tsx                 # responsive grid of book cards
  LibraryList.tsx                 # dense list/table alternative
  LibraryToolbar.tsx              # sort, view-mode toggle (grid/list), result count
  ActiveFilters.tsx               # chip strip showing applied filters with × to remove
                                  # SHARED — also used by Notations, Connections, Visualizations
src/lib/
  library-filter.ts               # pure: filterLibrary(books, filters), sortLibrary(books, sort)
```

`<ActiveFilters>` lives under `src/components/library/` for now since it's born here, but its API is generic — Notations and Connections will import it as-is.

---

## 2. URL search-param contract

Drives all state. Single source of truth, shareable, click-through-friendly.

```ts
// src/routes/_authenticated/library.tsx — validateSearch (zod + fallback)
{
  q:        string,                       // free-text title/author/notes search
  status:   "want" | "reading" | "loved" | "liked" | "meh" | "dnf" | "paused",
  format:   "print" | "ebook" | "audiobook",
  author:   string,                       // exact match (chart click-through)
  tag:      string,                       // tag NAME (case-insensitive)
  axis:     string,                       // "mood:cozy" or "spice:3" — colon-separated key:value
  rating:   1 | 2 | 3 | 4 | 5,
  dateFrom: string,                       // ISO date — finished_at lower bound
  dateTo:   string,                       // ISO date — finished_at upper bound
  sort:     "added" | "title" | "author" | "rating" | "finished" | "progress",
  dir:      "asc" | "desc",               // default "desc"
  view:     "grid" | "list",              // persisted; default "grid"
}
```

All fields optional, all use `fallback()` from `@tanstack/zod-adapter` so bad URLs degrade gracefully. Defaults stripped from URL via `stripSearchParams` middleware.

---

## 3. UI

### Filter bar (top, sticky on scroll)
- **Search** input (debounced 200ms, writes `q`).
- **Status** dropdown (multi? — see open Q1).
- **Format** dropdown.
- **Tags** combobox — populated from `tags` table for this user, autocomplete.
- **Tag-axis** combobox — populated from `tag_axes` + `book_axis_values`. Selecting an axis reveals its values (enum or scale).
- **Author** combobox — populated from distinct `books.author` values.
- **Rating** segmented control (1–5 stars).
- **Finished date range** — two date inputs.
- **Reset** button.

### Active filters strip (between filter bar and results)
- Renders one chip per applied filter: `Author: McCarthy ×`, `Tag: melancholy ×`, etc.
- Click `×` removes that one filter (writes URL).
- "Clear all" link if 2+ filters.

### Toolbar
- Result count: `123 books`.
- Sort dropdown (sort + dir combined: "Recently added", "Title A→Z", "Rating: high→low", "Finished: newest", etc.).
- View toggle: **Grid** / **List**.

### Grid view
- Reuses `BookCard` (already exists). Responsive 2/3/4/5 columns.
- Empty state: "No books match these filters. [Reset]" or "Your library is empty. [Add a book]".

### List view
- Compact rows: cover thumb · title · author · status · rating · finished date · format icon. Sortable column headers when `view=list`.
- Better for managing 200+ books at a glance.

### Pagination / virtualization
- v1: render all books client-side, no pagination. The `useLibrary` query already loads everything.
- If a user reports lag at 500+ books, swap `LibraryGrid`/`LibraryList` to `react-virtual`. Out of scope for v1.

---

## 4. Data

No schema changes. All filtering is client-side over the `useLibrary()` result set. New shape:

```ts
// src/lib/library-filter.ts
export type LibraryFilters = { /* mirror of validateSearch */ };
export function filterLibrary(books: BookWithShelf[], f: LibraryFilters, ctx: {
  bookTags: Record<string, string[]>;        // bookId → tag names
  bookAxes: Record<string, BookAxisValue[]>; // bookId → axis values
}): BookWithShelf[];
export function sortLibrary(books: BookWithShelf[], sort, dir): BookWithShelf[];
```

`bookTags` and `bookAxes` come from two new lightweight hooks in `src/lib/queries.ts`:
- `useBookTagsMap()` — joins `book_tags` + `tags`, returns `Record<bookId, string[]>`.
- `useBookAxisMap()` — joins `book_axis_values` + `tag_axes`, returns `Record<bookId, {key, value}[]>`.

Both keyed by user_id, cached aggressively.

---

## 5. Top-nav reorganization

Confirmed scheme:

```
Library  Board  Connections  Notations  Visualizations  ·  Add  Search  Settings  Exit
```

Changes:
- Remove "Home" link (Unshelved wordmark already routes to `/`).
- Add **Library** at position 1.
- Add **Visualizations** placeholder link (greyed/coming-soon, OR omit entirely until Pass A ships — see open Q2).
- Reorder: Connections before Notations (per your spec).
- Add a visual divider before utilities.

`/` remains the dashboard. Wordmark → `/` works as Home.

---

## 6. Command Palette additions

- "Go to Library"
- "Library: filter by status…" (opens sub-prompt)
- "Library: filter by tag…"
- "Library: filter by author…"
- "Library: clear filters"
- Existing entries reordered to match new top-nav order.

---

## 7. Out of scope for Pass A.0
- Saved filter presets / "smart shelves".
- Bulk edit (multi-select books to retag, change format, etc.).
- Virtualization (defer until scale demands it).
- Series filter (no first-class field).
- Connections-count column (defer until charts demand it).
- Visualizations route itself — that's Pass A, follows immediately after.

---

## 8. How Pass A (Visualizations) builds on this

Once Library ships, Pass A becomes much cleaner:
- All chart click-throughs land at `/library?<filter>` via the same `validateSearch` schema.
- `<ActiveFilters>` is already built; Notations and Connections also adopt it.
- The "filter passthrough contract" is one schema, defined here, reused everywhere.
- Pass A scope shrinks back to: charts + Bookcloud + minor `validateSearch` extensions on Notations/Connections to accept the shared filter shape.

---

## Open questions

1. **Multi-select on Status / Format / Tags?** Single-select is simpler and enough for chart click-throughs. Multi-select (e.g. "show me both 'reading' and 'paused'") is more powerful for human management. *Recommendation: multi-select for Status, Tags, and Tag-axis values; single-select for Format, Author, Rating.* URL encodes as comma-separated (`?status=reading,paused`).

2. **Visualizations nav entry now or later?** (a) Show "Visualizations" in nav now as a disabled/coming-soon link so the IA is visible. (b) Add it only when Pass A lands. *Recommendation: (b) — avoid dead links.*

3. **Default sort on first visit?** "Recently added" (current `useLibrary` order) or "Title A→Z" (more library-catalog-feeling)? *Recommendation: Recently added.*

---

## Files summary

**New (8):** `library.tsx`, `LibraryFilters.tsx`, `LibraryGrid.tsx`, `LibraryList.tsx`, `LibraryToolbar.tsx`, `ActiveFilters.tsx`, `library-filter.ts`. Plus two hook additions in `queries.ts` (`useBookTagsMap`, `useBookAxisMap`).

**Modified:** `_authenticated.tsx` (top-nav), `CommandPalette.tsx` (entries + reorder), `routeTree.gen.ts` (auto).

**Dependencies:** none new. (`@tanstack/zod-adapter` already installed.)
