# Unshelved — Killer Features Roadmap

Updated build order, reflecting what's shipped and what's been decided since the original brainstorm.

## Shipped

- **App identity: Unshelved** — renamed from Margins; inclusive tagline, no two-tier brand framing.
- **Margins tab** — notes + quotes unified on the book detail page (with Sessions alongside).
- **Reading Sessions** — `reading_sessions` table wired, per-book session log.
- **Real Book Covers (partial)** — Open Library / Google Books lookup in `AddBookModal`; generated cover fallback.
- **Weave (intertextuality)** — `connections` + `reference_books` tables, `/weave` route with **List** and **Web** views, per-book Weave tab, per-quote/note "Weave" affordance, seeded sample connections. *(Originally tagged the #1 killer feature; now live.)*

## Next up — in build order

1. **Covers, finished** — palette extraction (dominant + secondary) feeding shelf accents, bookmark color, chart palettes, generated-cover fallbacks. Finishes the half-built #1 from the original list and unlocks visual polish everywhere else.
2. **Rich Metadata Import** — Goodreads CSV, StoryGraph CSV, ISBN bulk paste, auto-enrich via Open Library + Google Books, dedupe. Lowest-friction way to get a real library into Unshelved on day one.
3. **Deep, User-Definable Tagging System** — built-in axes (spice, pace, mood, POV, content warnings, tropes) + free-form tags with autocomplete. Powers Weave tag filters, future recs, and the stats dashboard.
4. **Margins, deepened** — global `/margins` route (cross-book commonplace book, searchable, filterable by book/tag/mood/date), weekly resurfaced-quote email. Pairs naturally with Weave: every quote is already a potential connection.
5. **Open-Reader Sync (Tier A)** — KOSync-compatible endpoint for KOReader + Audiobookshelf OAuth. The "escape Bezos-land" positioning and the most defensible integration moat.
6. **Editorial Stats Dashboard** — "Year in Unshelved" magazine spread: format split, mood/genre radar, pace heatmap, reading-personality archetype, 9:16 image export.
7. **Tier Maker / Rankable Lists** — drag-and-drop tier ranker for any library subset, exportable image card. Viral surface for the social half of the audience.
8. **Series & Author Intelligence** — auto-detect series, "up next" prompts, author pages with timeline and read %.
9. **Smart Recommendations from Your Tags** — vector recs over user axes + Weave graph (already a private taste signal nobody else has).
10. **Buddy Reads & Soft Social** — shareable shelf / tier list / stats links, per-book spoiler-gated threads, follow friends' currently-reading.

## Parked / explicitly later

- Bookcloud visualization (revisit once Weave is well-populated)
- Public/shared Weave connections
- AI-suggested connections
- Audible / Kindle gray-zone integrations (document, don't host)
- Mobile app (after desktop is solid)

## Notes on ordering

- Items 1–4 are **library-quality** work: they make every other feature feel better and are mostly schema-light frontend wins.
- Items 5 is the **moat** play — biggest engineering lift, biggest positioning payoff.
- Items 6–7 are **viral surfaces** — ship after the library and Margins/Weave are dense enough to make exports look good.
- Items 8–10 are **network effects** — best built once a critical mass of tagged, woven libraries exists.
