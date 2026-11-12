# One unified "Log a session" form

## Pre-build report (answers to your three questions)

**1. Nullability — no migration needed.**
`reading_sessions.minutes` is nullable (default 0) and `ended_at` is nullable. All position columns (`start_page/end_page`, `start_seconds/end_seconds`, `start_pct/end_pct`), `mood`, `session_note`, `location` already exist and are nullable. New backfill rows will write `minutes = null` explicitly (not 0) so "no duration" is distinguishable from "zero".

**2. Every reader of session duration, and how it handles null today**
- `lib/sessions.ts` `sessionMinutes` — null minutes + null ended_at → 0. Safe.
- `lib/sessions.ts` `computeStats` — pace loop already skips m ≤ 0 (good). **ETA is derived from pace**, so backfill-only books get no ETA → must change. `totalMinutes`/`longestMinutes` fine.
- `lib/sessions.ts` `fmtMinutes` — returns "0m" for 0 → callers must hide instead.
- `SessionRow.tsx` — audiobooks: shows "N min listened" from `end_seconds - start_seconds` (that is book time, not real time; fine). Print: `minutes ? … : "—"` and the `{minutes}m` badge is already conditional. Safe; will confirm no "0m".
- `PaceStrip.tsx` — falls back to `s.minutes ?? 0` → treats backfills as 0-minute; must filter to duration-bearing sessions only.
- `RhythmStrip.tsx` — date-based; works with backfills (verify).
- Home `index.tsx:46` — "minutes this week" sums `minutes ?? 0`. Safe; backfills simply add nothing.
- `viz-data.ts paceHeatmap` + `Charts.tsx` "Reading pace" — sums `minutes ?? 0`. Safe, but backfill days show as empty. Proposed: leave as-is (it's labelled minutes).

**3. Dependencies on the forms being deleted**
- `NewSessionCard.tsx` (Read now / Quick log / Backfill) — only used on the book Sessions tab. Its "Read now" mode hosts `SessionTimer.tsx`; the timer is kept and moved to its own card.
- `QuickLogDialog` lives inside `books.$bookId.tsx` (opened by the "Log session" button); after saving it navigates to the Sessions tab.
- Home "Log a session" (index.tsx ~161, ~368) opens a book picker then navigates to `/books/:id?tab=sessions`.
- No other imports. PostHog `track()` helper already exists in `lib/analytics.ts`.

## What will be built

**New `SessionLogDialog`** (single component, used from all three places):
1. Book row (home only): most-recently-read "reading" book preselected, "switch ▾" reveals cover row of other reading books.
2. Position (required): "Current page" or "Time elapsed" (h + m), prefilled, sublabel "from p. 110" / "from 8h 18m". Ebook note kept.
3. When: "Today ▾" → Today / Yesterday / Pick a date. Date only.
4. "More ▾" (collapsed): Duration (minutes), mood chips, "Any thoughts?", "Where?".
5. Footer: "Log session" + quiet "Reading now — start timer →" (goes to book Sessions tab with timer opened).

**Save rules**
- No change → toast "No progress to log." Position lower → offer "Correct position instead?" (updates progress only, no session).
- Session saved on chosen date; with duration, end = date + duration; without, end and minutes empty.
- Book progress only updated if date is today or new position is past the stored one.

**Entry points**: home button opens dialog directly (picker+navigate removed); book page button opens it with the book fixed; Sessions tab gets a "Log a session" button + separate "Start timer" card. Old three-mode card deleted.

**Session math**: pace only from sessions with duration; ETA from position-over-dates (pages or seconds per calendar day across recent sessions, falling back to pace-based when no date span); PaceStrip ignores duration-less sessions; no "0m" anywhere.

**Analytics**: `session_log_opened` and `session_logged` with `duration_ms`, `entry_point` (home | book | sessions_tab), `backdated`, `used_more`.

## Technical notes
- New file `src/components/sessions/SessionLogDialog.tsx`; delete `NewSessionCard.tsx` and `QuickLogDialog`; add `StartTimerCard` wrapping existing `SessionTimer`.
- "Most recently read" = max(latest session `started_at`, `user_books.updated_at`) among status=reading.
- Backdated `started_at` = local noon of chosen day (avoids timezone day-shift).
- Extend `useSaveSession` with an optional `skipSession` path for "correct position"; also invalidate home queries.
- Add unit tests for save rules (delta, regression guard, progress patch) and ETA-by-dates.
