# Weave — Intertextuality Feature

A way to connect books and quotes/notes across your library, including lightweight references to books you don't own. "Weave" is the feature name; the graph view is called **Web**.

## Naming in the UI

- Top nav item: **Weave**
- View toggles: **List** | **Web**
- Verbs: "Weave this into…", "Woven with *The Odyssey*"
- Empty state: "Nothing woven yet. Connect a book or a quote to start your web."
- Per-card affordance on quotes/notes: small "Weave" link

## Data model (migration)

Two new tables, both RLS-scoped to `auth.uid() = user_id`.

**`reference_books`** — minimal stubs for books you don't own
- `id`, `user_id`, `title`, `author` (nullable), `created_at`

**`connections`** — the weave itself
- `id`, `user_id`, `created_at`
- `source_kind` ('book' | 'reference_book' | 'highlight' | 'note')
- `source_id` (uuid)
- `target_kind` (same enum)
- `target_id` (uuid)
- `why` (text, nullable) — short reason for the link
- `tags` (text[], default '{}')
- Indexes on `(user_id, source_id)` and `(user_id, target_id)`

Update `handle_new_user()` to seed:
- ~6 reference books (Homer's *The Odyssey*, Thoreau's *Walden*, Lewis's *The Magician's Nephew*, Steinbeck's *East of Eden*, Weir's *The Martian*, one more)
- ~10 sample connections weaving through the existing 7 seeded books, including one anchored to the existing Overstory highlight tagged to *Pachinko*

## UI surfaces

### 1. Per-book "Weave" tab on book detail page
Adds a third tab next to existing Margins/Sessions. Lists every connection touching the book or its quotes/notes, grouped by the other endpoint. Each row shows: target title, optional "why", tags, and the anchoring quote/note if any.

### 2. Add Connection modal (`AddConnectionModal`)
- Source defaults to current context (book or selected quote/note)
- Target: searchable picker spanning library books + reference books, with inline "+ Add reference book" if no match
- Optional "why" textarea
- Optional tags
- Save creates a `connections` row

### 3. Quote/note cards in Margins
Small "Weave" affordance on each card, plus a chip showing existing connections.

### 4. Global `/weave` route (new)
Top-nav entry. Two view toggles:

- **List view** (default): chronological feed of all connections, filterable by book, tag, and kind. Each item is a `ConnectionCard` with both endpoints linked to their book detail pages.
- **Web view**: force-directed graph using `react-force-graph-2d`. Nodes = books (owned and reference, styled differently) + optionally quotes. Edges = connections. Click a node to focus and reveal its connections in a side panel. Loaded via dynamic import inside a `<ClientOnly>` guard so SSR doesn't choke.

Both views ship together. Empty/sparse libraries still feel alive thanks to the seeded sample connections.

## Wiring

New query hooks in `src/lib/queries.ts`:
- `useConnections(bookId)` — for the per-book tab
- `useAllConnections()` — for `/weave`
- `useReferenceBooks()` — for the picker
- `useCreateConnection`, `useDeleteConnection`, `useCreateReferenceBook` — mutations

New components:
- `src/components/AddConnectionModal.tsx`
- `src/components/ConnectionCard.tsx`
- `src/components/WebGraph.tsx` (client-only)

New route file:
- `src/routes/_authenticated/weave.tsx`

Nav: add "Weave" link to the authenticated layout's top nav.

## Explicitly NOT in this plan

- No bookcloud (revisit later)
- No public/shared connections
- No AI-suggested connections
- No edits to existing Margins/Sessions structure beyond adding the third tab and the small per-card "Weave" affordance
- No two-tier brand framing

## Technical notes

- `react-force-graph-2d` is canvas-based, mobile-friendly, and SSR-safe via dynamic import + `<ClientOnly>`.
- Reference books live in their own table to avoid cluttering shelves/board/progress queries — they only appear in Weave surfaces and the connection picker.
- Polymorphic FK is enforced by app code, not DB constraints (kind+id columns), to keep the model flexible.
