
# Round 3 — Visualizations, Notations, and Export

Round 2 made it cheap to get a real library *in*. Round 3 makes it *legible*, *searchable*, and *shareable*: opinionated charts, a flexible home for every mark you've left on a book, drag-rankable tier lists, and one export pipeline serving them all.

Three passes, shippable independently. Suggested order: **B → A → C** (Notations validates the typographic direction the rest of Round 3 will lean on; Visualizations needs the click-through filter contract; Tier maker + exports benefit from both already shipped).

---

## Pass A — Visualizations + Bookcloud

A new top-level `/visualizations` route. Editorial, not dashboard-y — every chart is opinionated, click-throughable, and uses the existing palette tokens (forest, paper, ink, terra, accents from cover palettes).

### Routes & files
- `src/routes/_authenticated/visualizations.tsx` — top-level tab, sub-nav for `Charts` and `Bookcloud`.
- `src/lib/stats.ts` — pure functions: `paceHeatmap()`, `volumeOverTime()`, `breakdownBy(field)`, `webDensityOverTime()`, `bookcloudTerms()`. Take pre-fetched data, return shaped arrays — easy to test, easy to feed Recharts.
- `src/components/visualizations/` — `PaceHeatmap.tsx`, `VolumeChart.tsx`, `BreakdownBar.tsx`, `WebDensityChart.tsx`, `Bookcloud.tsx`, `ChartCard.tsx` (shared frame: title, helper line, click-through CTA).

### Charts (v1 set)
1. **Reading pace heatmap** — calendar grid (last 12 months), cell intensity = pages or minutes that day, sourced from `reading_sessions`. Hover → date + pages + book(s). Click a day → Sessions list filtered to that date.
2. **Volume over time, by format** — stacked area (print/ebook/audiobook), pages/week or minutes/week toggle. Click a band → Library filtered by format + date range.
3. **Breakdown bars** — one component, four views via segmented control: by **author**, by **series** (where known), by **tag-axis** (mood, genre, etc.), by **rating**. Horizontal bars, top 12 + "Show all". Click a bar → filtered Library.
4. **Web density** — line chart: connections-per-finished-book over time. Sparse early, dense later = the app working as intended. Click a point → Weave filtered by month.

All charts use the chart token system in `src/components/ui/chart.tsx`. Color slots map to forest / accent / ink-muted so the palette stays cohesive.

### Bookcloud
- A weighted typographic cloud (no SVG bubble nonsense — actual text, sized 14–56px, color from cover palette of most-rated book in that term).
- Sources: tags (`book_tags`), tag-axis values (`book_axis_values`), authors. Toggle which sources to include.
- Weight = frequency × (avg rating ÷ 3). A tag you used twice and loved both times beats a tag you used five times and shrugged at.
- Click a term → `/library?tag=X` (or `?author=`, `?axis=mood:cozy`).

### Filter passthrough (the click-through contract)
Library and Weave gain typed search params via `zodValidator(...)` so every chart can deep-link:
- `library?author=...&series=...&format=...&status=...&tag=...&axis=mood:cozy&dateFrom=...&dateTo=...`
- `weave?month=2026-04&tag=...`

Add an `<ActiveFilters>` strip on Library and Weave that shows incoming filters as removable chips so users understand why the view is filtered.

### Out of scope for Pass A
- Year-in-review magazine spread (separate round).
- Saved chart configurations.
- Comparative views ("this year vs last year").

---

## Pass B — Notations

A new top-level **Notations** tab: the home of every mark you've left on a book. Three views over the same data; filters and the display toggle are shared across all three.

The value here is **slicing**, not scrolling. You should be able to ask "every quote from McCarthy I marked melancholy" or "every note from books in the Earthsea series" and get a clean answer in three keystrokes. The Commonplace view is the expressive lens on top of that — beautifully typeset, print-friendly, occasionally lovely — but it's a *consequence* of the data being well-organized, not the headline feature.

