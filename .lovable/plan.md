## Quick "Log session" button on the book detail page

Add a prominent **Log session** action to the book header that opens a tiny dialog for a one-field session entry. Bypass the full session card for the common case: "I just stopped reading — record where I am."

### Placement
In `src/routes/_authenticated/books.$bookId.tsx`, in the action row that currently holds the Shelf select, Pause, Edit, and Delete buttons. Insert a new **primary-colored pill button** ("Log session", BookOpen icon) as the first item so it's visually dominant.

### Dialog UX
- shadcn `Dialog` (already in the project).
- Title: **Log a session**.
- One format-aware numeric input, pre-filled with the current position:
  - **Print** → label "Current page", default `userBook.current_page ?? 0`
  - **Ebook** → label "Current location", default `userBook.current_page ?? 0`
  - **Audiobook** → label "Minutes listened", default empty (delta, not position)
- Sub-label below input showing the starting reference (e.g. "from p. 142" or "current: 38 min in") for context.
- **Save** button (primary). Disabled while empty/invalid or mutation pending.
- Quiet footer link: **Full session details →** — closes the dialog and calls `navigate({ search: { tab: "sessions" } })`. The existing tab `defaultValue={tab}` already honors this.

### Save behavior
On Save, mirror the math `NewSessionCard` already uses so totals and pace stay consistent:

- **Print / Ebook** (new page entered):
  - `read = max(0, newPage - (userBook.current_page ?? 0))`
  - If `read <= 0`, toast "No progress to log" and bail.
  - Insert `reading_sessions` row: `book_id`, `user_id`, `started_at = now()`, `ended_at = null`, `start_page`, `end_page = newPage`, `pages_read = read`.
  - Patch `user_books`: `current_page = newPage`, and if `total_pages > 0`, `progress_pct = min(100, round(newPage/total_pages * 100))`.
- **Audiobook** (minutes entered):
  - `sec = minutes * 60`; if `sec <= 0`, bail.
  - `startSec = userBook.current_seconds ?? 0`; `endSec = startSec + sec`.
  - Insert row: `started_at = now()`, `ended_at = now() + minutes*60s`, `minutes`, `start_seconds`, `end_seconds`.
  - Patch `user_books`: `current_seconds = endSec`, and if `total_seconds > 0`, `progress_pct = min(100, round(endSec/total_seconds * 100))`.

Use the existing `useSaveSession` mutation from `src/lib/sessions.ts` — it already inserts the session row and patches `user_books` atomically and invalidates the right query keys (`["book", bookId]`, `["library"]`, sessions). No new mutation needed.

On success: toast "Session logged", close the dialog, reset the input. If the new position reaches/exceeds the total, also show the existing "You finished the book — mark the shelf?" nudge so behavior matches the full card.

### Scope of changes
**One file edited:** `src/routes/_authenticated/books.$bookId.tsx`
- Add `BookOpen` icon import, `Dialog`/`DialogContent`/`DialogHeader`/`DialogTitle`/`DialogFooter` imports, `useSaveSession` import.
- Local `QuickLogDialog` component defined in the same file (kept small and co-located, matching the existing `NewNote` / `NewQuote` / `RatingNote` pattern in this file).
- New `quickLogOpen` state on `BookDetail`; render the trigger button and the dialog.
- Footer link uses the existing `navigate` from `useNavigate()` already in the file.

No schema changes, no new files, no edits to `NewSessionCard` or `useSaveSession`.
