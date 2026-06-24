## Bug
`/visualizations` crashes on the published site with:

```
TypeError: Cannot read properties of undefined (reading 'count')
  at ratingHistogram (src/lib/viz-data.ts)
  at useMemo in RatingHistogram (src/components/viz/Charts.tsx)
```

Repro confirmed against `unshelved.lovable.app/visualizations` with the user's session — the crashing frame is `out[r - 1].count++`.

## Cause
`ratingHistogram` assumes integer ratings 1–5:

```ts
const out = [1,2,3,4,5].map(r => ({ rating: r, count: 0 }));
for (const b of library) {
  const r = b.user_books[0]?.rating;
  if (r && r >= 1 && r <= 5) out[r - 1].count++;  // ← out[3.5] is undefined
}
```

The schema permits fractional ratings (the user has at least one half-star, e.g. `4.5`). `out[4.5 - 1]` → `out[3.5]` → `undefined`, then `.count++` throws. Preview just happens to be running on data with no half-stars.

## Fix
One-line change in `src/lib/viz-data.ts`, plus a defensive guard so any future non-integer / out-of-range value can't take the page down again.

```ts
export function ratingHistogram(library: BookWithShelf[]): { rating: number; count: number }[] {
  const out = [1, 2, 3, 4, 5].map((rating) => ({ rating, count: 0 }));
  for (const b of library) {
    const raw = b.user_books[0]?.rating;
    if (raw == null) continue;
    const r = Math.round(raw);              // 4.5 → 5, 1.5 → 2
    if (r >= 1 && r <= 5) out[r - 1].count++;
  }
  return out;
}
```

Rounding (vs. flooring) keeps half-stars in the bucket users perceive them as. The bin labels stay 1–5 stars, matching the existing X-axis tick formatter.

## Scope
- Edit only `src/lib/viz-data.ts` (`ratingHistogram`).
- No UI / chart / route changes.
- No migration — historical fractional ratings remain valid; only the chart aggregator changes.

## Verification
- `bun run test` — existing 18 tests still pass.
- Re-load `/visualizations` on the published site; the Charts tab renders all 8 cards, Ratings histogram includes half-star books in the rounded bucket.