### Routes & files
- `src/routes/_authenticated/notations.tsx` — layout with sub-nav (`Notes` / `Quotes` / `Commonplace`) and shared filter bar + display toggle.
- `src/routes/_authenticated/notations.notes.tsx`
- `src/routes/_authenticated/notations.quotes.tsx`
- `src/routes/_authenticated/notations.commonplace.tsx`
- `src/components/notations/` — `NoteEntry.tsx`, `QuoteEntry.tsx`, `Divider.tsx`, `BookHeader.tsx`, `FilterBar.tsx`, `GroupingToolbar.tsx`, `DisplayToggle.tsx`, `QuoteCard.tsx`, `NoteCard.tsx`, `PrintHeader.tsx`.
- `src/styles.css` extension — print stylesheet + scroll-mode typography (refined serif body, italic display for quotes, small caps for attribution).

### Visual distinction (non-negotiable, mirrors book detail)
The visual language for Notes vs Quotes is already established on the book detail page and **must be preserved across all three Notations views, in both Stream and Scroll display modes**:

- **Note** — `rounded-2xl bg-card shadow-paper`, body in sans (`font-sans`), no left accent. Meta line in mono (`font-mono text-xs text-muted-foreground`): date, book title · author.
- **Quote** — same card frame **plus `border-l-4 border-terra`** (the terra accent bar is the signal), body in **`font-display italic`** with curly quotes, slightly larger leading-snug. Meta line in mono: page number (if any), book title · author.

Two distinct entry components (`NoteEntry`, `QuoteEntry`) — not one polymorphic component with conditional styling — so the distinction stays sharp and each can evolve independently. In the **Commonplace** view (interleaved), the alternation between the bare card and the terra-barred italic blockquote is the texture you skim against; that visual contrast is the point. In **Scroll** display mode, the contrast intensifies (larger display serif on quotes, generous leading on both, but the terra bar persists on quotes only).

The shared `<QuoteCard>` and `<NoteCard>` export templates inherit the same distinction: quote cards lean on display serif + italic + cover-palette gradient with a terra accent stroke; note cards use sans body on the same gradient, no accent stroke. Same DNA, two voices.

### Three views, one dataset

| View          | Data                  | Default display | Default grouping            |
| ------------- | --------------------- | --------------- | --------------------------- |
| Notes         | `notes`               | **Stream**      | Chronological, newest first |
| Quotes        | `highlights`          | **Stream**      | Chronological, newest first |
| Commonplace   | both, interleaved     | **Scroll**      | By book                     |

### Display toggle (per view, sticky in URL via `?display=stream|scroll`)
- **Stream** — compact, one entry per row, mono meta line, fast skim. Best for triage and search. Note/Quote distinction preserved as above.
- **Scroll** — typeset reading surface. Larger leading, display serif on quotes, generous whitespace, page-break friendly. The "private anthology" aesthetic.

The toggle appears on every view; the URL persists the override so links round-trip cleanly.

### Shared filter bar (URL-persisted, applies to active view)
- **Book** (multi-select)
- **Author** (multi-select)
- **Series** (multi-select, where known)
- **Tag** (multi-select)
- **Tag-axis value** (e.g. `mood:melancholy`)
- **Date range**
- **Kind** (only meaningful on Commonplace: quotes / notes / both)
- **Search** — debounced client-side substring match for v1.

Filters persist across view switches (Quotes → Commonplace carries your filters). Each chip is removable; "Clear all" resets.

### Grouping toolbar (per view)
Chronological (newest / oldest), By book, By author, By series, By tag-axis value, By month.

### Entry actions (hover or focus)
**Weave**, **Copy**, **Open book**, **Export as card**. Every entry has a stable URL (`/notations/entry/$kind/$id`) for direct linking and card-export deep links.

### Card export (built into Notations, consumed by Pass C)
Every entry has an "Export as card" action that opens a preview using the appropriate template:
- `<QuoteCard>` for highlights — 1080×1080, cover palette gradient, terra accent stroke, display serif italic body, small caps attribution, "Unshelved" wordmark.
- `<NoteCard>` for notes — same canvas, sans body, no accent stroke, attribution in small caps.

User can adjust: include/hide page number (quotes), include/hide attribution, swap to a light/dark variant. Single-button PNG export uses the Pass C pipeline.

### Stretch within Pass B
- "Today's resurfaced entry" hero strip on the Notations index (deterministic seed by date), uses the same card components.
- Keyboard nav in scroll mode: `j`/`k` between entries, `o` to open the source book, `c` to export current as card.
- Print stylesheet on Commonplace: removes nav/chrome, renders header with display name + active filters summary + date, page-break rules so quotes don't split awkwardly. Terra bar prints.

