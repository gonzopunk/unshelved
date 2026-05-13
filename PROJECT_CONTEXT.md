# Unshelved — Project Context

A working onboarding doc for future AI collaborators and human developers. Concrete, current as of Foundation Pass completion (WP1–WP4). When in doubt, prefer this file over older READMEs.

---

## 1. Vision & philosophy

**Unshelved** is a reader's commonplace tool, not a checklist tracker. It treats a personal library as two things at once:

- **A graph.** Books connect to other books, to source texts, and to highlighted passages. The Connections surface is a first-class view, not a side feature.
- **A body of marginalia.** Notes and quotes ("Notations") live alongside the books they came from and as a searchable cross-book commonplace book.

Design ethos:

- **Opinionated and palette-driven.** Every chart, card, and chip uses the cover-derived accent palette extracted at add time. No generic chart colors.
- **Click-through everything.** A chart slice, a tag chip, a connection edge — all route into a filtered Library / Notations / Connections view via a canonical URL contract.
- **Quiet, paper-feel UI.** Forest-on-paper, generous radii, no neon.
- **Single-tier, inclusive brand.** No "premium reader" framing. One product, one tone.
- **Anti-Goodreads / anti-StoryGraph positioning.** No social-by-default. No data sold to publishers. Privacy by construction (RLS-everywhere). KOReader-friendly future.
- **Mobile-first in practice.** Most users will use Unshelved on their phones — logging sessions, capturing quotes, checking their library. Desktop is primary for library management at scale and visualizations, but the app must be fully functional on mobile.

---

## 2. Target audience & use cases

Primary personas:

- **The heavy reader.** 100+ books/year, multi-format, wants a real library not a feed.
- **The data-is-beautiful reader.** Loves charts, exports, year-in-review spreads.
- **The commonplace-book keeper.** Quotes are the point; books are the index.
- **The "escape Bezos-land" reader.** KOReader / Audiobookshelf user looking for a self-determined alternative to Goodreads + Kindle.

Concrete journeys:

- Bulk-import a Goodreads or StoryGraph CSV, auto-enrich with covers, drop into Library.
- Start a reading session with the live timer; Unshelved updates progress, pace, and ETA.
- Capture a quote on a book detail page, then "Connect" it to another book or a reference text.
- Filter the Library by tag axis (e.g. `pace:5`, `mood:cozy`) from a chart click.
- Browse `/visualizations` to see the year's reading shape; click a slice to drill into the matching shelf.
- Open the Bookcloud to see the whole library as a force-directed graph colored by cover palette.

---

## 3. Current feature set

Grouped by surface. All shipped unless tagged.

- **Library (`/library`).** URL-driven multi-filter (status, format, tags, axis, rating, date range, paused, free-text). Grid + List view. Sort by added/title/author/rating/finished/progress. Shared `ActiveFilters` chip strip.
- **Board (`/board`).** Drag-and-drop kanban over `user_books.board_position` × `status`, powered by `@dnd-kit`.
- **Connections (`/weave`).** List + force-directed Web view of the `connections` table. Per-book and per-quote "Connect" affordance. Sample connections seeded on signup. *Internal route path is still `/weave` for URL stability — user-facing copy must say "Connections" / "Connect".*
- **Notations (`/notations`).** Notes + Quotes unified. Sub-views: Notes / Quotes / Commonplace. Quotes render in display italic with a terra accent bar; Notes render in plain sans. Filter by book/tag/axis/date/search; ActiveFilters chip strip. Resurfaced-quote hero. PNG export via `html-to-image`.
- **Visualizations (`/visualizations`).** Two sub-views:
  - **Charts** — 8 cards: status mix (donut), format split (stacked bar), finished-by-month (area), rating histogram (bar), top authors (h-bar), tag treemap, axis radar, pace heatmap. Every datum click-routes into `/library?…` or `/weave?…`.
  - **Bookcloud** — every book as a force-directed node sized by total session minutes, colored by cover palette, edges from `connections`. Hover popover, click to book detail.
