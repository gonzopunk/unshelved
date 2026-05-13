# Unshelved — AI Change Checklist

Use this before asking Lovable or Codex to make or review code changes.

This file answers: **what must this change preserve?**

For product direction, use `PRODUCT_PRINCIPLES.md`.  

For current architecture, use `PROJECT_CONTEXT.md`.

---

## 1. Product fit

Before coding, confirm:

- [ ] The change deepens Connections, Notations, sessions, tags, axes, imports, or library navigation.

- [ ] The change does not add a feed, follower system, push notification, badge, XP, leaderboard, or streak nag.

- [ ] Any new stat, chart, chip, count, or badge links to a meaningful filtered view.

- [ ] A heavy reader with 500+ books would plausibly benefit.

If not, narrow the feature or defer it.

---

## 2. URL and filter contract

- [ ] New filters extend `LibrarySearch` in `src/lib/library-filter.ts`.

- [ ] Do not create a separate filter shape for one surface.

- [ ] Visible view state belongs in the URL when it affects what the user is seeing.

- [ ] New click-throughs use canonical helpers such as `viz-link.ts`; do not hand-roll query strings.

- [ ] `ActiveFilters` reflects the active filters.

This is load-bearing. Treat `LibrarySearch` as the app’s shared filter grammar.

---

## 3. Privacy, RLS, and user ownership

For database changes:

- [ ] Every new user-owned table has `user_id`.

- [ ] RLS is enabled immediately.

- [ ] Policies are scoped to `auth.uid() = user_id`.

- [ ] App writes set `user_id` explicitly.

- [ ] No cross-user reads or writes are introduced casually.

- [ ] No foreign keys directly to `auth.users`; use `profiles` or domain tables.

- [ ] Roles, if ever needed, use a separate `user_roles` table plus a security-definer helper.

Privacy is not a later polish step.

---

## 4. Browser vs server-side boundary

Keep in browser:

- ordinary user reads/writes against RLS-protected tables

- local UI state

- pure visualizations over already-fetched user data

Move server-side before building:

- secrets

- third-party API keys

- webhooks

- email

- AI gateway calls

- sync endpoints

- background jobs

- cross-user aggregation

- service-role Supabase access

Rules:

- [ ] Use TanStack `createServerFn` when server-side capability is needed.

- [ ] Do not import `client.server.ts` into browser code.

- [ ] Do not read `process.env.*` in browser/shared modules.

- [ ] Do not bolt server architecture on after the feature is already built.

---

## 5. Styling and terminology

Styling:

- [ ] Use semantic tokens from `src/styles.css`.

- [ ] No raw Tailwind colors like `text-white`, `bg-black`, or hex classes.

- [ ] New colors become `oklch` design tokens.

- [ ] Cards, shadows, spacing, and radii match the quiet paper-feel UI.

- [ ] Charts and chips respect cover-derived palette logic where relevant.

Terminology:

- [ ] User-facing copy says **Connections / Connect**, never “Weave.”

- [ ] User-facing copy says **Notations / Notes / Quotes**, never “Margins.”

- [ ] The data tab is **Visualizations**, not generic “Stats.”

- [ ] Notes render as plain sans.

- [ ] Quotes render as display italic with terra left bar.

- [ ] No gamified copy.

---

## 6. React Query and data flow

- [ ] Reads use existing hooks where possible.

- [ ] New user data hooks belong in `src/lib/queries.ts` or a clearly justified sibling.

- [ ] Query keys include the user identity where appropriate.

- [ ] Mutations invalidate affected reads.

- [ ] Do not duplicate existing query logic.

- [ ] Do not add polling/refetch intervals as a substitute for proper invalidation.

- [ ] Optimistic updates include rollback on error when user-visible state changes immediately.

Common affected keys include:

- `["library"]`

- `["book", id]`

- `["book-tags-map"]`

- `["book-axis-map"]`

- `["profile"]`

- sessions

- notes

- highlights

- connections

---

## 7. Migrations and sample data

For schema changes:

- [ ] Use proper Supabase migrations.

- [ ] Existing rows remain valid through defaults or nullable columns.

- [ ] New-user sample seeding still works.

- [ ] `handle_new_user` is updated when seeded columns/tables change.

- [ ] Seeded rows preserve `is_sample` where relevant.

- [ ] Do not write against `auth`, `storage`, `realtime`, `vault`, or Supabase internal schemas.

- [ ] Time-dependent validation uses triggers, not invalid `CHECK` constraints.

If a schema change affects onboarding, say so explicitly.

---

## 8. Performance and scale

Check whether the change still works with:

- 100 books

- 500 books

- 1,000+ books

