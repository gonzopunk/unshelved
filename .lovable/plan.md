## Polish pass on `src/routes/_authenticated/index.tsx`

Single-file edit. Seven changes, all surgical.

### 1. Hero greeting — two-part with italic
Replace current single-line `<h1>` with:
```tsx
const contextualLine = focus && focusPct > 5
  ? `You're ${focusPct}% through ${focus.title}.`
  : `Your library is waiting.`;

<h1 className="hero-title">
  Welcome back, {firstName}.<br />
  <em>{contextualLine}</em>
</h1>
```
Drop the current `tod`/greeting consts. Re-add CSS rule:
```css
.hero-title em { font-style: italic; color: var(--terra); font-weight: 300; }
```

### 2. Eyebrow — restore day/time, inline time format
```ts
const dayName = format(new Date(), "EEEE");
const hour = new Date().getHours();
const partOfDay = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
const weekMin = weekMinutes;
const weekFormatted = weekMin < 60
  ? `${weekMin} min`
  : `${Math.floor(weekMin / 60)} hr ${weekMin % 60 > 0 ? (weekMin % 60) + " min" : ""}`.trim();
```
Eyebrow JSX:
```tsx
<span className="dot" />
{dayName} {partOfDay} · {weekFormatted} this week · {inFlight} in progress
```
Do not use `fmtMinutes` here.

### 3. Right stat card — drop focusPct gate
Condition becomes `readingAll.length > 0` → focus card; else library-count fallback. Remove `focusPct === 0` and the "no session for it" branch.

### 4. Cap Currently section to 5 most recently started
```ts
const reading = [...readingAll]
  .sort((a, b) =>
    (b.user_books[0]?.started_at ?? "")
      .localeCompare(a.user_books[0]?.started_at ?? "")
  )
  .slice(0, 5);
```

### 5. Section heading rename
JSX-only: "Currently reading" → "Currently unshelved". No variable/key/status changes.

### 6. Toggle copy
"Show less" → "Show fewer" in the up-next toggle button.

### 7. Verify
`bun run test` — all 18 tests must pass. No other files touched.
