# Round 3 — Data, expression, and export

Round 2 made it cheap to get a real library *in*. Round 3 makes that library *legible* and *shareable*: charts you'd want to show someone, a typeset commonplace book that reads like a private anthology, drag-rankable tier lists, and a unified export pipeline so any of it can leave the app as PDF, PNG, or CSV.

Three passes, shippable independently. Suggested order: B → A → C (commonplace book is the soul of the app and unblocks export polish; charts come second; tier maker + full export matrix last).

---

## Pass A — Data tab + Bookcloud

A new top-level `/data` route. Editorial, not dashboard-y — every chart is opinionated, click-throughable, and uses the existing palette tokens (forest, paper, ink, accents from cover palettes).

### Routes & files
- `src/routes/_authenticated/data.tsx` — top-level tab, sub-nav for `Charts` and `Bookcloud`.
- `src/lib/stats.ts` — pure functions: `paceHeatmap()`, `volumeOverTime()`, `breakdownBy(field)`, `webDensityOverTime()`, `bookcloudTerms()`. All take pre-fetched data, return shaped arrays — easy to test, easy to feed to Recharts.
- `src/components/data/` — `PaceHeatmap.tsx`, `VolumeChart.tsx`, `BreakdownBar.tsx`, `WebDensityChart.tsx`, `Bookcloud.tsx`, `ChartCard.tsx` (shared frame: title, helper line, click-through CTA).

### Charts (v1 set)
1. **Reading pace heatmap** — calendar grid (last 12 months), cell intensity = pages or minutes that day, sourced from `reading_sessions`. Hover → date + pages + book(s). Click a day → filtered Sessions list for that day.
2. **Volume over time, by format** — stacked area (print/ebook/audiobook), pages/week or minutes/week toggle. Click a band → filtered Library by format + date range.
3. **Breakdown bars** — one component, three views via segmented control: by author, by tag-axis (mood, genre, etc.), by rating. Horizontal bars, top 12 + "Show all". Click a bar → filtered Library.
4. **Web density** — line chart: connections-per-finished-book over time. Sparse early, dense later = the app working as intended. Click a point → Weave filtered by month.

All charts use the chart token system in `src/components/ui/chart.tsx`. Color slots map to forest / accent / ink-muted so palette stays cohesive.

### Bookcloud
- A weighted typographic cloud (no SVG bubble nonsense — actual text, sized 14–56px, color from cover palette of most-rated book in that term).
- Sources: tags (from `book_tags`), tag-axis values (from `book_axis_values`), authors. Toggle which sources to include.
- Weight = frequency × (avg rating ÷ 3). So a tag you used twice and loved both times beats a tag you used five times and shrugged at.
- Click a term → `/library?tag=X` (or `?author=`, `?axis=mood:cozy`).

### Filter passthrough (the click-through contract)
Library and Weave already support some filtering. Pass A extends `library` and `weave` route search params so every chart can deep-link:
- `library?author=...&format=...&status=...&tag=...&axis=mood:cozy&dateFrom=...&dateTo=...`
- `weave?month=2026-04&tag=...`

Add a small `<ActiveFilters>` strip on Library and Weave that shows incoming filters as removable chips so users understand why the view is filtered.

### Out of scope for Pass A
- Year-in-review magazine spread (roadmap item 6 — separate round, this is just the chart vocabulary).
- Saved chart configurations.
- Comparative views ("this year vs last year").

---

## Pass B — Commonplace book view

The soul piece. A `/margins` (or `/commonplace`) route that renders every highlight + note as one continuous, beautifully-typeset scroll. This is the view you'd screenshot, print, or quietly read on a Sunday.

### Routes & files
- `src/routes/_authenticated/commonplace.tsx`.
- `src/components/commonplace/` — `Entry.tsx` (single quote or note), `Divider.tsx` (between books or months), `BookHeader.tsx`, `GroupingToolbar.tsx`, `PrintHeader.tsx`.
- `src/styles/commonplace.css` (or extend `styles.css`) — print stylesheet + display typography. Body in a refined serif (e.g. Source Serif, GT Sectra if licensed, or system serif fallback stack). Quotes in italic, larger size, generous leading. Attribution in small caps. Notes in body weight, indented.

### Behavior
- **Grouping toggle**: Chronological (newest first), By book, By tag-axis (e.g. all "melancholy" highlights), By month.
- **Filter bar**: book, tag, axis-value, date range, kind (quote/note/both). Persists in URL search params.
- **Entry shape**:
  - Quote: large italic body, page number + book title + author below in muted small caps, hover reveals "Weave", "Copy", "Open book" actions.
  - Note: body text, book attribution below, same hover actions.
