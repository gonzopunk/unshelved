
# Home page redesign — layout/copy/structure pass

Edits **only** `src/routes/_authenticated/index.tsx`. No changes to BookCard, GeneratedCover, queries, or any other file. No new mutations or session creation — those land in a follow-up.

## 1. Hero

**Eyebrow** — strip down to two pieces only:
```
<dot> {fmtMinutes(weekMinutes)} this week  ·  {inFlight} in progress
```
- Drop the `dayName partOfDay` prefix.
- Drop the streak conditional entirely (delete the render; `streak`/`computeStreak` import stays only if still used — it isn't, so remove both).
- Use "in progress" (singular/plural both work — match existing "book/books" pluralization).

**Greeting line** — replace `Welcome back, {firstName}. Pick up where you drifted off.` with a contextual line:
```ts
const hour = new Date().getHours();
const tod = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
const greeting =
  focus && focusPct > 5
    ? `${tod}, ${firstName}. You're ${focusPct}% through ${focus.title}.`
    : `${tod}, ${firstName}. Your library is waiting.`;
```
Render as `<h1 className="hero-title">{greeting}</h1>` (keep existing typography). Remove the `<em>` italic split — single sentence.

**Remove** the `.hero-sub` paragraph entirely.

**CTA** — single primary button only:
```tsx
<div className="hero-cta">
  <button type="button" className="btn btn-primary" onClick={() => {}}>Log a session</button>
</div>
```
Remove the Resume link, the conditional "Open the board" fallback, and the existing ghost "Log a session". `partOfDay` and `dayName` consts can be removed (no longer used).

## 2. Focus book selection (drives right-hand stat card)

Replace `const focus = reading[0]` with a session-aware pick:
```ts
const readingAll = library.filter((b) => b.user_books[0]?.status === "reading");
const inFlight = readingAll.length;
// pick reading book whose latest session.started_at is most recent; fall back to readingAll[0]
const lastSessionByBook = new Map<string, string>();
for (const s of recentSessions) {
  const prev = lastSessionByBook.get(s.book_id);
  if (!prev || s.started_at > prev) lastSessionByBook.set(s.book_id, s.started_at);
}
const focus =
  [...readingAll].sort(
    (a, b) => (lastSessionByBook.get(b.id) ?? "").localeCompare(lastSessionByBook.get(a.id) ?? "")
  )[0] ?? readingAll[0];
```
(Uses `recentSessions` already in scope; no new query hook. `s.book_id` matches the shape returned by `useAllSessions`.)

**Right stat card** — three states:
1. `focus` exists AND (`focusPct > 0` OR a session exists for it): current "p. X / Y · {focusPct}% complete" card linking to `/books/$bookId`.
2. `focus` exists but `focusPct === 0` AND no session for it: show library total instead — `stat-num = library.length`, `stat-lbl = "books in your library"`, no `.stat-bar`, `stat-foot = "start reading to track progress →"`. Link to `/library`.
3. No `focus` at all: same as state 2.

Left stat card (yearly goal) is unchanged.

## 3. Currently reading

- Delete `SIZE_KEY`, `MIN_COL`, `MAX_COL`, `readingSize`, `changeSize`, the `useEffect` that hydrates from localStorage, and the `<label className="size-slider">` block in the section head.
- Change `reading` to use `readingAll` (no `.slice(0, 2)` cap).
- Replace inline grid style with class only. Update `.reading-grid` CSS to:
  ```css
  .reading-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 20px; }
  ```
- Delete the entire `.reading-grid .bc-*` clamp override block, plus `.size-slider` / `.size-slider-lbl` rules.
- Drop the `tilt={[-0.6, 0.4][i] ?? 0}` (omit the prop; default is 0) so cards beyond index 1 don't all tilt the same.

## 4. Up next

Remove: `upnextRef`, `canL`, `canR`, the scroll `useEffect`, `scrollByPage`, the `.upnext-wrap` / left+right `.upnext-nav` buttons, and `ChevronLeft`/`ChevronRight` imports (they're not used elsewhere in this file).

Add: `const [showAllUpNext, setShowAllUpNext] = useState(false);`

Keep `upNext = library.filter(...).slice(0, 20)`.

New JSX inside the section:
```tsx
<div className="upnext-row">
  {upNext.slice(0, 5).map((b) => (
    <Link key={b.id} to="/books/$bookId" params={{ bookId: b.id }} className="upnext-item" title={`${b.title} — ${b.author}`}>
      <GeneratedCover book={b} className="upnext-cover" />
      <div className="upnext-title">{b.title}</div>
    </Link>
  ))}
  <button type="button" onClick={() => setAddOpen(true)} className="upnext-add" aria-label="Add a book">
    <div className="add-plus">+</div><div className="add-lbl">add</div>
  </button>
