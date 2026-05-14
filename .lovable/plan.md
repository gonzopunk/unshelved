## Fix

In `src/routes/_authenticated/index.tsx`, replace the flex-basis CSS-var sizing on `.upnext-item`, `.upnext-cover`, and `.upnext-add` with fixed pixel dimensions. The previous `flex: 0 0 calc(...)` and `aspect-ratio` combo let the flex container's height stretch the covers.

### Style changes only

```css
.upnext-item {
  flex: 0 0 84px;
  width: 84px;
  scroll-snap-align: start;
  text-decoration: none;
  color: inherit;
  display: flex; flex-direction: column; gap: 8px;
}
.upnext-cover {
  width: 84px;
  height: 126px;
  flex: 0 0 126px;     /* prevent flex-column stretching */
  border-radius: 4px;
  box-shadow: 0 6px 14px -8px rgba(31,38,48,0.35);
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}
.upnext-add {
  flex: 0 0 84px;
  width: 84px;
  height: 126px;
  align-self: flex-start;
  scroll-snap-align: start;
  border-radius: 4px;
  border: 1.5px dashed rgba(31,38,48,0.18);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 6px; color: rgba(31,38,48,0.45);
  background: transparent; cursor: pointer; padding: 0;
  transition: border-color 0.15s ease, color 0.15s ease, transform 0.15s ease;
}
```

Drop `min-width: 64px` and the `aspect-ratio` rules. Keep `.upnext-row` (with its `align-items` left as default — items size themselves explicitly so stretch is moot), `.upnext-wrap`, `.upnext-nav`, `.upnext-title`, hover, and arrow logic exactly as they are.

At 84px + 14px gap, the row's content box (~520px in the right-hand `1.3fr`/`1fr` `two-col` column on a 1389px viewport) fits ~5 items, with horizontal scroll handling the rest — matching the requirement.

### Scope

- Only the three CSS rule blocks above. No JSX, no arrow behavior, no other files.

## Verify

`bun run test` — expect all 18 tests to pass.