### Data
No schema changes for v1 — `highlights` and `notes` already exist. Series isn't currently a column on `books`; for grouping/filtering by series, treat it as a derived value from a reserved tag-axis (e.g. `axis:series`) until a first-class `series` field is added in a later round. Single query per view: load all relevant entries with book joins, sort/group client-side. Paginate by month if perf degrades past ~500 entries.

### Out of scope
- Editing entries inline (already exists on book detail page; link out).
- Weekly resurface email.
- Full-text search ranking (substring match is fine for v1).
- First-class `series` column on books.

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
  -- rows = [{ key: 'S', label: 'S', color: '#...', book_ids: [...] }, ...]
  unranked_book_ids jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- RLS: own tier_lists all (auth.uid() = user_id)
```

**Behavior**
- Create from any library subset (filtered library → "Make a tier list of these").
- Default rows S/A/B/C/D/F, editable labels, add/remove rows, recolor row.
- Drag books between rows + an "Unranked" tray at bottom. Use `@dnd-kit/core` (verify it's in deps; add if not).
- Auto-save on drag end (debounced).
- "Export as image" → PNG via Pass C pipeline.

### Unified export pipeline

One module, three output types, called from many places.

**File**: `src/lib/export/index.ts` exporting `exportPdf()`, `exportPng()`, `exportCsv()`.

**Mechanics**
- **PDF**: print-stylesheet route ("Save as PDF") for Commonplace + tier list — cheap, native, already styled. Reserve `@react-pdf/renderer` for ConnectionCard PDFs where layout precision matters.
- **PNG**: `html-to-image` (browser-only) on a hidden render node. Used for: quote/note cards, tier lists, web snapshot, single ConnectionCard.
- **CSV**: `papaparse.unparse` (already in deps from Round 2). Used for: library, highlights, notes, connections.

**Endpoints (where the export buttons live)**
- Library page → "Export CSV" (respects current filters).
- Notations / Commonplace view → "Print / Save as PDF" (respects current filters + grouping).
- Notations / any entry (hover action) → "Export as card PNG" (uses `<QuoteCard>` or `<NoteCard>` from Pass B).
- Tier list editor → "Export as PNG".
- Weave → "Export web snapshot PNG" + "Export connections CSV".
- Single ConnectionCard → "Export as card PDF".

**Card templates (shared between Pass B and Pass C)**
Two components, one DNA. `<QuoteCard>` and `<NoteCard>` both: 1080×1080, cover palette (`books.cover_color` + `cover_secondary_color`) as background gradient, attribution in small caps, "Unshelved" wordmark in corner. Quote variant adds terra accent stroke + display serif italic body. Note variant uses sans body, no accent. Single source of truth shared by Notations card-export and the home-page resurfaced-entry strip.

### Out of scope for Pass C
- Public/shareable links to tier lists.
- Year-in-Unshelved magazine spread.
- Animated/video exports.

---

## Cross-cutting

- **Top-nav additions**: `Visualizations` and `Notations` as top-level tabs. Watch density; if the bar gets crowded after Pass A, fold `Tiers` under a `Library` dropdown.
- **Command Palette additions**: `Open Visualizations`, `Open Notations`, `Open Commonplace`, `New tier list`, `Export library as CSV`, `Print commonplace book`, `Export entry as card`.
- **Memory hooks**: lock the Note/Quote visual distinction (terra bar + display italic on quotes, plain sans on notes) into `mem://design/notations` so future rounds inherit it. If the user picks a serif during Pass B, save it to `mem://design/typography`.

## Suggested shipping order
1. **Pass B (Notations)** — biggest soul-per-effort, validates the typographic direction, and the card components it produces are reused by Pass C.
2. **Pass A (Visualizations + Bookcloud)** — needs the click-through filter contract, benefits from existing routes being polished post-B.
3. **Pass C (Tier maker + Exports)** — unified export benefits from having both Commonplace (PDF target) and Visualizations (PNG snapshot target) already shipped.

---

## Out of scope for all of Round 3
- KOReader / Audiobookshelf sync.
- Year-in-Unshelved magazine spread.
- First-class `series` field on books (using axis convention for now).
- Recommendations.
- Social / buddy reads.
- AI-suggested connections.
