
# Round 3 — Pass A: Visualizations

A new top-level **Visualizations** route — the "data is beautiful" surface for readers. Every chart is opinionated, click-throughable into `/library?…`, and themed in the existing palette (forest, paper, ink, plus per-cover accents).

`/visualizations` ships with two sub-views: **Charts** (default) and **Bookcloud**. URL-driven, sub-view persisted in search params.

---

## 1. Routes & files

```
src/routes/_authenticated/
  visualizations.tsx              # tab shell (Charts | Bookcloud), validateSearch
src/components/viz/
  VizTabs.tsx                     # sub-view switcher
  ChartsBoard.tsx                 # grid of chart cards
  ChartCard.tsx                   # shared card frame (title, sublabel, hint, body)
  charts/
    StatusMix.tsx                 # donut: status distribution
    FormatSplit.tsx               # stacked bar: print/ebook/audiobook
    FinishedByMonth.tsx           # area chart: finished_at over last 12mo
    RatingHistogram.tsx           # bar: rating 1–5
    TopAuthors.tsx                # horizontal bar: top 10 authors by count
    TagCloud.tsx                  # tag freq treemap (small)
    AxisProfile.tsx               # radar: avg axis values across library
    PaceHeatmap.tsx               # cal-heatmap of reading_sessions minutes
  Bookcloud.tsx                   # force-directed cloud of all books
src/lib/
  viz-data.ts                     # pure aggregators over useLibrary + sessions + tags + connections
  viz-link.ts                     # helpers building /library?… and /weave?… deep-links
```

No new dependencies. Reuses `recharts` (already in shadcn `chart.tsx`) and `d3-force` via the existing `WebGraph.tsx` pattern. `react-virtual` not needed.

---

## 2. URL contract

```ts
// validateSearch
{ tab: "charts" | "cloud" }   // default "charts", stripped from URL
```

That's it. Filtering happens *in* Library/Weave/Notations after a click-through. Visualizations itself shows the whole library — no filter UI here. (Keeps the surface uncluttered; the chart IS the filter.)

---

## 3. Charts v1 — eight cards

Each card: title, one-line caption, body, small "drill in" hint. Every visible element click-routes to a filtered surface.

| # | Chart | Type | Click-through |
|---|---|---|---|
| 1 | **Status mix** | Donut | slice → `/library?status=<s>` |
| 2 | **Format split** | Stacked bar (by status) | segment → `/library?format=<f>&status=<s>` |
| 3 | **Finished by month** | Area, last 12mo | bar → `/library?dateFrom=YYYY-MM-01&dateTo=…` |
| 4 | **Rating histogram** | Bar 1–5 | bar → `/library?rating=<n>` |
| 5 | **Top authors** | Horizontal bar (top 10) | bar → `/library?author=<name>` |
| 6 | **Tag cloud (top 30)** | Treemap | tile → `/library?tags=<name>` |
| 7 | **Axis profile** | Radar (per-axis avg) | spoke → `/library?axis=<key>:<value>` (mode value) |
| 8 | **Pace heatmap** | Calendar heatmap (last 12mo of `reading_sessions.duration_minutes`) | cell → `/weave?month=YYYY-MM` (existing contract) |

All use forest/ink/paper tokens from `src/styles.css`. Cover-derived accent palettes (already extracted in `src/lib/palette.ts`) seed per-author / per-tag colors so the same author keeps the same hue across charts.

Empty-state per card: "Add more books / log more sessions / tag a few books to see this."

Layout: responsive 1/2/3-column grid; cards size by importance (Status + Finished are wide, others square).

---

## 4. Bookcloud sub-view

Force-directed cloud of every book in the library, rendered with the same d3-force engine as `WebGraph.tsx`.