- **Reading Sessions v2.** Live `SessionTimer`, quick log, backfill modes; tracks page/%/audio ranges, mood, location, session note. Auto-updates `user_books.progress_pct`. Surfaces: pace, ETA, streak, rhythm, mood mix.
- **Covers + palette.** Open Library + Google Books lookup at add time; dominant + secondary color extraction in `src/lib/palette.ts`; generated cover fallback (`GeneratedCover`). During bulk import, palette extraction is deferred to a post-commit background pass (`src/lib/palette-pass.ts`) to prevent browser freezing.
- **Import wizard.** Goodreads CSV, StoryGraph CSV, ISBN bulk paste. Dedupe + enrichment pipeline under `src/lib/import/`. Tracked via `import_batches`. Includes cancel button during enrichment and a separate palette-pass progress bar with Skip button after commit.
- **Tag axes.** Built-in axes (spice, pace, mood, POV, tense, content warnings, tropes, setting era, form) seeded per user; user-extensible. Free-form tags with autocomplete via `QuickTagBar`.
- **Command palette (Cmd-K).** Jump-to navigation, quick add, import, route shortcuts.
- **Regression safety (WP3).** Vitest test suite (18 tests) covering `LibrarySearch` round-trip, `viz-link` route targets, and `queries.ts` domain keys. ESLint guards for terminology and raw Tailwind color regressions.

---

## 4. Frontend architecture

- **Stack:** TanStack Start v1 (full-stack React 19 framework), Vite 7, Tailwind v4, TypeScript strict.
- **Runtime target:** Cloudflare Workers (`wrangler.jsonc`, `compatibility_date 2025-09-24`, `nodejs_compat`).
- **Routing.** File-based, in `src/routes/`. Flat dot-separated names (e.g. `_authenticated/books.$bookId.tsx`). The router lives in `src/router.tsx`; the root shell is `src/routes/__root.tsx`. `src/routeTree.gen.ts` is auto-generated by the TanStack Router Vite plugin — never edit by hand.
- **Auth gate.** All app routes live under the single `_authenticated` layout (`src/routes/_authenticated.tsx`). It checks `useAuth()` and client-redirects to `/login` if there's no session. `/`, `/login`, `/signup` are public.
- **Layout.** Floating pill nav top-center (`PillNav` inside `_authenticated.tsx`). Order: **Library / Board / Connections / Notations / Visualizations / · / Search / Add / Settings / Exit.** The "Unshelved" wordmark is the home link — there is no separate Home nav item.
- **Styling.** Tailwind v4 via native `@import` and `@theme` in `src/styles.css`. There is **no** `tailwind.config.js`. All design tokens (colors, shadows, radii) live in `src/styles.css` as CSS custom properties using `oklch`. Components use semantic Tailwind classes only (`bg-paper`, `text-ink`, `bg-forest`, `text-terra`, `shadow-paper`, `shadow-lift`) — never raw `bg-[#...]` or `text-white`.
- **Component organization:**
  - `src/components/ui/` — shadcn/ui primitives (untouched generated code).
  - `src/components/library/` — Library filters, toolbar, grid, list, ActiveFilters chip strip.
  - `src/components/notations/` — entry shells, filter bar, export card, resurfaced hero.
  - `src/components/sessions/` — timer, pace strip, rhythm strip, session row, new-session card.
  - `src/components/viz/` — `ChartCard`, `Charts.tsx` (all 8 charts in one file), `Bookcloud.tsx`.
  - `src/components/import/` — `ImportWizard` and step components.
  - Top-level: `BookCard`, `BookSpine`, `GeneratedCover`, `AddBookModal`, `AddConnectionModal`, `CommandPalette`, `WebGraph`, `Kbd`, `QuickTagBar`, `StarRating`, `SampleBadge`, `FilterChip`.