- **Search**: ⌘F-feel inline search box that filters in place (debounced client-side substring match for v1; full-text in Pass C if needed).
- **Print stylesheet**: removes nav/chrome, renders header with user display name + date range + "A Commonplace Book", uses serif throughout, page-break rules so quotes don't split awkwardly.
- **Density toggle**: Reading (today's default) vs Compact (more per screen, for browsing).

### Data
No schema changes required for v1 — `highlights` and `notes` already exist. Single query: load all highlights + notes for user with their book joins, sort/group client-side. (If perf becomes an issue past ~500 entries, paginate by month.)

### Stretch within Pass B
- "Today's resurfaced quote" hero strip at the top, deterministic seed by date.
- Keyboard nav: `j`/`k` to move between entries, `o` to open the source book.

### Out of scope
- Editing entries inline (already exists on book detail page; link out).
- Weekly resurface email (roadmap, future round).

---

## Pass C — Tier maker + unified export

Two features, one round, because they share the export pipeline.

### Tier maker

**Routes & files**
- `src/routes/_authenticated/tiers.tsx` — index of saved tier lists + "New tier list".
- `src/routes/_authenticated/tiers.$tierId.tsx` — editor.
- `src/components/tiers/` — `TierRow.tsx`, `TierBoard.tsx`, `TierBookCard.tsx`, `TierAxisPicker.tsx`.

**Schema (one new table)**
```sql
create table public.tier_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  axis text,                    -- nullable: "best plot", "prose", or null for general
  rows jsonb not null default '[]'::jsonb,
  -- rows = [{ key: 'S', label: 'S', book_ids: [...] }, { key: 'A', ... }, ...]
  unranked_book_ids jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- RLS: own tier_lists all (auth.uid() = user_id)
```

**Behavior**
- Create from any library subset (filtered library → "Make a tier list of these").
- Default rows S/A/B/C/D/F, editable labels, add/remove rows, recolor row.
- Drag books between rows + an "Unranked" tray at bottom. Use `@dnd-kit/core` (already in deps; verify).
- Save auto on drag end (debounced).
- "Export as image" → PNG via Pass C export pipeline.

### Unified export pipeline

One module, three output types, called from many places.

**File**: `src/lib/export/index.ts` with `exportPdf()`, `exportPng()`, `exportCsv()`.

**Mechanics**
- **PDF**: `@react-pdf/renderer` (server-side via `createServerFn`) or print-stylesheet → "Save as PDF" for v1 (cheaper, native, already works for commonplace book). Default to print-stylesheet route for commonplace + tier list; reserve `@react-pdf` for connection-card PDFs where layout precision matters.
- **PNG**: `html-to-image` (small, browser-only) on a hidden render node. Used for: single quote cards, tier list, web snapshot, single ConnectionCard.
- **CSV**: `papaparse.unparse` (already in deps from Round 2). Used for: library, highlights, notes, connections.

**Endpoints (where the export buttons live)**
- Library page → "Export CSV" (respects current filters).
- Commonplace book → "Print / Save as PDF" (uses print stylesheet).
- Single highlight (hover action on Entry or Book detail) → "Export as quote card PNG".
- Tier list editor → "Export as PNG".
- Weave → "Export web snapshot PNG" + "Export connections CSV".
- Single ConnectionCard → "Export as card PDF".

**Quote-card PNG template**
- Square 1080×1080.
- Cover palette (`books.cover_color` + `cover_secondary_color`) as background gradient.
- Quote in display serif, attribution in small caps, "Unshelved" wordmark in corner. One template, one component (`<QuoteCard>`), used for both PNG export and the resurfaced-quote home strip — single source of truth.

### Out of scope for Pass C
- Public/shareable links to tier lists (roadmap item 10).
- Year-in-Unshelved magazine spread (roadmap item 6).
- Animated/video exports.

---

## Cross-cutting

- **Command Palette additions** (one-line each): `Open Data`, `Open Commonplace book`, `New tier list`, `Export library as CSV`, `Print commonplace book`.
- **Top-nav**: add `Data` and `Commonplace` (or fold both into a single `Library` dropdown if the bar gets crowded — decide once Pass A is live and we can see real density).
- **Memory hooks**: if user picks a serif during Pass B, save it to `mem://design/typography` so future rounds (year-in-review, share cards) inherit it.

## Suggested shipping order
1. **Pass B (Commonplace book)** — biggest soul-per-effort, validates the typographic direction the rest of Round 3 will lean on.
2. **Pass A (Data + Bookcloud)** — needs the click-through filter contract, which benefits from existing routes being a bit more polished post-B.
3. **Pass C (Tier maker + Exports)** — unified export benefits from having both Commonplace (PDF target) and Data (PNG snapshot target) already shipped.

---

## Out of scope for all of Round 3
- KOReader / Audiobookshelf sync (roadmap item 5).
- Year-in-Unshelved magazine spread (roadmap item 6).
- Series & author intelligence (item 8).
- Recommendations (item 9).
- Social / buddy reads (item 10).
- AI-suggested connections.
