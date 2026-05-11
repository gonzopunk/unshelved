# Unshelved — Product Principles

A short companion to `PROJECT_CONTEXT.md`.

- Use this file to decide **what belongs in Unshelved**.

- Use `PROJECT_CONTEXT.md` to understand **how the app currently works**.

- Use `AI_CHANGE_CHECKLIST.md` before making code changes.

---

## Thesis

**Unshelved is a private commonplace tool for serious readers: a library you can think with, not a feed you perform on.**

---

## Core principles

1. **Books are not the endpoint.**  

   The real value is the trace they leave: notes, quotes, sessions, tags, axes, and connections.

2. **The library is a graph.**  

   Connections between books, quotes, reference texts, and ideas are first-class — not a side feature.

3. **Notations are central.**  

   Notes and quotes should feel like a searchable cross-book commonplace, not scattered comments.

4. **Every stat should open a door.**  

   Charts, chips, counts, badges, slices, and edges should click through to a filtered Library, Notations, or Connections view.

5. **One filter language.**  

   All filtering flows through `LibrarySearch`. Do not create separate filter systems per page.

6. **Quiet, paper-feel interface.**  

   Forest-on-paper, generous spacing, cover-derived accents, no neon, no generic SaaS dashboard feel.

7. **Private by default.**  

   No social feed, no public activity, no cross-user visibility unless explicitly designed later.

8. **User-owned taste.**  

   The user’s reading data is for their own reflection, not publisher promotion, engagement optimization, or opaque recommendation systems.

9. **Heavy-reader first.**  

   Design for users with hundreds or thousands of books, not only a tidy demo library.

10. **Reflective, not addictive.**  

    Stats may describe reading life; they should not nag, shame, reward, or manipulate.

---

## What Unshelved is not

Unshelved is not:

- a Goodreads clone

- a social feed

- a reading-performance app

- a bookstore

- a streak machine

- an AI-first recommender

- a public identity platform

- a generic habit tracker

Finishing books is not the main unit of value. Building a meaningful private record of reading is.

---

## Feature test

Before building a feature, ask:

1. **Does it deepen the graph or the marginalia?**  

   Connections, Notations, tags, axes, sessions, quotes, references.

2. **Does it make existing data more navigable?**  

   Better filters, better sorting, better search, better click-through, better visualization.

3. **Would a serious reader use it repeatedly?**  

   Not “is it cool?” but “would it matter after importing 500 books?”

4. **Can it be expressed through an existing surface?**  

   Prefer improving Library, Notations, Connections, or Visualizations over adding a new screen.

5. **Does it require server-side capability?**  

   Secrets, webhooks, sync, email, AI, cross-user logic, or background jobs require server planning first.

If a feature does not pass #1 or #2, it is probably a distraction.

---

## Social, recommendations, notifications, gamification

### Social

- Default private.

- Sharing should be artifact-based: exports, image cards, optional links.

- No activity feed.

- No follower counts, likes, view counts, or public popularity metrics.

- Buddy reads may come later, but only as a soft opt-in feature.

### Recommendations

- Recommendations should come from the user’s own library first.

- They must be explainable: tags, axes, authors, series, or connections.

- No publisher promotions.

- No paid placement.

- No black-box “readers like you” feed.

### Notifications

- No push notifications in v1.

- Email should be rare, opt-in, and editorial.

- Good: weekly resurfaced quote digest.

- Bad: “You haven’t read in 3 days.”

### Gamification

- No badges, XP, levels, leaderboards, or streak pressure.

- Streaks and goals may exist as quiet descriptive stats.

- Never use guilt as a retention strategy.

---

## Tone

Unshelved should sound:

- quiet

- literate

- direct

- specific

- bookish without being cute

Good:

> “47 quotes from 12 books, mostly Le Guin and Calvino.”

Bad:

> “🔥 Amazing! You’re on a 5-day reading streak!”

Use:

- **Connections / Connect**

- **Notations / Notes / Quotes**

- **Visualizations**

Never use user-facing:

- “Weave”

- “Margins”

- “Unweave”

---

## Good Unshelved features

Good features include:

- a quote-to-book Connect action

- a chart slice that opens the matching Library filter

- a resurfaced quote from an older book

- a Year-in-Unshelved export that feels editorial, not gamified

- better Goodreads / StoryGraph import cleanup

- cover-derived visual accents

- searchable Notations across all books

- KOReader sync, once server-side foundations are ready

---

## Avoid or delay

Avoid or delay:

- activity feeds

- public profile pages

- follower counts

- streak nags

- push notifications

- affiliate links

- in-app book purchasing

- third-party recommendation feeds

- AI-generated connections as the primary graph experience

- mobile app before the desktop/web app is solid

- new surfaces when an existing surface can do the job

---

## Final rule

Build the version a serious private reader would quietly love, even if they never showed it to anyone.