- Each book is a node sized by total `reading_sessions.duration_minutes` (or 1 if none).
- Color by **dominant cover palette** (`book_palettes.dominant`), falls back to forest.
- Edges from `connections` table — light, low-opacity strokes; the cloud doubles as a connection map.
- Hover: popover with title + author + status + connection count.
- Click: routes to `/books/$bookId`.
- Top-right toolbar: toggle edges on/off, "freeze layout" button.
- Empty state: "Add a few books to see your cloud bloom."

Out of scope here: clustering, search-within-cloud, tag-coloring mode, time scrubber.

---

## 5. Filter passthrough — small Notations / Connections updates

Library already speaks the canonical search schema. To complete the contract:

- **Notations** (`/notations`): extend `validateSearch` to accept `tag`, `axis`, `dateFrom`, `dateTo`, `bookId` (already there), and render `<ActiveFilters>` strip from `src/components/library/ActiveFilters.tsx`. Filter logic already exists in `src/lib/notations.ts` — wire the new params into it.
- **Connections** (`/weave`): already accepts `month` and `tag`. Add `<ActiveFilters>` strip; no new params for v1 (deferred `bookId` per prior decision).

Both reuse the same chip component — no duplication.

---

## 6. Top-nav

Activate the **Visualizations** entry (currently omitted per Pass A.0 decision). Final order matches the project memory:

```
Library  Board  Connections  Notations  Visualizations  ·  Add  Search  Settings  Exit
```

Add `Cmd-K` palette entries: "Go to Visualizations", "Visualizations: Charts", "Visualizations: Bookcloud".

---

## 7. Data hooks (additive, in `src/lib/queries.ts`)

- `useFinishedByMonth()` — aggregates `user_books.finished_at` into `[{month, count}]` for last 12mo.
- `useRatingHistogram()` — `[{rating: 1..5, count}]`.
- `useTopAuthors(limit=10)` — `[{author, count}]`.
- `useTagFrequency(limit=30)` — `[{tag, count}]`.
- `useAxisAverages()` — `[{axisKey, avg}]` for numeric axes; mode for enum axes.
- `usePaceHeatmap()` — `[{date, minutes}]` from `reading_sessions`, last 365 days.

All keyed by `user_id`, cached with React Query, share the same invalidation as `useLibrary`.

---

## 8. Out of scope for Pass A
- Year-in-Review export / 9:16 image card (separate roadmap item).
- Per-chart filter UI on the Visualizations page itself (clicking a chart IS the filter).
- Time-range selector on charts (v1 hard-codes "last 12mo" or "all-time" per chart).
- Bookcloud: clustering, search, tag-color mode, time scrubber.
- Saved chart layouts.

---

## 9. Open questions

1. **Bookcloud node-size metric.** (a) Total session minutes — rewards re-reads & long books. (b) Page count — looks more uniform. (c) `1` (uniform) — cleanest visually, least informative. *Recommendation: (a), with min/max clamped so the cloud stays readable.*
2. **Empty axis profile.** Most users won't have axis values until they tag heavily. Hide the chart, show a "Add tag axes" CTA, or leave it empty? *Recommendation: hide the card entirely until ≥3 books have any axis values.*
3. **Pace heatmap click target.** Currently routes to `/weave?month=…`. Alternative: `/library?dateFrom=…&dateTo=…` (sessions-by-finish-date), or open a day-detail popover with that day's sessions. *Recommendation: keep `/weave?month=…` — matches existing contract, and finished-date filtering is already covered by chart #3.*

---

## 10. Files summary

**New (12):** `visualizations.tsx`, `VizTabs.tsx`, `ChartsBoard.tsx`, `ChartCard.tsx`, eight chart components under `charts/`, `Bookcloud.tsx`, `viz-data.ts`, `viz-link.ts`.

**Modified:** `_authenticated.tsx` (add Visualizations to nav), `CommandPalette.tsx` (entries), `notations.tsx` + `weave.tsx` (ActiveFilters strip + extended `validateSearch`), `queries.ts` (new aggregator hooks), `routeTree.gen.ts` (auto).

**Dependencies:** none new.
