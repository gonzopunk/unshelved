# Unshelved — Product Principles

A short, directive companion to `PROJECT_CONTEXT.md`. When the two disagree about *what to build*, this file wins. When they disagree about *how the code works today*, `PROJECT_CONTEXT.md` wins.

---

## Thesis

**Unshelved is a private, opinionated commonplace tool for serious readers — a library you can think with, not a feed you perform on.**

---

## Core design principles

1. **Books are a graph and a body of marginalia, not a checklist.** Every feature should make the Connections graph or the Notations corpus richer, more navigable, or more beautiful.
2. **Click-through everything.** Any number, chip, slice, edge, or badge must route into a filtered Library / Notations / Connections view. Never render a stat that isn't a link.
3. **One filter contract.** All filtering flows through `LibrarySearch` (`src/lib/library-filter.ts`). New filters extend it; surfaces don't fork their own shape.
4. **Palette-driven, paper-feel.** Cover-derived colors drive accents. Forest-on-paper, generous radii, no neon, no generic chart palettes. Use design tokens — never raw color classes.
5. **Quiet typography with one strict distinction.** Notes are plain sans. Quotes are display italic with a left terra accent bar. Enforce this everywhere a Note or Quote renders, including exports.
6. **URL is the source of truth for views.** Filters, sort, sub-views — all live in the URL so every state is shareable, bookmarkable, and back-button-safe.
7. **Privacy by construction.** RLS on every table; `auth.uid() = user_id`. No cross-user reads in the app today. Don't introduce them lightly.
8. **Single-tier, inclusive brand.** No "premium reader" framing, no power-user vs casual split. One product, one tone.
9. **Empty states are first-class.** Every chart and view ships with a one-line empty message that points to the unblocking action.
10. **Keyboard-first where it matters.** Cmd-K is the jump surface. Add an entry for every new top-level surface or sub-view.

---

## What Unshelved is *not*

- **Not Goodreads.** Not a social feed. Not a place to perform reading.
- **Not StoryGraph.** Not a recommender's product; the user's taste is private signal, not a training set.
- **Not Kindle / Audible.** Not a store. Not a DRM ecosystem.
- **Not a habit tracker.** Streaks exist as a quiet stat, not as a guilt mechanic.
- **Not a checklist.** Finishing a book is not the unit of value; the trace it leaves (sessions, notes, quotes, connections) is.
- **Not "AI-first".** AI may eventually assist (suggesting connections, surfacing forgotten quotes), never lead.

---

## How to evaluate a new feature

Ask, in order:

1. **Does it deepen the graph or the marginalia?** (Connections, Notations, sessions, tags, axes, covers/palette.) If yes, default to building.
2. **Does it make existing data more navigable?** (New click-through, new filter, new sort, new chart that drills in.) If yes, build.
3. **Does it require server-side capability we don't have?** (Webhooks, third-party API with secrets, KOSync, AI gateway.) Then plan a TanStack `createServerFn` path *before* the feature, not bolted on after.
4. **Does it introduce a social, recommendation, notification, or gamification surface?** Apply the rules below before scoping.
5. **Could it be a chart click instead of a new screen?** Prefer the chart click.
6. **Would a heavy reader (100+ books/year, multi-format) actually use this weekly?** If no, defer.

If a feature doesn't clear (1) or (2), it's probably a distraction.

---

## Rules: social, recommendations, notifications, gamification

### Social
- **Default off, default private.** Nothing the user creates is public unless they explicitly export or share.
- **Sharing is artifacts, not feeds.** A shareable Year-in-Unshelved card, a tier list image, a public link to a single shelf — yes. A timeline of friends' activity — no.
- **No follow graph in v1.** "Buddy reads" is the only sanctioned soft-social surface, and only after Library, Notations, and Connections are dense.
- **No engagement metrics surfaced to users** (likes, view counts, follower counts). They corrupt the product.

### Recommendations
- **From the user's own data first.** Series next-up, author backlist, tag/axis-similar, Connections-adjacent — these are fair game.
- **No third-party "you might like" feeds.** No publisher promotions. No paid placement. Ever.
- **Explainable.** Any recommendation must show *why* (which tags, which connections, which axis). No black-box scores.
- **Opt-in, never autoplaying.** Recs live on a surface the user navigates to, not in their face on load.

### Notifications
- **No push notifications in v1.** No browser notifications, no mobile push.
- **Email is rare and editorial.** Resurfaced-quote weekly digest, Year-in-Unshelved spread — yes. "You haven't read in 3 days" — never.
- **In-app surfacing is quiet.** Resurfaced quotes appear on the Notations hero, not as a badge on the nav.

### Gamification
- **Streaks and stats are descriptive, not prescriptive.** Show pace, ETA, streak — never nag, never punish a broken streak.
- **No badges, no levels, no XP, no leaderboards.** Ever.
- **Yearly goal is a soft target.** A line on a chart, not a progress-bar guilt machine.

---

## Tone

- **Quiet, literate, slightly bookish.** Closer to a Penguin Classics colophon than a SaaS dashboard.
- **Direct over cute.** "Connect this quote to another book" beats "✨ Weave some magic ✨".
- **Specific over generic.** "47 quotes from 12 books, mostly Le Guin and Calvino" beats "You have a lot of quotes!".
- **Never gamified copy.** No "Great job!", no "🔥 5-day streak!", no exclamation points on stats.
- **Names matter.** Always **Connections / Connect** and **Notations / Notes / Quotes** in user-facing copy. Never "Weave" or "Margins" — those are internal code names only.

---

## Examples of *good* Unshelved features

- A tag-axis radar that hides itself until 3 books have values, then becomes a click-through filter.
- "Connect" affordance on a quote that opens a target picker prefiltered by shared tags.
- Pace heatmap whose cells route to `/weave?month=YYYY-MM` so the user sees what they were reading *and* what they were connecting.
- Cover palette extraction at add time that quietly themes every chart and chip for that book.
- Goodreads/StoryGraph CSV import with dedupe and Open Library/Google Books enrichment in one flow.
- Cmd-K entry for every sub-view, including Notations sub-tabs.
- A Year-in-Unshelved editorial export that looks like a magazine spread, not a stat block.
- KOSync-compatible endpoint for KOReader users (when server fns land).

---

## Examples of features to *avoid or delay*

- **An activity feed of friends' reading.** Wrong product.
- **Push notifications for streaks, goals, or "your book is waiting".** Never.
- **Third-party algorithmic recommendations** ("readers like you also liked…"). Wrong incentives.
- **Public profile pages with follower counts.** Defer indefinitely.
- **Badges, levels, XP, reading challenges with prizes.** Never.
- **AI-suggested connections shipped as the primary Connections UX.** Connections must remain user-authored; AI is at most a quiet "suggested" tray, opt-in, explainable, and clearly secondary. Park until the manual graph is dense.
- **Public/shared Connections graphs.** Park until private graphs are mature and we've thought through privacy.
- **A mobile app.** Defer until desktop is fully solid.
- **In-app book purchasing / affiliate links.** Wrong product.
- **A "feed" home page.** The home page is a dashboard of the user's own library, not a stream.
- **Forking the filter contract per surface.** Architectural debt; extend `LibrarySearch` instead.
- **New raw color classes or one-off palettes per chart.** Add a token in `src/styles.css` or use the cover palette.

---

## When in doubt

Build the version that a heavy, private reader would quietly love and never show anyone — then make it shareable as an artifact only if asked.
