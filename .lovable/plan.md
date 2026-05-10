
## Goal

Create a single `PROJECT_CONTEXT.md` at the repo root: a concrete onboarding doc for future AI collaborators and human devs. No code changes, no schema changes — pure documentation drawn from the current codebase, `.lovable/plan.md`, `.lovable/roadmap.md`, project memory, and the Supabase schema.

## Source material I'll synthesize from

- Project memory (`mem://index.md`) — current nav, terminology rules, Round 3 status.
- `.lovable/roadmap.md` — shipped features + 10-item future roadmap.
- `.lovable/plan.md` — Round 3 / Pass A spec just shipped.
- `package.json` — actual dependency stack (TanStack Start v1, React 19, Tailwind v4, recharts, react-force-graph-2d, dnd-kit, @supabase/supabase-js, html-to-image, papaparse, zod, etc.).
- `src/routes/_authenticated/*` + `src/router.tsx` — route map.
- `src/lib/queries.ts`, `src/lib/library-filter.ts`, `src/lib/viz-data.ts`, `src/lib/notations.ts`, `src/lib/weave.ts`, `src/lib/palette.ts` — state + business logic patterns.
- Supabase schema in context — tables, RLS, `handle_new_user` seeding.
- `src/styles.css`, `src/components/library/ActiveFilters.tsx`, `ChartCard.tsx` — design tokens + reusable primitives.

## Structure of the document

Single Markdown file, ~600–900 lines, with these sections in order:

