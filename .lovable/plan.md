## Changes

### 1. `src/components/GeneratedCover.tsx`

Remove the "Unshelved" label div from the no-cover branch. Currently:

```tsx
<div className="text-[0.65rem] uppercase tracking-[0.2em] opacity-70">Unshelved</div>
<div>
  <div className="text-sm leading-tight font-semibold line-clamp-3">{book.title}</div>
  ...
</div>
```

After removal, the title block is the sole content; the `flex flex-col justify-between` will collapse to flex-start, which is the desired layout (title near the top, author beneath).

Adjust: change container from `justify-between` to `justify-end` so title+author sit at the bottom of the cover (current intent — title was at the bottom, "Unshelved" eyebrow at the top). Or simpler: keep `justify-between` and wrap the title block in a fragment so it stays at the bottom by being the only child… that's still top-aligned. Use `justify-end` to keep the existing visual weight.

### 2. `src/components/BookCard.tsx`

Remove the on-cover format watermark — line 87–89:

```tsx
{!book.cover_url && (
  <div className="cv-fmt"><FmtIcon format={book.format} /> {FMT_LABEL[book.format]}</div>
)}
```

Delete this block entirely. The `bc-fmt-pill` chip on line 109 (rendered below the cover, beside the title) stays.

### 3. Audit — already done

- `src/styles.css` `.cv-fmt` rules become dead CSS but are harmless; leave them (not part of the user request, and removing CSS in unrelated files risks unintended side effects).
- `src/routes/_authenticated/board.tsx` `mc-fmt` is a meta-row chip beside the title, **not** an on-cover overlay — leave untouched.
- No other components render format text inside cover bounds.

## Verify

`bun run test` — expect all 18 tests to pass.