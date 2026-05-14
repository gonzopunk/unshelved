## Change

In `src/routes/_authenticated/index.tsx` line 67, raise the "Up next" cap from 5 to 20:

```ts
const upNext = library.filter((b) => b.user_books[0]?.status === "want").slice(0, 20);
```

20 is a sensible upper bound — the horizontal scroll row handles overflow gracefully, and 20 small covers render without any perf concern. No other changes; the markup, styles, and "+ ADD" slot all already work for any count.

## Verify

`bun run test` — expect all 18 tests to still pass.