1. **Vision & philosophy** — "Unshelved": a reader's commonplace tool that treats books as a graph (Connections) and a body of marginalia (Notations), not a checklist. Anti-Goodreads/StoryGraph framing: opinionated, palette-driven, never social-by-default. Inclusive single-tier brand.
2. **Target audience & use cases** — heavy readers, the "data is beautiful" crowd, commonplace-book keepers, escape-Bezos-land KOReader users. Concrete user journeys (log a session, capture a quote, link two books, browse a tag, share a Year-in-Review).
3. **Current feature set** — grouped: Library/Board, Reading Sessions v2, Covers + palette extraction, Connections (formerly Weave), Notations (formerly Margins; Notes/Quotes/Commonplace sub-views), Visualizations (Charts + Bookcloud), Import wizard (Goodreads/StoryGraph CSV + ISBN), Tag axes, Command Palette.
4. **Frontend architecture** — TanStack Start v1 + React 19 + Vite 7 on Cloudflare Workers. File-based routing under `src/routes/_authenticated/*` behind a single auth gate. Router in `src/router.tsx`; root in `__root.tsx`. Tailwind v4 via `src/styles.css` (no `tailwind.config.js`). shadcn/ui in `src/components/ui/`. Feature components grouped by domain (`library/`, `notations/`, `viz/`, `sessions/`, `import/`).
5. **Backend architecture** — Lovable Cloud (Supabase) with RLS-everywhere. No edge functions yet. Browser client only (`@/integrations/supabase/client`); no server functions in use today. Seed data + tag-axis seeding via `handle_new_user` SQL function. Note future server-fn migration paths.
6. **Database schema overview** — table-by-table summary (purpose, key columns, RLS = `auth.uid() = user_id`): `profiles`, `books`, `user_books`, `reading_sessions`, `notes`, `highlights`, `connections`, `reference_books`, `tags`, `book_tags`, `tag_axes`, `book_axis_values`, `import_batches`. Enums: `book_status` (want/reading/later/dnf/loved/liked/meh), `book_format` (print/ebook/audiobook), `connection_kind`. Sample-data flag (`is_sample`) on most tables.
7. **Auth & user management** — Email + Google via Lovable Cloud auth. `useAuth()` hook in `src/lib/auth.ts`. Single `_authenticated` layout with client-side redirect to `/login`. Profile auto-created + sample library seeded on first signup.
8. **State management** — React Query everywhere (`useLibrary`, `useProfile`, `useBookDetail`, `useAllSessions`, `useBookTagsMap`, `useBookAxisMap`). Mutation hooks colocated in `queries.ts`. URL-as-state for filters (canonical `LibrarySearch` contract in `library-filter.ts`, mirrored by Notations and Connections). No global store.
9. **Key UI/UX principles** — paper-and-ink palette (forest, paper, ink, mist, terra) defined as design tokens in `src/styles.css` (oklch). Display vs sans typography distinction (Notations: italic display for Quotes, plain sans for Notes — terra bar on Quotes). Pill nav floating top-center. Round 2xl cards w/ `shadow-paper`/`shadow-lift`. Click-through-everything: every chart, chip, badge routes into a filtered surface. Cmd-K everywhere.
10. **Third-party integrations** — Open Library + Google Books cover/metadata lookup (`AddBookModal`, `src/lib/import/enrich.ts`). Goodreads/StoryGraph CSV parsers (`src/lib/import/parsers.ts`). `html-to-image` for export cards. `react-force-graph-2d` for Connections web + Bookcloud. `recharts` for charts. No payment, email, or AI gateway integration today.
11. **Known technical debt** — (a) Internal code still uses `weave` identifiers though user-facing copy says "Connect/Connections"; (b) `routes/_authenticated/weave.tsx` route still mounted at `/weave` for URL-stable deep-links; (c) all data fetching is browser-side via the Supabase JS client — no `createServerFn` usage; loaders are unused; (d) `Charts.tsx` consolidates 8 charts into one file (intentional for now, may split when chart count grows); (e) `routeTree.gen.ts` is regenerated and should never be edited by hand; (f) sample data lives in `handle_new_user` plpgsql — non-trivial to evolve.
12. **Current bugs / pain points** — none tracked at the moment; document the empty list and how to add to it. Note: axis radar auto-hides until ≥3 books have axis values (intentional, not a bug). Pace heatmap → `/weave?month=…` is a chosen contract (also not a bug).
13. **Coding conventions** — TypeScript strict; imports via `@/` alias; route files use flat dot-separated naming under `src/routes/`; never edit `client.ts`, `types.ts`, `.env`, `routeTree.gen.ts`, `supabase/config.toml` project-level keys; never use raw color classes in components (use design tokens); user-facing copy MUST say Connections/Notations not Weave/Margins.
14. **Reusable components & helpers worth knowing** — `BookCard`, `BookSpine`, `GeneratedCover`, `ChartCard` + `ChartEmpty` + `DrillLink`, `ActiveFilters`, `LibraryFilters`/`LibraryToolbar`, `WebGraph`, `Bookcloud`, `CommandPalette`, `Kbd`, `EntryShell` (Notations), `ExportCard`, `SessionTimer`/`PaceStrip`/`RhythmStrip`, `QuickTagBar`. Helpers: `library-filter.ts`, `viz-data.ts`, `viz-link.ts`, `palette.ts`, `notations.ts`, `weave.ts`.
15. **Deployment setup** — Cloudflare Workers via `wrangler.jsonc` (`compatibility_date 2025-09-24`, `nodejs_compat`). Vite build pipeline. Preview URL `id-preview--<lovable-id>.lovable.app`; published at `unshelved.lovable.app`. No custom domain.
16. **Environment variables / services** — Auto-managed `.env`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`. Server secrets in Lovable Cloud: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`, `LOVABLE_API_KEY`. Note none are read by code yet (no server fns).
17. **Roadmap** — Pull from `.lovable/roadmap.md`: shipped (identity, Notations, Sessions v2, partial covers, Connections, Library, Visualizations) + next-up ordered list (Covers finished, Rich metadata import deepening, Tagging system, Notations deepened/global commonplace, KOSync, Editorial Year-in-Unshelved, Tier maker, Series & author intel, Smart recs, Buddy reads). Parked items (public Connections, AI suggestions, Audible/Kindle, mobile app).
18. **Non-goals / avoided patterns** — No "Weave" / "Margins" in user copy. No social-first features in v1. No Supabase Edge Functions (use TanStack server fns when needed). No raw Tailwind color classes. No Next/Remix-style nested layout folders inside `src/routes/`. No client-side admin Supabase access. No filter UI inside Visualizations (the chart IS the filter). No `auth.users` foreign keys — use `profiles`. No client-stored role checks (none exist anyway).
19. **Architectural concerns for future devs** — (a) RLS is the only authorization layer; if a future feature ever needs cross-user reads, plan for security-definer functions or admin server fns. (b) All filter contracts live in `library-filter.ts`; extending filters means updating Library + ActiveFilters + any chart that links in via `viz-link.ts`. (c) Sample data via plpgsql is brittle — consider moving to a dedicated seed function. (d) `Charts.tsx` as one file: split per-chart when adding interactivity. (e) Cover palette extraction is sync on add — may need a queue at scale. (f) Connections graph performance: `react-force-graph-2d` is fine to ~500 nodes; plan for clustering if libraries grow.

## Deliverable

One file: `PROJECT_CONTEXT.md` at the project root. Pure Markdown, no frontmatter, internal links to actual file paths so future tools can grep it.

No code, no schema, no nav, no terminology changes — only documentation.