---

## 5. Backend architecture

- **Lovable Cloud (Supabase under the hood).** RLS-everywhere model: every table policy is `auth.uid() = user_id`. There is no admin path in the running app.
- **No server functions yet.** All data access today is direct from the browser via `@/integrations/supabase/client`. `createServerFn` and TanStack loaders are not currently used. The `auth-middleware.ts` and `client.server.ts` files exist (auto-provided) but are not imported anywhere.
- **No Supabase Edge Functions.** When a server-side capability is eventually needed, prefer TanStack `createServerFn` over edge functions (per template guidance).
- **Seeding.** New users are bootstrapped by the `handle_new_user` plpgsql function: it creates a `profiles` row, seeds 7 sample books with shelf state, 2 sample highlights, 6 reference books, 10 sample connections, and calls `seed_tag_axes` to insert the 9 built-in axes. The sample library is intentionally small for now; expansion to 20–30 books is planned to make features legible to new users.
- **Realtime, storage, secrets management:** none in active use.

---

## 6. Database schema overview

All tables RLS-protected with `auth.uid() = user_id` (or `= id` for `profiles`). Most have an `is_sample` flag for first-run seed data.

| Table | Purpose | Key columns |
|---|---|---|
| `profiles` | Per-user profile + yearly goal | `id` (= auth user id), `display_name`, `avatar_url`, `yearly_goal` |
| `books` | The book record itself (per-user, not shared) | `title`, `author`, `format`, `cover_color`, `cover_secondary_color`, `cover_text_color`, `bookmark_color`, `cover_url`, `cover_generic`, `import_batch_id` |
| `user_books` | Shelf state for a book | `status` (enum), `current_page`, `total_pages`, `current_seconds`, `total_seconds`, `progress_pct`, `started_at`, `finished_at`, `rating`, `paused`, `board_position`, `note` |
| `reading_sessions` | One reading session | `started_at`/`ended_at`, `start_page`/`end_page`, `start_pct`/`end_pct`, `start_seconds`/`end_seconds`, `pages_read`, `minutes`, `mood`, `location`, `session_note` |
| `notes` | Free-form notes on a book | `content`, `book_id` |
| `highlights` | Quoted passages | `quote_text`, `page_number`, `book_id` |
| `connections` | The intertextuality graph | `source_kind`/`source_id`, `target_kind`/`target_id`, `why`, `tags[]` |
| `reference_books` | External texts referenced from connections (no shelf state) | `title`, `author` |
| `tags` | Free-form tag dictionary per user | `name`, `color`, `use_count` |
| `book_tags` | Many-to-many tag ↔ book | `book_id`, `tag_id` |
| `tag_axes` | Per-user axis definitions (built-in + custom) | `key`, `label`, `kind` (`scale`/`single`/`multi`), `scale_min`/`max`, `values[]`, `open`, `position`, `built_in` |
| `book_axis_values` | Axis value(s) for a book | `axis_id`, `book_id`, `scale_value`, `values[]` |
| `import_batches` | Audit trail for CSV/ISBN imports | `source`, `row_count` |

Enums:

- `book_status`: `want | reading | later | dnf | loved | liked | meh`
- `book_format`: `print | ebook | audiobook`
- `connection_kind`: `book | reference_book | highlight` (used by `source_kind` / `target_kind`)

Notable design choices:

- `books` is **per-user**, not deduped across users. Simpler RLS, cheap dedupe inside one user via the import pipeline.
- No foreign keys to `auth.users` — user identity is referenced by `user_id` UUIDs and the application-side `profiles` table.
- Functions are `SECURITY DEFINER` with `SET search_path = public` (per Supabase guidance).

---

## 7. Authentication & user management

