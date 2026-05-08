## Decisions locked in

- **Sticky flag**: editing a sample never clears `is_sample`. Re-adding a book is trivial, so we don't need an "adopted" concept.
- **Settings page**: create `/settings` now as the home for the Clear button (and future preferences like yearly goal, theme, account).
- **Sample pill**: yes — visible by default. A small, low-contrast "Sample" tag on seeded book covers makes it obvious to new users that the library is a starter set, not their own data. Reinforces that "Clear sample library" is safe.

---

## Schema

Migration adds an invisible flag to four seeded tables:

- `books.is_sample boolean not null default false`
- `reference_books.is_sample boolean not null default false`
- `highlights.is_sample boolean not null default false`
- `connections.is_sample boolean not null default false`

Update `handle_new_user()` so every seeded `INSERT` sets `is_sample = true`. (Existing accounts keep `false` everywhere — they get nothing to clear, which is correct: their data is already real.)

No changes to `user_books`, `book_tags`, `book_axis_values`, `reading_sessions` — they delete-cascade off `book_id` (verify FK ON DELETE CASCADE in migration; add if missing).

---

## "Clear sample library" — Settings page

New route: `src/routes/_authenticated/settings.tsx`

Contents (v1):

- **Page title + intro line**.
- **Sample library** section
  - Description: "Your account was started with 7 books, a few quotes, and some example connections so the app feels alive on day one. Clear them whenever you're ready — your real books, notes, sessions, and tags stay."
  - Button: **Clear sample library** → confirm dialog ("Delete the 7 starter books and their notes, sessions, tags, and connections? This can't be undone.") → on confirm, deletes from `books`, `reference_books`, `highlights`, `connections` where `is_sample = true`. Cascades handle dependents.
  - Hide the whole section once `count(is_sample = true) === 0`.
- **Profile / preferences** section — placeholder card with display name + yearly goal (already on `profiles`), so the page isn't empty. Wire up later if it's not trivial.

Add **Settings** link to the nav (`src/routes/_authenticated.tsx`) — small gear icon next to the sign-out divider.

---

## Sample pill

Small badge on cover thumbnails for `is_sample` books:

- Component: tiny rounded chip, `text-[10px] uppercase tracking-widest`, semi-transparent paper background, positioned top-right of the cover.
- Surfaces in: `BookCard`, `BookSpine`, the Board view, and the book detail header.
- Reference books on the Connections graph: skip — the graph is busy enough, and references are clearly "external" already.
- Once cleared, the pill disappears with the books.

---

## Files touched

**Migration**
- `supabase/migrations/<ts>_sample_flag.sql` — add columns, rewrite `handle_new_user` to set `is_sample = true`, ensure cascade FKs.

**New**
- `src/routes/_authenticated/settings.tsx` — Settings page.
- `src/components/SampleBadge.tsx` — the cover pill.

**Edited**
- `src/routes/_authenticated.tsx` — add Settings nav link.
- `src/components/BookCard.tsx`, `src/components/BookSpine.tsx` — render `<SampleBadge />` when `is_sample`.
- `src/routes/_authenticated/books.$bookId.tsx` — show pill near title.
- `src/lib/queries.ts` — include `is_sample` in book selects (auto via `select *` if already used; otherwise add).
- `src/integrations/supabase/types.ts` — regenerated post-migration.

---

## Out of scope

- Per-item "remove this sample" affordance (bulk button is enough).
- Re-seeding samples after clearing.
- Marking the built-in `tag_axes` as sample — those are useful defaults users expect to keep.