</div>
{upNext.length > 5 && (
  <button type="button" className="upnext-showall" onClick={() => setShowAllUpNext((v) => !v)}>
    {showAllUpNext ? "Show less" : `Show all (${upNext.length})`}
  </button>
)}
{showAllUpNext && upNext.length > 5 && (
  <div className="upnext-grid">
    {upNext.map((b) => (
      <Link key={b.id} to="/books/$bookId" params={{ bookId: b.id }} className="upnext-item" title={`${b.title} — ${b.author}`}>
        <GeneratedCover book={b} className="upnext-cover" />
        <div className="upnext-title">{b.title}</div>
      </Link>
    ))}
  </div>
)}
```

CSS updates:
```css
.upnext-row { display: flex; gap: 14px; flex-wrap: wrap; align-items: flex-start; }
.upnext-item { width: 84px; flex: 0 0 84px; }
.upnext-cover { width: 84px; height: 126px; border-radius: 4px; box-shadow: inset -2px 0 0 rgba(0,0,0,0.15), 0 2px 6px -2px rgba(31,38,48,0.3); }
.upnext-title { /* unchanged: 2-line clamp, small caption */ }
.upnext-add { width: 84px; height: 126px; /* keep existing border/dashed look */ }
.upnext-grid { margin-top: 16px; display: grid; grid-template-columns: repeat(5, 1fr); gap: 14px; }
.upnext-showall { margin-top: 14px; background: transparent; border: none; color: var(--forest); font: inherit; cursor: pointer; padding: 0; }

@media (max-width: 768px) {
  .upnext-row { flex-wrap: nowrap; overflow-x: auto; scroll-snap-type: x mandatory; }
  .upnext-row > * { scroll-snap-align: start; }
  .upnext-grid { grid-template-columns: repeat(2, 1fr); }
}
```
Drop `.upnext-wrap` and `.upnext-nav` rules.

## 5. Recently finished

Replace the colored `.fin-cover` div with `GeneratedCover`:
```tsx
<GeneratedCover book={b} className="fin-cover-img" />
```
Grid becomes `48px 1fr auto`. Star rendering stays as-is (non-interactive); add a comment above it:
```tsx
{/* TODO: half-star interactive rating in prompt 2 */}
```
If `ub?.rating` is null, the existing `n <= (ub?.rating ?? 0)` already renders 5 empty stars — keep.

CSS:
```css
.finished-list .fin-row { grid-template-columns: 48px 1fr auto; }
.fin-cover-img {
  width: 48px; height: 72px; border-radius: 3px; flex-shrink: 0;
  box-shadow: inset -2px 0 0 rgba(0,0,0,0.15), 0 2px 6px -2px rgba(31,38,48,0.3);
}
```
Remove the old `.fin-cover` rule.

## 6. Cleanup

- Imports to drop: `ChevronLeft`, `ChevronRight`, `useRef`, `computeStreak` (verify each is unused after edits before removing).
- Constants to drop: `SIZE_KEY`, `MIN_COL`, `MAX_COL`.
- CSS rules to drop (only if no JSX still references them after the rewrite): `.size-slider`, `.size-slider-lbl`, `.upnext-wrap`, `.upnext-nav`, `.fin-cover` (replaced by `.fin-cover-img`), and the `.reading-grid .bc-*` clamp override block. Leave any `.bc-*`, `.cv-*`, `.bookmark`, `.audio-spool-hp` rules alone unless I confirm they have zero references in the post-edit JSX (most belong to BookCard internals via cascade and should stay untouched to be safe).
- `streak` const and `weekMinutes`-related logic stay (`weekMinutes` is now used in the eyebrow).

## 7. Verification

- Run `bun run test` and confirm all 18 tests still pass.
- Spot-check rendering paths in the JSX for: no sessions, no reading books, no finished books, no highlights — each branch already has a guard or a fallback in the new code (state 2/3 stat card, `Empty` for reading, `Empty` for finished, existing `quote && (...)` guard).
- No other files modified.