- **Provider:** Lovable Cloud auth — email + password and Google OAuth.
- **Hook:** `useAuth()` in `src/lib/auth.ts`. Subscribes to `supabase.auth.onAuthStateChange` and exposes `{ session, user, loading }`.
- **Gate:** `_authenticated` route layout. Loading shows a spinner; missing session triggers `navigate({ to: "/login" })` (client-side).
- **First-run seeding:** the `handle_new_user` trigger populates a sample library so the app is immediately useful (sample rows carry `is_sample = true` and can be cleared from Settings → Imports if needed).
- **No roles, no admin surface.** If roles are ever added, follow the Lovable user-roles pattern (separate `user_roles` table + `has_role` security-definer function); never store roles on `profiles`.

---

## 8. State management patterns

- **Server state: React Query, exclusively.** All hooks live in `src/lib/queries.ts`:
  - Reads: `useLibrary`, `useProfile`, `useBookDetail(bookId)`, `useAllSessions`, `useBookTagsMap`, `useBookAxisMap`, plus connection/notation reads as needed.
  - Mutations: `useUpdateStatus`, etc. — colocated with their reads, with explicit `queryClient.invalidateQueries` calls that share a key prefix with the matching read.
  - Query keys are `[domain, ...args, user?.id]`. The `user_id` suffix means logout/login automatically invalidates per-user caches.
- **URL as state for filters.** The canonical contract is `LibrarySearch` in `src/lib/library-filter.ts`: `q`, `status` (csv), `format`, `author`, `tags` (csv), `axis` (csv `key:value`), `rating`, `dateFrom`, `dateTo`, `paused`, `sort`, `dir`, `view`. The same shape (or a strict subset) is mirrored by `/notations` and `/weave` `validateSearch`. All chart click-throughs build URLs via `src/lib/viz-link.ts` against this shape.
- **Local UI state:** `useState`/`useReducer` in components. No Redux, Zustand, Jotai, or Context-based global store.
- **Forms:** `react-hook-form` + `zod` resolvers via `@hookform/resolvers`. Zod schemas colocated with the form.

---

## 9. Key UI/UX principles

- **Palette tokens (in `src/styles.css`):** `--paper`, `--ink`, `--forest`, `--mist`, `--terra`, plus shadcn-style `--background`, `--foreground`, `--primary`, `--muted`, `--accent`. Defined as `oklch`.
- **Typography:** display font for titles + Quote bodies; sans for UI + Note bodies. Notations enforce a strict visual distinction:
  - **Notes** — plain sans, no accent bar.
  - **Quotes** — display italic with a left terra accent bar.
  Enforced everywhere a Note/Quote is rendered, including export cards.
- **Surfaces.** Cards are `rounded-2xl`, `bg-card`, `shadow-paper` (resting) or `shadow-lift` (raised/floating). Pill nav is `rounded-full`, `bg-paper/80 backdrop-blur-md`, `shadow-lift`.
- **Click-through everywhere.** Charts, chips, badges, tag pills, status counters, heatmap cells, treemap tiles — all route. Never present a number that isn't a link.
- **Cmd-K palette is the keyboard surface.** Add jump-to entries for every new top-level surface or sub-view.
- **Empty states are first-class.** Every chart and view has a one-line empty message that points the user toward the action that would unblock the view.
- **Mobile usability is non-negotiable.** Touch targets must be large enough, key flows (add book, log session, capture quote) must work one-handed, and no layout should require horizontal scrolling on a standard phone viewport.

---

## 10. Third-party integrations / APIs

- **Open Library + Google Books** — cover and metadata lookup at book add and during import enrichment. See `src/lib/import/enrich.ts` and `AddBookModal`.
- **Goodreads / StoryGraph CSV parsers** — `src/lib/import/parsers.ts` (using `papaparse`).
- **`react-force-graph-2d`** — Connections Web view + Bookcloud.
- **`recharts`** — all `/visualizations` charts (donut, bar, area, treemap, radar). Used through the shadcn `chart.tsx` wrapper where applicable.
- **`html-to-image`** — Notations and (future) Year-in-Unshelved PNG exports.
- **`@dnd-kit`** — Board drag-and-drop.
- **`date-fns`** — formatting.
- **`cmdk`** — command palette.
- **`sonner`** — toasts.
- **`lucide-react`** — icons.
- **`vitest`** — test runner (dev dependency). Test suite lives in `src/lib/*.test.ts`.

