## Pass B (Build 2): Notations — Export, Resurface, Keyboard, Print

Build 2 layers four polish features onto the simplified Build 1 stream. No schema changes, no new routes, no new top-nav surface. Everything ships into the existing `/notations` page and entry components.

### 1. Card export (Quote / Note share cards)

A new "Export as card" hover action on every entry, alongside Copy / Book / Connect.

- New component `src/components/notations/ExportCard.tsx`
  - Off-screen render at fixed dimensions, **two ratio options**:
    - **Square** 1080×1080 (default — safe everywhere).
    - **Portrait** 1080×1350 (4:5, IG-optimal).
  - Renders a `<QuoteCard>` or `<NoteCard>` variant based on `entry.kind`, preserving the non-negotiable visual rules: Quotes get the terra left bar + `font-display italic` body in curly quotes; Notes get plain sans body, no bar.
  - Layout: generous padding (~80px), book cover swatch (using `cover_color` / `cover_secondary_color`) as a small chip top-left, body centered with auto-shrinking type scale (3 tiers: 56 / 44 / 32px) based on character count, footer line in mono with title · author · page (quotes) or date (notes), tiny "unshelved" wordmark bottom-right.
- Generation: `html-to-image` (`toPng`). Add the dep if not present. One util `exportEntryCard(entry, ratio)` that mounts the off-screen node into a portal, awaits fonts, snapshots, downloads as `unshelved-{kind}-{shortId}.png`, and unmounts.
- Hover action: a `<Download>` icon button in `Meta` opens a tiny popover with two choices — **Square** / **Portrait (4:5)** — then triggers export. Toast "Card saved" on success.

### 2. Resurfaced entry hero

A small "Today's resurfaced notation" strip at the top of `/notations`, above the kind/sort segmented controls.

- Deterministic daily pick: hash `YYYY-MM-DD + user.id` → index into the **full unfiltered** entries set (does not respect active filters — it's a serendipity surface).
- Avoid back-to-back repeats: track last pick id in `localStorage`; if the day's pick matches yesterday's, advance index by 1.
- Renders a compact `EntryShell` inside a `<section>` with a hairline top/bottom rule and a mono eyebrow "Today · resurfaced". Includes a small "Shuffle" button (rerolls in-memory only).
- Hidden when entries.length === 0.

### 3. Keyboard navigation

Stream-only, scoped to `/notations`.

- `j` / `k`: move selection down / up across the visible filtered list. Selected entry gets a subtle `ring-1 ring-terra/40` and scrolls into view (`block: "nearest"`).
- `o`: open the selected entry's book (`/books/$bookId`).
- `c`: copy the selected entry's body.
- `e`: export selected entry as card (uses the default ratio = square).
- `?`: toast a one-line cheatsheet.
- Implementation: `useKeyboardNav(entries)` hook in `src/lib/notations-keyboard.ts` using a single `keydown` listener; ignored when focus is in `input`, `textarea`, or `[contenteditable]`. Cleans up on unmount.

### 4. Print stylesheet

A clean printable view of the **currently filtered + sorted** stream — this is the "print/export" home for what used to be Scroll mode.

- New "Print" button in the toolbar row (next to the segmented controls), icon `Printer`. Calls `window.print()`.
- Scoped `@media print` block in `src/styles.css`, gated by a `data-print-root` attribute on the notations page wrapper to avoid leaking print rules to other routes:
  - Hide nav, filter bar, segmented controls, hover actions, hero strip, footer.
  - Show a print-only header: "Notations — {date} — {N} entries — {active filters summary}".
  - Single column, `max-width: 6in`, increased leading; quotes keep `font-display italic`.
  - `page-break-inside: avoid` on each `<article>`.
  - Terra bar prints as a 4pt left border (color printers keep terra; mono printers degrade to black).
  - URLs hidden; book title + author printed inline.

### Out of scope (still deferred)
- Stable per-entry URLs (`/notations/entry/$kind/$id`).
- Multi-card batch export / PDF compilation.
- Weekly resurfaced-quote email (roadmap item, not Notations build).
- Editing entries inline.
- "Connect" action wiring (still toasts coming-soon).

### Files

**New**
- `src/components/notations/ExportCard.tsx` — off-screen card renderer + `exportEntryCard()` util + ratio popover.
- `src/components/notations/ResurfacedHero.tsx` — daily pick strip.
- `src/lib/notations-keyboard.ts` — `useKeyboardNav()` hook.

**Modified**
- `src/components/notations/NoteEntry.tsx` — add Export action to `Meta`; accept `selected` prop for keyboard ring.
- `src/components/notations/QuoteEntry.tsx` — accept `selected` prop.
- `src/components/notations/EntryShell.tsx` — pass through `selected`.
- `src/routes/_authenticated/notations.tsx` — mount `ResurfacedHero`, wire `useKeyboardNav`, add Print button, manage `selectedIndex`, wrap page with `data-print-root`.
- `src/styles.css` — `@media print` block scoped under `[data-print-root]`.

### Dependencies
- `html-to-image` (~12kB gz). Added if not already installed.