- thousands of notes or highlights

Guardrails:

- [ ] Avoid N+1 fetches.

- [ ] Batch with `.in(...)` or existing joined select shapes.

- [ ] Beware Supabase’s default 1,000-row limit.

- [ ] Heavy visualization aggregation should be pure functions over cached data when possible.

- [ ] Graphs and charts need graceful degradation: top-N, clustering, pagination, virtualization, or scoped views.

- [ ] Cover palette extraction should not block large imports.

---

## 9. Files not to edit manually

Do not edit:

- `src/integrations/supabase/client.ts`

- `src/integrations/supabase/types.ts`

- `src/routeTree.gen.ts`

- `.env`

- project-level keys in `supabase/config.toml`

If a tool modifies one of these, stop and review why.

---

## 10. Manual verification

Before calling a change done:

- [ ] Build/harness output is clean.

- [ ] Browser console has no new relevant errors.

- [ ] Network tab shows no new failed Supabase requests or unexpected 401s.

- [ ] Empty, populated, and filtered states were checked.

- [ ] New click-throughs land on the correct URL.

- [ ] `ActiveFilters` shows the expected filters.

- [ ] Cmd-K includes new top-level surfaces or sub-views.

- [ ] If auth/RLS/schema changed, test a fresh user signup.

- [ ] If terminology changed, grep for user-visible “Weave” or “Margins.”

---

## Codex review prompt

Use this after Lovable proposes or implements a meaningful change:

```text

Review this Unshelved change against PROJECT_CONTEXT.md, PRODUCT_PRINCIPLES.md, and AI_CHANGE_CHECKLIST.md.

Do not rewrite the feature.

Flag only actionable issues:

1. Product-principle violations

2. URL/filter contract problems

3. RLS/privacy/security issues

4. Browser/server boundary mistakes

5. Styling/token violations

6. Terminology leaks

7. React Query invalidation problems

8. Migration/sample-data risks

9. Performance risks for large libraries

10. Simpler alternatives

End with one recommendation:

- approve

- approve with changes

- reject and redesign
```

## 11. WP3 Regression checks

### Automated (run before marking any change done)

- [ ] `bun run test` passes with no failures.

- [ ] `bun run lint` passes with no new errors.

### Manual visual check — Notations rendering distinction

Open the Notations page and the Book detail page and confirm:

- Quotes render in display italic with a left terra-colored accent bar.
  Expected classes include font-display (or equivalent display token)
  and italic and a left border using text-terra or border-terra.

- Notes render in plain sans-serif with no accent bar.

If either distinction is missing, do not approve the build.

### Terminology spot-check

- Temporarily type the word "Margins" into a JSX component and confirm
  ESLint flags it. Then revert.

- Grep user-facing strings for "Weave" (capital W as a noun), "Unweave",
  and "Margins". None should appear in button labels, headings, tooltips,
  or nav items.

## 12. WP4 Import/palette checks

### Automated
- [ ] bun run test passes with no failures.
- [ ] bun run lint passes with no new errors.

### Manual — small import (under 20 books)
- [ ] Upload a trimmed Goodreads CSV (under 20 rows).
- [ ] Enrichment phase completes; Cancel button is visible 
      and functional during enrichment.
- [ ] Commit completes; all books appear in Library with 
      default palette colors immediately.
- [ ] Palette pass progress bar appears; cover accent colors 
      update live in Library as the pass runs.
- [ ] After pass completes, all books show extracted palette 
      colors (not the default teal #1F5266).
- [ ] Settings → Imports shows the batch with correct count.
- [ ] Undo Import removes all books from Library and 
      import_batches. No books remain regardless of whether 
      the palette pass had completed before undo.

### Manual — large import (100+ books)
- [ ] Upload a full Goodreads export (100+ rows).
- [ ] During enrichment: page remains responsive. 
      Scrolling and filtering work without freezing.
- [ ] Cancel during enrichment stops within ~1 second.
- [ ] Commit completes without UI freeze.
- [ ] Palette pass runs after commit; navigating to Library 
      mid-pass shows books populating with colors live.
- [ ] Navigating away from the wizard mid-pass does not 
      freeze the app and does not cancel the pass.
- [ ] Undo Import after a completed palette pass removes 
      all N books cleanly.

### Cover safety checks
- [ ] Books with no cover_url show GeneratedCover 
      (typographic fallback) at all times, before and 
      after the palette pass.
- [ ] Books with a cover_url but a failed palette 
      extraction show the photo cover with default 
      accent colors (not a broken state).
- [ ] cover_secondary_color is null for books where 
      palette extraction failed or was skipped; confirm 
      no chart or card component crashes on null 
      secondary color.