No payment provider, no email provider, no AI gateway integration is wired in today (the `LOVABLE_API_KEY` secret exists but is unused).

---

## 11. Known technical debt

- **Internal `weave` identifiers.** The Connections feature is still named `weave` in code (`/weave` route, `src/lib/weave.ts`, `WebGraph.tsx`, search-param helpers). Renaming would invalidate stable URLs people may have bookmarked. **User-facing copy must say "Connections" / "Connect" — code identifiers may stay.** When eventually renamed, keep `/weave` as a redirect for at least one release.
- **No server functions.** All Supabase access is browser-side. This is fine for the current data model but will need to change for: webhooks, KOSync, anything calling third-party APIs with secrets, and any future AI features.
- **Loaders are unused.** Routes don't use TanStack Start loaders. When server fns arrive, follow the `_authenticated` loader pattern.
- **`Charts.tsx` is one big file.** Eight chart components consolidated for shipping speed. Split per-chart when interactivity (tooltips, in-card drilldowns) grows.
- **Sample data lives in plpgsql.** `handle_new_user` is non-trivial to evolve — schema changes that touch sample columns must update the function in the same migration.
- **Tag normalization is loose.** Free-form tags are lowercase-compared at query time but not deduped server-side; relies on autocomplete to keep things tidy. Centralization of normalization logic is planned (WP5).
- **ESLint terminology rule is noisy.** The `no-restricted-syntax` JSXText rule (WP3) fires on all JSX text nodes, not just forbidden strings. Produces lint noise but no false enforcement. Fix is deferred to a later pass.
- **Palette Web Worker deferred.** The post-commit palette pass (`palette-pass.ts`) runs on the main thread. A browser Web Worker implementation using `OffscreenCanvas` would remove the last main-thread palette work but is low priority given that the pass runs after books are already visible in the library.
- **Mobile layout not audited.** The app has not been systematically tested or optimized for mobile viewports. This is a near-term priority.

---

## 12. Current bugs / pain points

- Long book titles overflow on small-format covers and in graph nodes. Truncation and/or responsive sizing needed.
- Card height in Library list view is taller than necessary. A size control or layout tightening is planned.

Things that **look like bugs but aren't:**

- Axis radar chart auto-hides until at least 3 books have axis values. Intentional — empty radars look broken.
- Pace heatmap cells link to `/weave?month=YYYY-MM` rather than a date-range Library filter. Intentional.
- The Connections route is `/weave` even though the nav says "Connections". Intentional — see technical debt above.
- Books show default teal palette accent briefly after a large import before the palette pass completes. Intentional — covers warm up live as the background pass runs.

When real bugs surface, append a dated bullet under this section in the same file.

---

## 13. Coding conventions & patterns

