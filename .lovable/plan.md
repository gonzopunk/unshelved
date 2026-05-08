## Goal

Make the Connections graph more useful and inviting without adding pressure or clutter. Three first-batch improvements you already greenlit, plus one tiny resurfaced-quote tweak.

## What we'll build

### 1. Click a node → open that book

In the Web view, clicking a dot navigates to that book's page (or to a stub view for reference books). Hover already shows the title; click should follow through.

- Wire `onNodeClick` in `weave.tsx` to `router.navigate({ to: "/books/$bookId", params: { bookId: id } })` for owned books.
- Reference-book nodes: for now, no nav (cursor stays default). A dedicated reference page is a later, separate task.
- Cursor turns to pointer on hover over book nodes.

### 2. Shift-drag to create a connection

Hold Shift, drag from one book node to another, release → opens the existing AddConnectionModal pre-filled with both endpoints. No right-click (right-click is reserved by browsers and unreliable on trackpads).

- Use the `react-force-graph-2d` `onNodeDrag` / `onNodeDragEnd` events with a Shift-key check.
- During the drag, draw a temporary line from the source node to the cursor.
- On release over another node, open `AddConnectionModal` with `source` and `target` pre-set.
- A small hint chip under the legend: "Hold Shift + drag between books to connect them."

### 3. Edge weight by connection count

When two books have multiple connections (e.g. three quotes from book A all link to book B), bundle them into a single thicker, slightly darker line. Hover shows the count; clicking opens a side panel listing those connections.

- Group `links` in `weave.tsx` by an unordered `{a,b}` key, store `count`.
- Pass `count` into `WebGraph`; `linkWidth = 1 + Math.log2(count) * 1.4`, `linkColor` opacity `0.25 + Math.min(count - 1, 4) * 0.1`.
- Tooltip via `linkLabel`: `"3 connections"`.
- (Optional, same PR if simple) Click a bundled edge → router navigate to `/connections?between=A,B` filter; otherwise defer.

### 4. Tiny: connections on resurfaced quote cards

On the home page's resurfaced-quote card, show a subtle line of related connections under the quote: "Connected to: *Book Title*, *Book Title*". Each is a link to that book. Pure display tweak using `useAllConnections()` filtered by `source_id/target_id === highlight.id`.

## Explicitly NOT in this batch

- **Tag-colored edges as a global legend** — confirmed too noisy with freeform tags.
- **Built-in axis filter chips with color-coded options** — captured for the *next* batch alongside scale/filtering work; needs its own design pass on which axes to surface and how chips compose.
- **Mini-webs / focused subgraphs** — defer until library size makes it pay off.
- **Suggested connections** — rejected (would dilute the meaning of a connection).
- **Reading-stats overlay** — rejected (clutter).
- **Export card** — parked.

## Files touched

- `src/routes/_authenticated/weave.tsx` — bundle links, wire click + shift-drag, hint text.
- `src/components/WebGraph.tsx` — accept `count` per link, render width/opacity/label, expose drag callbacks, pointer cursor.
- `src/routes/_authenticated/index.tsx` — add "Connected to:" line under the resurfaced quote.
- (No DB changes.)

## Open question

For #3, when the user clicks a bundled edge with N connections, do you want:
- (a) a small popover listing them inline on the graph, or
- (b) navigate to the list view filtered to those two books?

I'll default to (b) unless you say otherwise — it reuses existing UI and keeps the graph clean.