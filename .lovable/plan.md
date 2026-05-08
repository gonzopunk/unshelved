## How I'd group the next three rounds

The list mixes three different kinds of work: **fixing what's already there**, **getting more raw material in**, and **making new ways to look at it**. Doing them in that order compounds — each round makes the next one feel better.

---

### Round 1 — Polish, clickability, and editing (the "everything works" round)

The app already has the right bones; right now several things look interactive but aren't, and connections are read-only once made. This round closes those gaps so the rest of the app feels trustworthy.

- **Clickability audit.** Walk every surface (Home, Library, Board, Book detail, Connections list + web). For each element that *looks* clickable, decide: link, modal, or remove the affordance.
  - Home: "books this year" and "currently reading" stat cards → link to filtered library views.
  - Home: "Up Next" dotted Add tile → opens AddBook modal.
  - Home: resurfaced Quote card → links to that book + highlight.
- **Edit connections.** Click a ConnectionCard (or its pencil) → opens AddConnectionModal pre-filled with `why`, `tags`, endpoints. Same modal handles create + edit.
- **Filters for the Connections web.** Start with the highest-leverage axes: format, status, author, year read, and any user tag axis. Chip row above the canvas; nodes/edges fade rather than disappear so the shape of the web stays legible.
- **Search.** A single ⌘K palette across books, highlights, notes, connections, tags — because once filters exist, people want to jump.

*Why first:* low risk, immediately felt on every page, and makes Round 3 (data views, exports) much more valuable because every chart bar will actually click through to something.

---

### Round 2 — Rich library import (the "now I can really use this" round)

The biggest single unlock. Until import is painless, the library stays at sample-size and the web stays sparse. Tackled as one round because the underlying pipeline (normalize → enrich → dedupe → preview → commit) is shared across every input source.

- **Shared import pipeline.** One "Import" screen with a staging table: parsed rows → enrichment status → duplicate warnings → user confirms → batch insert.
- **Sources, in priority order:**
  1. **Goodreads + StoryGraph CSV** — highest ROI, well-documented schemas, brings shelves/ratings/dates.
  2. **ISBN paste** (one or many, newline-separated) — tiny UI, huge usefulness.
  3. **Barcode scan via phone camera** — `BarcodeDetector` API where supported, `@zxing/browser` fallback. Mobile-first.
  4. **Bookshelf photo pan** — defer to a stretch goal at the end of the round; honest answer is it's *possible* (Gemini 2.5 Pro can read spines) but accuracy on a tilted shelf is maybe 60–80% and needs heavy human review. Worth prototyping, not worth promising.
- **Metadata enrichment.** Open Library + Google Books as the two-source lookup; cache results. Auto-fill cover, author, page count, publisher, year.
- **Smart dedupe.** Match on ISBN first, then normalized (title + author) with a similarity threshold. Show side-by-side merge UI when ambiguous.
- **Cover handling.** Use enriched cover art when present; fall back to the existing GeneratedCover.

*Why second:* this is the round that turns the app from a demo into someone's actual library, which makes Round 3's charts and views worth building.

---

### Round 3 — Data, expression, and export (the "make meaning visible" round)

With a real library and trustworthy navigation in place, this round is where the app becomes something you'd want to *show* someone.

- **Data tab.** Top-level route. A small set of editorial, customizable charts:
  - Reading pace heatmap (calendar-style).
  - Pages/minutes over time, by format.
  - Author/genre/tag breakdowns.
  - "Web density" — connections per book over time.
  - Each chart click-throughs to the filtered list.
- **Bookcloud.** Tag/author/theme cloud sized by frequency, weighted by your ratings. Click a term → filtered library + web.
- **Tier maker.** Drag books into S/A/B/C/D rows. Per-axis tier lists (best plot, best prose, most reread-worthy). Saved as named lists.
- **Commonplace book view.** A long, beautifully-typeset scroll of your highlights and notes — chronological or grouped by book — that reads like a private anthology. This is the one that captures the *spirit* you mentioned. Print-stylesheet friendly.
- **Exports.** PDF (commonplace book, tier lists, single connection cards), CSV (library, highlights, connections), PNG (single quote cards, web snapshot, tier list). One export system, multiple endpoints.

*Why third:* every item here is dramatically better when there's real data behind it and when clicking a chart bar actually goes somewhere (Round 1).

---

### Other ideas worth queuing for Round 4+

- **Reading streaks / goal pacing** beyond the yearly count.
- **"Books that rhyme"** — suggested-reading-from-your-own-library, based on shared tags + connection neighbors. Not auto-suggested *connections* (you rejected that), but suggested *next reads*.
- **Quick-capture mobile flow:** photo of a page → OCR → new highlight, with book auto-detected.
- **Public share pages:** one book, one connection, one quote — single canonical URL that looks great when shared.
- **Tag axis management UI** — right now axes are seeded but not really editable in-app.
- **Annotations on highlights** (notes attached to a specific quote, not just a book).

---

### Open question before I write a Round 1 plan

For Round 1's clickability audit — do you want me to just **fix everything** I find in one pass, or **list the inventory first** so you can rank what matters? My instinct is to fix everything, since most fixes are tiny and the inconsistency itself is the bug.
