## Problem

At tablet widths (md breakpoint ≤ ~1024px), the desktop pill nav's content (logo + 5 labeled items + Search + Add button + Settings + Sign out) exceeds the available viewport width. The last change added `overflow-x-auto`, which technically prevents page overflow but leaves a visible horizontal scrollbar under the pill — not acceptable.

The mobile nav (icon-only) only kicks in below `md` (< 768px), so the 768–1024px range is the painful band.

## Recommended fix

Introduce a third tier: **icon-only desktop nav at tablet widths**, full labeled nav at larger desktop widths. Keep mobile nav unchanged.

Breakpoints:
- `< md` (< 768px): existing mobile nav (unchanged)
- `md` to `< lg` (768–1023px): desktop pill, **icons only** for the 5 main nav items (Library, Board, Connections, Notations, Visualizations). Logo, divider, Search, Add, Settings, Sign out remain as-is.
- `lg+` (≥ 1024px): existing desktop pill with icon + label

Implementation in `src/routes/_authenticated.tsx`:
- `NavItem` gains a label that's hidden at `md` and shown at `lg+` — wrap the label text in a `<span className="hidden lg:inline">`. Keep `aria-label` on the `<Link>` so the icon-only state stays accessible.
- Remove the `overflow-x-auto` and `max-w-[calc(100vw-2rem)]` band-aids; the nav will fit naturally at every width.
- Restore the outer wrapper to `fixed top-5 left-1/2 -translate-x-1/2 z-40` and the inner nav to its previous `w-max mx-auto` shape (no max-width needed now that content fits).

## Alternatives considered (not recommended)

1. **Shrink padding/gap only** — buys ~50px, not enough to fit 5 labels + Add button at 768px.
2. **Collapse some items into a "More" dropdown at tablet** — adds a click to reach core nav; worse than icon-only.
3. **Scale text down at tablet** — looks awkward and still tight.

## Verification

- 768px (current viewport): nav fits centered, no scrollbar, 5 icons visible with tooltips via `aria-label`.
- ~900px: same icon-only state.
- 1024px+: full labels return.
- < 768px: unchanged mobile nav.