## Problem

Board columns currently use `minmax(220px, 1fr)` (4-up Shelves, 3-up Rated) inside a horizontally-scrollable grid. 220px is still too tight — card titles wrap aggressively and the columns feel cramped at typical viewport widths.

## Fix

Bump the per-column floor to a more readable size in `src/routes/_authenticated/board.tsx` (BoardStyles block, lines 425–426):

```text
.cols-4 { grid-template-columns: repeat(4, minmax(280px, 1fr)); }
.cols-3 { grid-template-columns: repeat(3, minmax(280px, 1fr)); }
```

That's the only change. Existing horizontal-scroll wrapper (`.bv-cols { overflow-x: auto }`) already handles the case where 4×280px exceeds the viewport — narrow screens will scroll horizontally instead of squeezing columns to unreadable widths.

## Why 280px

- 220px → titles wrap to 3+ lines, rating/meta row gets tight.
- 280px → comfortable for a 2-line title plus author and meta on one row.
- 4×280 + 3×16 gap = ~1168px, which fits at the user's current 1181px viewport without scroll; below that, the section scrolls horizontally.

## Open question

If you'd prefer a different floor (e.g. 260px to keep 4-up fitting at slightly narrower widths, or 300px for extra breathing room), say the number and I'll use it instead.

## Scope

One file, two lines. No other styles, logic, breakpoints, or files touched.