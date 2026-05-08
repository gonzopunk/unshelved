# Plan: Rename to Unshelved + add a Margins tab

Two scoped changes. No two-tier brand framing, no taglines that exclude casual readers.

## 1. Rename app to Unshelved

Replace every user-facing "Margins" string with "Unshelved". Internal CSS class names and code identifiers (e.g. `.margins-app`, the `margins/` CSS section header) stay as-is — they're not user-visible.

Files touched:
- `src/routes/_authenticated.tsx` — top-nav wordmark
- `src/routes/login.tsx` — `<head>` title, hero wordmark, footer link copy
- `src/routes/signup.tsx` — `<head>` title, hero wordmark, welcome toast
- `src/routes/_authenticated/index.tsx` — `<head>` title, footer tagline
- `src/routes/_authenticated/board.tsx` — `<head>` title
- `src/components/GeneratedCover.tsx` — small "Margins" label printed on generated book covers → change to "Unshelved"
- `src/components/AddBookModal.tsx` — same small label inside the live cover preview → "Unshelved"

Tagline rewrite (used on login/signup hero + index footer): replace "a quiet place for readers" / any "for people who write in their books" copy with something inclusive of casual + annotating readers. Working draft (open to edits): **"Unshelved — track what you read, however you read."** Footer micro-copy: "a quiet place for readers."

No domain/route changes. Published URL is already `unshelved.lovable.app`.

## 2. Add a Margins tab (inside book detail, not as a separate brand)

The book detail page already has tabs: Notes / Quotes / Sessions. Combine Notes + Quotes into a single **Margins** tab so the feature has a name without forcing it on the whole product. Sessions stays separate.

Inside the Margins tab:
- Two segmented sub-tabs at the top: **Notes** and **Quotes** (default Notes). Reuses the existing `NewNote` / `NewQuote` forms and existing list rendering — zero schema change.
- Tab label changes from "Notes" + "Quotes" → "Margins" + "Sessions".
- Empty-state copy for the Margins tab: "Notes, quotes, anything worth keeping. Or leave it blank — not every book needs ink."  ← signals optional, no guilt for casual readers.

File touched:
- `src/routes/_authenticated/books.$bookId.tsx` — restructure the `<Tabs>` block only. No new components, no new tables.

## 3. Explicitly NOT in this plan

- No new top-level `/margins` route (cross-book commonplace book) — defer to a follow-up once we've watched how people use the in-book tab.
- No serif font swap or "ruled-paper" Margins-only surface treatment.
- No new homepage hero copy beyond the single inclusive tagline above.
- No schema migrations.

## Acceptance

- Every visible "Margins" string is now "Unshelved" except the in-book tab label.
- Book detail page shows tabs: **Margins | Sessions**, with Notes/Quotes as sub-tabs inside Margins.
- Login, signup, nav, generated covers, browser tab titles all read Unshelved.
- Casual readers visiting the app see no copy implying they should be annotating.

## One open question before I implement

Tagline. Pick one (or write your own):
1. "Track what you read, however you read."
2. "For the books you've taken off the shelf."
3. "A home for everything you're reading."
4. Keep current "a quiet place for readers" as the only tagline and skip a marketing line entirely.
