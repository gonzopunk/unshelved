## Diagnosis

The previous `minmax(280px, 1fr)` change in `src/routes/_authenticated/board.tsx` is being overridden by later global CSS in `src/styles.css`:

```css
.bv-cols.cols-4 { grid-template-columns: repeat(4, 1fr); }
.bv-cols.cols-3 { grid-template-columns: repeat(3, 1fr); }
```

Because `src/styles.css` is loaded globally and uses more specific selectors, the browser keeps using equal fractional columns, so the board still shrinks at narrow widths.

## Plan

1. Update the board-specific injected styles in `src/routes/_authenticated/board.tsx` so they beat the global selectors:

```css
.bv-cols.cols-4 { grid-template-columns: repeat(4, minmax(280px, 1fr)); }
.bv-cols.cols-3 { grid-template-columns: repeat(3, minmax(280px, 1fr)); }
```

2. Keep the existing horizontal-scroll behavior on `.bv-cols`.

3. Verify in a narrow viewport that:
   - shelf columns keep a readable fixed minimum width,
   - the board scrolls horizontally instead of squeezing columns,
   - the global `src/styles.css` rules no longer override this route.

## Files to change

- `src/routes/_authenticated/board.tsx` only.