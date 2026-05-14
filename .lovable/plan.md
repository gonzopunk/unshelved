## Goal

Make the home-page size slider feel continuous and fluid — both the slider input itself (no `step={4}`) and the visible scaling of book cards (typography + cover proportions scale with the slider value, not just the grid column count).

## Scope

Only `src/routes/_authenticated/index.tsx`. No changes to `BookCard.tsx` or `src/styles.css`. Style overrides scoped to `.reading-grid` go in the existing `<HomepageStyles />` block.

## Changes

### 1. Slider input — true continuous

Line 223 of `src/routes/_authenticated/index.tsx`:

```tsx
step={1}
```

(was `step={4}`). Min/max stay at `MIN_COL` (180) and `MAX_COL` (520).

### 2. Drive a CSS custom property on the grid container

Line 239–242 — set `--card-size` inline alongside the existing `gridTemplateColumns`:

```tsx
<div
  className="reading-grid"
  style={{
    ["--card-size" as string]: `${readingSize}px`,
    gridTemplateColumns: `repeat(auto-fill, minmax(min(100%, ${readingSize}px), 1fr))`,
  }}
>
```

### 3. Scale BookCard internals fluidly via scoped overrides

Append to the existing `<HomepageStyles />` template a `.reading-grid`-scoped block that ties cover padding, title sizes, and gaps to `--card-size`. This way, even when `auto-fill` snaps column count, each card's interior scales smoothly with the slider:

```css
.reading-grid {
  --card-size: 220px;
  transition: none;
}
.reading-grid .bc-card {
  padding: clamp(14px, calc(var(--card-size) * 0.09), 28px);
  border-radius: clamp(14px, calc(var(--card-size) * 0.09), 26px);
}
.reading-grid .bc-cover {
  padding: clamp(10px, calc(var(--card-size) * 0.07), 22px);
}
.reading-grid .bc-cover .cv-title {
  font-size: clamp(14px, calc(var(--card-size) * 0.108), 34px);
}
.reading-grid .bc-cover .cv-author {
  font-size: clamp(8px, calc(var(--card-size) * 0.042), 13px);
}
.reading-grid .bc-title-text {
  font-size: clamp(14px, calc(var(--card-size) * 0.092), 28px);
}
.reading-grid .bc-author {
  font-size: clamp(11px, calc(var(--card-size) * 0.052), 16px);
}
.reading-grid .bc-cover-wrap {
  margin-bottom: clamp(10px, calc(var(--card-size) * 0.07), 22px);
}
```

`clamp(min, fluid, max)` keeps everything within sensible bounds while making the middle term respond linearly to the slider. Drag = smooth scale.

### Notes

- No transition timing on the cards — the value changes per drag tick, which already produces smooth perceived motion.
- `BookCard.tsx` and global `.bc-*` rules in `src/styles.css` stay untouched; the scoped `.reading-grid .bc-*` selectors win because of specificity (`.reading-grid` adds one class).
- Other places that render `BookCard` (e.g. Library) are unaffected.

## Verify

`bun run test` — expect all 18 tests to pass.