- **TypeScript strict.** Every import must resolve — create files before importing them, install packages before importing them.
- **Imports use the `@/` alias** (configured in `tsconfig.json` / `vite-tsconfig-paths`).
- **Route files** use flat dot-separated names. No Next/Remix-style nested layout folders inside `src/routes/`.
- **Never edit:** `src/integrations/supabase/client.ts`, `src/integrations/supabase/types.ts`, `.env`, `src/routeTree.gen.ts`, project-level keys in `supabase/config.toml`.
- **No raw color classes.** Use design tokens. If you need a new color, add a token in `src/styles.css` first.
- **User-facing copy.** Never say "Weave" or "Margins" in UI strings, button labels, tooltips, command palette entries, or error messages. Say **Connections / Connect** and **Notations / Notes / Quotes**.
- **Filter contract.** Any new filter belongs in `LibrarySearch` (`src/lib/library-filter.ts`) first; `ActiveFilters` and `viz-link.ts` extend from there. Don't fork a new filter shape per surface.
- **Charts.** New charts go in `src/components/viz/Charts.tsx`. Aggregators go in `src/lib/viz-data.ts` as **pure functions** over `useLibrary` + `useAllSessions` + `useBookTagsMap` + `useBookAxisMap`. Don't add new query hooks for chart data.
- **shadcn/ui.** Customize via variants (CVA), don't hand-roll new primitives unless none of the existing ones fit.
- **Mutations.** Always invalidate the matching read query keys (`["library"]`, `["book", id]`, etc.); don't rely on refetch intervals.
- **Tests.** Run `bun run test` before marking any change done. New pure functions in `src/lib/` should have corresponding tests in `src/lib/*.test.ts`.

---

## 14. Important reusable components & helpers

Components:

- `BookCard`, `BookSpine`, `GeneratedCover` — book rendering primitives.
- `ChartCard`, `ChartEmpty`, `DrillLink` (in `src/components/viz/ChartCard.tsx`) — wrap every chart for consistent framing + click-through.
- `ActiveFilters` (in `src/components/library/ActiveFilters.tsx`) — chip strip used by Library, Notations, and (planned) Connections.
- `LibraryFilters`, `LibraryToolbar`, `LibraryGrid`, `LibraryList` — Library surface building blocks.
- `WebGraph` — generic force-directed graph wrapper used by Connections.
- `Bookcloud` — book-as-graph viz on `/visualizations`.
- `CommandPalette`, `Kbd` — keyboard surface.
- `EntryShell`, `NoteEntry`, `QuoteEntry`, `FilterBar`, `ExportCard`, `ResurfacedHero` — Notations.
- `SessionTimer`, `PaceStrip`, `RhythmStrip`, `SessionRow`, `NewSessionCard` — Sessions v2.
- `QuickTagBar`, `StarRating`, `FilterChip`, `SampleBadge`.

Helpers (`src/lib/`):

- `auth.ts` — `useAuth()`.
- `queries.ts` — every React Query hook + mutation.
- `library-filter.ts` — `LibrarySearch` ↔ `LibraryFilters` serialization, `filterLibrary`, `sortLibrary`, `STATUS_LABELS`, `FORMAT_LABELS`.
- `viz-data.ts` — pure aggregators for charts.
- `viz-link.ts` — `libraryLink` / `weaveLink` for click-throughs.
- `palette.ts` — cover palette extraction (main-thread, used for single-book adds).
- `palette-pass.ts` — post-commit background palette pass for bulk imports. Chunks by batchId, invalidates `["library"]` and `["book", id]` per chunk.
- `notations.ts` — note/quote shaping + filtering.
- `weave.ts` — connection helpers (note: file is named for the legacy term).
- `sessions.ts` — pace/ETA/streak math.
- `tagging.ts` — tag autocomplete + use-count bumps.
- `import/` — `parsers.ts`, `dedupe.ts`, `enrich.ts`, `commit.ts`, `types.ts`.
- `notations-keyboard.ts` — Notations keybindings.
- `error-capture.ts`, `error-page.ts` — error surface.

---

## 15. Deployment setup

- **Runtime:** Cloudflare Workers, configured in `wrangler.jsonc` (`compatibility_date 2025-09-24`, `nodejs_compat`). Entry: `src/server.ts`.
- **Build:** `vite build` (production) and `vite build --mode development` (preview/dev build). Lovable's harness runs builds automatically — never run them manually from the agent loop.
- **Preview URL:** `https://id-preview--2bbed697-cc3e-4194-8fb6-1d80c30510bf.lovable.app`
- **Published URL:** `https://unshelved.lovable.app`
- **Custom domain:** none.
- **Stable URLs for any future webhooks/cron:** `project--2bbed697-cc3e-4194-8fb6-1d80c30510bf.lovable.app` (prod) and `project--2bbed697-cc3e-4194-8fb6-1d80c30510bf-dev.lovable.app` (preview).

