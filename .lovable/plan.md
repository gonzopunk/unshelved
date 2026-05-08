
# Reading Sessions v2

A serious upgrade to the per-book Sessions tab and the data behind it — turning today's bare "log pages + minutes" form into a real reading-tracker that captures *how* a session felt and *what it implies* about the book and the reader.

---

## Goals

1. **Capture sessions effortlessly** — live timer for "I'm reading right now", quick-log for "I just finished a chunk", backfill for "I forgot to log yesterday".
2. **Auto-update book progress** — every session moves the book's current page / location / runtime forward without a second form.
3. **Capture the *feeling* of a session** — a separate "session notes" field for in-the-moment reactions ("dragged today", "couldn't put it down"), kept distinct from the long-form Margins notes.
4. **Surface what sessions reveal** — pace, completion estimate, streaks, time-of-day patterns, per-book momentum.

---

## 1. Logging a session — three entry modes

All three live in a redesigned **NewSession** card on the book detail page. Format-aware: audiobook = minutes/seconds, print = pages, ebook = pages or %.

### a. Live timer ("Read now")
- Big start button → timer counts up (`mm:ss`), persists across reloads via `localStorage` keyed to `book_id`.
- Pause / resume.
- Stop → opens the **Save session** sheet pre-filled with the elapsed time.
- A subtle floating "still reading…" pill on every page while a timer is active, so the user can return.

### b. Quick log ("Just finished a stretch")
- Inline form: pages (or %), minutes, optional session note.
- One-tap "+10 / +25 / +50 pages" chips for fast entry.

### c. Backfill ("Log a past session")
- Date picker (defaults to today) + start time + duration + pages.
- Uses the shadcn Datepicker pattern.

All three share the same **save** action and the same fields underneath.

---

## 2. Session fields

Every saved session captures:

| Field | Notes |
|---|---|
| `started_at`, `ended_at` | timestamps; ended derived if user enters duration only |
| `minutes` | total read time |
| `pages_read` | print/ebook |
| `start_page`, `end_page` | optional; if both set, `pages_read` derived |
| `start_pct`, `end_pct` | ebook % alternative |
| `seconds_listened`, `start_seconds`, `end_seconds` | audiobook |
| `mood` | enum chips: `flowing`, `steady`, `slogging`, `couldn't stop`, `tired`, `distracted` |
| `session_note` | free text — separate from Margins notes; never appears in the Margins tab |
| `location` | optional text ("train", "porch", "bed") |

### Auto-update of book progress
On save, if `end_page` / `end_pct` / `end_seconds` is set, the linked `user_books` row is patched with the new `current_page` / `progress_pct` / `current_seconds`. If only `pages_read` is given, we increment from the previous `current_page`. (Stub the "linked external sources" path with a TODO comment for the future Open-Reader Sync feature.)

If the new position equals total, prompt: "Mark as finished?" with the same Loved/Liked/Meh chooser used elsewhere.

---

## 3. Session notes vs Margins notes

- **Session note** lives on the session row, surfaces only in the Sessions tab and in session detail.
- **Margins note** is the existing `notes` table — long-form, surfaces in Margins, eligible for Weave.
- The session-note field has a placeholder that signals tone: *"How did this stretch feel? (felt tired today, but it pulled me in…)"*
- A small "Promote to Margins note" affordance on each session note, for when something offhand turns out to be worth keeping.

---

## 4. Analytics surfaced on the book page

A new **Pace strip** above the Sessions list:

- **Current pace** — pages/hour or %/hour, last 5 sessions, EWMA-weighted.
- **Completion estimate** — "≈ 4h 20m left · finish around May 14" using current pace + remaining pages.
- **Sessions logged** — total + this week.
- **Longest stretch** — biggest single session.
- **Momentum chart** — sparkline of session pages over time (uses the book's cover palette via `useLibraryPalette`).

A new **Reading rhythm** mini-section:
- Time-of-day histogram (morning / afternoon / evening / night) for this book.
- Mood distribution as colored dots.

---

## 5. Cross-book / global surfaces (light pass)

Add a **Sessions** card to the home dashboard:
- Current streak (consecutive days with ≥1 session).
- This-week minutes vs last week.
- Top 3 books by minutes this week.

(Full stats dashboard remains a separate roadmap item — this is just a teaser tile.)

---

## 6. Data model changes

Migration to `reading_sessions`:
- add `ended_at timestamptz`
- add `start_page int`, `end_page int`
- add `start_pct numeric`, `end_pct numeric`
- add `start_seconds int`, `end_seconds int`
- add `mood text` (free text, validated client-side against the chip list)
- add `session_note text`
- add `location text`
- add index on `(user_id, started_at desc)` for streak/rhythm queries
- keep `pages_read` and `minutes` for backwards compatibility

Existing rows continue to work; new fields are nullable.

No new tables. RLS already correct (`auth.uid() = user_id`).

---

## 7. Files touched

**New**
- `src/components/sessions/SessionTimer.tsx` — live timer + persistence.
- `src/components/sessions/NewSessionCard.tsx` — three-mode entry (Now / Quick / Backfill).
- `src/components/sessions/SessionRow.tsx` — richer row (mood dot, note preview, expand).
- `src/components/sessions/PaceStrip.tsx` — pace + ETA + sparkline.
- `src/components/sessions/RhythmStrip.tsx` — time-of-day + mood mix.
- `src/lib/sessions.ts` — `useSessions`, `useSessionStats`, `useSaveSession`, pace/ETA math.

**Edited**
- `src/routes/_authenticated/books.$bookId.tsx` — replace `NewSession` + sessions list with new components; mount Pace + Rhythm strips above the list.
- `src/routes/_authenticated/index.tsx` — add Sessions teaser card (streak + week minutes).
- `src/integrations/supabase/types.ts` — regenerated after migration.

**Migration**
- `supabase/migrations/<ts>_sessions_v2.sql` — column adds + index.

---

## 8. Build order

1. Migration + types.
2. `sessions.ts` hooks + math (pace EWMA, ETA, streak).
3. `NewSessionCard` with the three modes; auto-update of `user_books`.
4. `SessionRow` + session note + promote-to-Margins.
5. `PaceStrip` + `RhythmStrip` on the book page.
6. Home-page sessions teaser.
7. Update `.lovable/roadmap.md`: move Reading Sessions to Shipped (v2) line; renumber.

---

## 9. Out of scope (intentionally)

- Real KOReader / Audiobookshelf sync — that's the Open-Reader Sync roadmap item; we just make the schema ready.
- Full year-end stats dashboard — separate roadmap item.
- Social/shared session feeds.
- Goal-setting (daily minutes target) — easy follow-up, not in this pass.

---

## Open questions

- Mood chip list: keep the six above, or let it be free-form like tags?
- Do you want the live timer's "still reading…" pill global (every page) or only on the book page?
- Promote-to-Margins: copy or move the text?
