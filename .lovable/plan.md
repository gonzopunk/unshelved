## Goal

Replace the vertical-spine "Up next" shelf on the home page with a horizontally-scrolling row of small portrait book covers, using the existing `GeneratedCover` component so they match the rest of the app. Keep the "Reorder →" link and the "+ ADD" slot.

## Scope

Only `src/routes/_authenticated/index.tsx`. No other files change. No data/query changes.

## Markup change (lines ~233–258)

Replace the current `.shelf-row` block:

```tsx
<div className="upnext-row">
  {upNext.map((b) => (
    <Link
      key={b.id}
      to="/books/$bookId"
      params={{ bookId: b.id }}
      className="upnext-item"
      title={`${b.title} — ${b.author}`}
    >
      <GeneratedCover book={b} className="upnext-cover" />
      <div className="upnext-title">{b.title}</div>
    </Link>
  ))}
  <button
    type="button"
    onClick={() => setAddOpen(true)}
    className="upnext-add"
    aria-label="Add a book"
  >
    <div className="add-plus">+</div>
    <div className="add-lbl">add</div>
  </button>
</div>
```

Add `import GeneratedCover from "@/components/GeneratedCover";` at the top. Remove the old `.shelf-floor` div (no longer needed — no bookshelf metaphor).

## Style change (lines ~567–607)

Replace `.shelf-row / .shelf-book / .sb-* / .shelf-add / .shelf-floor` rules with:

```css
.upnext-row {
  display: flex; gap: 14px;
  padding: 18px;
  background: var(--paper);
  border-radius: 24px;
  overflow-x: auto;
  scrollbar-width: thin;
  box-shadow: 0 1px 0 rgba(31,38,48,0.04), 0 18px 40px -28px rgba(31,38,48,0.22);
}
.upnext-item {
  flex: 0 0 auto;
  width: 84px;
  text-decoration: none;
  color: inherit;
  display: flex; flex-direction: column; gap: 8px;
}
.upnext-cover {
  width: 84px; height: 126px;          /* 2:3 portrait */
  border-radius: 4px;
  box-shadow: 0 6px 14px -8px rgba(31,38,48,0.35);
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}
.upnext-item:hover .upnext-cover {
  transform: translateY(-3px);
  box-shadow: 0 12px 22px -10px rgba(31,38,48,0.4);
}
.upnext-title {
  font-size: 11.5px; line-height: 1.3;
  color: rgba(31,38,48,0.75);
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
  overflow: hidden;
}
.upnext-add {
  flex: 0 0 auto;
  width: 84px; height: 126px; border-radius: 4px;
  border: 1.5px dashed rgba(31,38,48,0.18);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 6px; color: rgba(31,38,48,0.45);
  background: transparent; cursor: pointer; padding: 0;
  transition: border-color 0.15s ease, color 0.15s ease, transform 0.15s ease;
}
.upnext-add:hover { border-color: var(--forest); color: var(--forest); transform: translateY(-2px); }
```

Keep `.add-plus` and `.add-lbl` rules as-is (still used by the add slot).

## Behavior notes

- Row scrolls horizontally on overflow (`overflow-x: auto`); the existing 5-item cap stays in `upNext`.
- `GeneratedCover` already renders `cover_url` when present, otherwise the title-on-color fallback — so covers look consistent with `BookCard` / Library.
- "Reorder →" link is untouched in `.section-head`.

## Verification

Run `bun run test` and confirm all 18 tests pass.