---

## 16. Environment variables & services

Auto-managed `.env` (never edit by hand):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

Server-side secrets in Lovable Cloud (available to server fns / server routes when added):

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` *(bypasses RLS — only for trusted server code)*
- `SUPABASE_DB_URL`
- `LOVABLE_API_KEY` *(for the Lovable AI gateway — currently unused)*

Code reads `import.meta.env.VITE_*` in the browser. `process.env.*` is only valid inside server fns / server routes — never at module scope in shared files.

---

## 17. Roadmap

### Foundation Pass — Complete

- **WP1** ✓ Quick convention fixes (terminology, token violations)
- **WP2** ✓ Empty states and first-use clarity
- **WP3** ✓ Minimal regression safety (Vitest suite, ESLint terminology + color guards)
- **WP4** ✓ Import/palette performance (deferred palette pass, cancel/progress UI)

### Polish & Stability (near-term, any order)

- **WP5** — Tag normalization: centralize normalization logic, migrate call sites, add tests. *Lightweight review before build.*
- **UI polish pass** — Title overflow on covers and graph nodes, card sizing in Library list view, general visual refinements. *Build direct, tightly scoped list.*
- **Mobile compatibility audit + fixes** — Systematic review of all surfaces on mobile viewports; fix touch targets, layout issues, and key flows. *Treat as an ongoing parallel track, not a one-time pass.*

### Near-Term Features (roughly prioritized)

1. **Feedback / beta testing mechanism** — Lightweight in-app feedback modal before sharing widely with beta testers.
2. **Sample library expansion** — Grow seed data to 20–30 books with richer connections, quotes, and varied metadata so features are legible to new users. Bundle with sample-clarity improvements (clear labeling, easy clear-samples action).
3. **Book reviews** — Private long-form review field on book detail page, distinct from notes. No sharing yet.
4. **Half-star ratings** — Quick win; extend the rating scale.
5. **Ratings scatterplot** — User-selectable X/Y axes (rating × pages, rating × pace axis, rating × date finished, etc.). New chart card in Visualizations. Fits the product perfectly.
6. **Voice entry for notes/quotes** — Browser `SpeechRecognition` API; no server needed. Reduces friction for capturing thoughts while reading.

### Medium-Term

- **Minimal onboarding** — Simple intro screen or banner explaining the app's values and sample library. *Do after mobile audit is solid and feature set is more stable.*
- **Connections graph improvements** — Filtering by node type, focus/neighborhood mode (expand one book's connections), visual distinction between books / quotes / references.
- **Library/Board consolidation** — Merge into one tab with multiple view modes. Prerequisite for the shelf/stacks view.
- **Comparative rating slider** — Rate relative to similar books (same author, series, genre, or connection). Plan carefully before building.
- **Shelf/stacks view** — Carousel shelf + physical "stacks" columns (currently reading, to read, etc.) with drag-and-drop. After Library/Board consolidation.
- **Photo OCR for quote capture** — Take a photo of a page; app extracts the text. Requires server-side OCR API.

### Later / Planned

- **Full onboarding flow** — Guided introduction teaching the app's values and graph concept. Do when feature set is stable.
- **Review sharing / publishing** — Opt-in public or link-shareable reviews. After private reviews are stable.
- **Year in Unshelved editorial export** — Magazine-spread PNG/PDF, 9:16 image card.
- **Tier maker / rankable lists.**
- **Series & author intelligence.**
- **KOReader sync** — Requires server-side infrastructure (createServerFn, secrets, webhook endpoint).
- **Smart recommendations** — From axes, tags, and Connections graph. Requires server-side AI gateway.
- **Web Worker for palette** (WP4b) — Move post-commit palette pass off the main thread using `OffscreenCanvas`. Low priority given current architecture.

### Explicitly Not Now

- `/weave` rename (URL stability; defer with redirect plan)
- Server-side architecture (until KOSync / AI / email forces it)
- Native mobile app (after web is solid)
- Social feed, follower counts, public activity
- Gamification (badges, streaks as pressure, leaderboards)

---

## 18. Non-goals & avoided patterns

- **No "Weave" or "Margins" in user-facing copy.** Connections / Notations only.
- **No social-by-default features.** Sharing is opt-in, link-based, and never auto-publishes.
- **No Supabase Edge Functions.** Use TanStack `createServerFn` / server routes when server-side logic is needed.
- **No raw Tailwind color utilities** (`bg-white`, `text-black`, `bg-[#...]`). Tokens only.
- **No nested layout folders** inside `src/routes/`. Use the flat dot-separated convention.
- **No client-side admin Supabase access.** `client.server.ts` must never be imported from anything that ships to the browser.
- **No filter UI inside Visualizations.** The chart **is** the filter — clicking routes into the matching surface.
- **No foreign keys to `auth.users`.** Reference user identity via `profiles` and `user_id` columns.
- **No client-stored role checks.**
- **No payment, email, or AI gateway code paths** until a feature explicitly needs them.
- **No gamified copy, badges, XP, or streak pressure.**

---

## 19. Architectural concerns for future developers

- **RLS is the only authorization layer.** Every new table needs `user_id` + a `(auth.uid() = user_id)` policy on day one. If a feature ever needs cross-user reads, design it through a security-definer function or an authenticated server fn — don't loosen RLS.
- **The filter contract is load-bearing.** `LibrarySearch` is the URL contract that Library, Notations, Connections, ActiveFilters, and `viz-link.ts` all depend on. Adding a filter means touching all five places consistently.
- **Sample data is brittle.** `handle_new_user` is one big plpgsql function. Any schema change that affects seeded columns must update the function in the same migration; otherwise new signups fail silently.
- **`Charts.tsx` will outgrow one file.** Split per chart once interactivity (in-card filters, tooltips with click targets) lands.
- **Connections graph performance.** `react-force-graph-2d` is comfortable to ~500 nodes. Plan clustering, level-of-detail, or canvas optimizations before opening Bookcloud to libraries that size or larger.
- **All data fetching is browser-side today.** Migrating any read path to a server fn requires: introducing the `_authenticated` loader pattern, gating with `requireSupabaseAuth`, and not breaking the current React Query cache shape — keep query keys identical when both paths coexist.
- **Internal `weave` naming.** When eventually renaming, keep `/weave` mounted as a redirect to `/connections` for at least one release; user bookmarks and shared chart click-through URLs depend on it.
- **Mobile-first going forward.** Any new component or surface should be designed and tested on a mobile viewport before being considered done.

---

## 20. AI development workflow

This project uses a three-layer development process:

- **Lovable** — builds features and implements work packages.
- **Claude Chat** (this context) — technical red-team reviewer and strategic advisor. Reviews Lovable plans before build for high-risk changes; approves or requests revisions; writes precise Build-mode prompts.
- **Review tiers:**
  - *Build direct* — UI/UX changes, copy, single-surface features with no shared infrastructure impact.
  - *Lightweight review* — changes touching shared infrastructure (filter contract, queries, import pipeline, schema). Paste plan; get quick verdict.
  - *Full review* — new architectural patterns, first use of a new capability, anything touching auth/RLS/schema in a novel way.

The GitHub repository is public at `https://github.com/gonzopunk/unshelved`. Claude accesses files via blob URLs provided in chat (format: `https://github.com/gonzopunk/unshelved/blob/main/PATH`).

---

*Last updated: Foundation Pass complete (WP1–WP4 shipped). Next: WP5 tag normalization, UI polish pass, mobile audit.*
