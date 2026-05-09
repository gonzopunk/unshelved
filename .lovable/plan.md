
# Pass B (Build 1): Notations — Core + Scroll mode

Ship a new top-level `/notations` tab with three views (Notes / Quotes / Commonplace), shared filters, and a per-view Stream/Scroll display toggle. Card export, the resurfaced-entry hero, keyboard nav, and the print stylesheet are deferred to Build 2.

## What's in this build

### 1. Routes (TanStack file-based)
- `src/routes/_authenticated/notations.tsx` — layout. Renders sub-nav (Notes / Quotes / Commonplace), the shared `<FilterBar>`, the `<DisplayToggle>`, the `<GroupingToolbar>`, then `<Outlet />`. Owns the URL search-params schema (`zodValidator` + `fallback`) so all three child views inherit filters cleanly. Uses `retainSearchParams` so switching views preserves filters.
- `src/routes/_authenticated/notations.notes.tsx` — Notes only.
- `src/routes/_authenticated/notations.quotes.tsx` — Quotes only.
- `src/routes/_authenticated/notations.commonplace.tsx` — both, interleaved. Default display = Scroll, default grouping = By book.
- `src/routes/_authenticated/notations.index.tsx` — redirects to `/notations/commonplace`.

### 2. Shared search-params schema
On the parent `notations.tsx` route:
```
display: 'stream' | 'scroll'      // per-view default applied in component
grouping: 'newest' | 'oldest' | 'book' | 'author' | 'series' | 'axis' | 'month'
axisKey?: string                  // when grouping='axis' or filtering by axis
bookIds: string[]
authorNames: string[]
seriesValues: string[]            // values from the 'series' tag-axis
tagIds: string[]
axisFilter?: string               // e.g. 'mood:melancholy'
dateFrom?: string                 // ISO date
dateTo?: string
kind: 'both' | 'notes' | 'quotes' // only meaningful on Commonplace
q: string                         // search
```
All optional with sensible fallbacks. `stripSearchParams` on defaults so URLs stay clean.

### 3. Data layer
New file `src/lib/notations.ts` with one hook:
- `useNotations()` — single React Query that loads all `notes` + `highlights` with their joined `books` (title, author, cover_color, cover_secondary_color), all `tags` + `book_tags`, all `tag_axes` + `book_axis_values`. Returns a normalized shape with computed `entries: NotationEntry[]` where each entry has `{ kind: 'note' | 'quote', id, bookId, body, pageNumber?, createdAt, book: {...}, tags: Tag[], axisValues: Record<string, string[]> }`. All filtering/grouping/sorting happens client-side off this single data set. Memoized derivations exposed as helpers: `applyFilters(entries, params)`, `groupEntries(entries, grouping)`, `searchEntries(entries, q)`.

### 4. Components (`src/components/notations/`)
- `NoteEntry.tsx` — `rounded-2xl bg-card shadow-paper p-4`, sans body, mono meta line (date · book title · author · "open book" link). Hover actions: Weave, Copy, Open book. **No** left border.
- `QuoteEntry.tsx` — same card frame **plus `border-l-4 border-terra`**, `font-display italic` body with curly quotes, mono meta line (page number if present · book title · author). Same hover actions. The terra bar persists in both display modes.
- `EntryShell.tsx` — small wrapper that picks the right component by kind; used by Commonplace where they interleave.
- `FilterBar.tsx` — chip-based multi-selects for Book, Author, Series (sourced from `axis:series` tag-axis values), Tag, Axis-value (`mood:cozy` style). Date range (two date inputs). Kind toggle (only renders on Commonplace). Search input (debounced 200ms). "Clear all" button. Active filters render as removable chips below.
- `DisplayToggle.tsx` — segmented control (Stream / Scroll). Updates `?display=` via `useNavigate` with the function-form `search` updater so other params persist.
- `GroupingToolbar.tsx` — segmented control for grouping options. Updates `?grouping=`.
- `BookHeader.tsx` — group divider for "by book" grouping; shows cover swatch (cover_color), title, author, count of entries.
- `Divider.tsx` — generic group divider (used for date / month / author / axis groupings).
- `EmptyState.tsx` — small component for "no entries match these filters".

### 5. Display modes
- **Stream** (default for Notes & Quotes) — entries stack at full width with `space-y-3`, `max-w-3xl mx-auto`, body text size base. Quote-vs-Note distinction = terra bar + serif italic on quotes.
- **Scroll** (default for Commonplace) — narrower column `max-w-2xl mx-auto`, increased vertical rhythm (`space-y-8`), Quote body bumps to `text-xl leading-relaxed font-display italic`, Note body stays sans but at `text-lg leading-relaxed`. The terra bar stays on quotes only. Group dividers use a hairline `<hr>` with serif label centered, italic.

### 6. Top nav
Add a fourth `NavItem` to the pill nav in `src/routes/_authenticated.tsx`:
- `<NavItem to="/notations" icon={<NotebookPen />} label="Notations" />` placed between Connections and the search button. Uses `lucide-react`'s `NotebookPen` icon.

### 7. Command palette
Add three commands to `src/components/CommandPalette.tsx`:
- "Open Notations" → `/notations/commonplace`
- "Open Notes" → `/notations/notes`
- "Open Quotes" → `/notations/quotes`

## What's NOT in this build (Build 2)
- `<QuoteCard>` / `<NoteCard>` 1080×1080 export templates and the "Export as card" hover action.
- "Today's resurfaced entry" hero strip on the Notations index.
- Keyboard nav (`j`/`k`/`o`/`c`).
- Print stylesheet for Commonplace.
- `/notations/entry/$kind/$id` stable per-entry URLs.

## What's NOT in this round at all
- Schema changes (none needed).
- Editing entries inline (use book detail page).
- First-class `series` column on books.
- Full-text search ranking.

## Technical notes
- TanStack search-params: use `zodValidator` + `fallback()` from `@tanstack/zod-adapter` (not `.catch()`). Function-form `search` updater on every `<Link>` and `navigate()` call so nothing clobbers other params.
- Filter logic is pure functions in `src/lib/notations.ts` for testability; route components only orchestrate.
- All colors via tokens (`bg-card`, `border-terra`, `text-muted-foreground`, `font-display`, `font-mono`). No raw hex in components.
- Series filter pulls values from the user's `axis:series` tag-axis (if it exists). If the user hasn't created that axis, the Series multi-select renders disabled with a small "Create a 'series' tag-axis to enable" hint that links to `/settings`.
