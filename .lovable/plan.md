## Goal

Add left/right arrow buttons to the "Up next" horizontal row, and size items so 5 covers fit at once. Arrows scroll the row by one page (5 items) and disable at the ends.

## Scope

Only `src/routes/_authenticated/index.tsx`. No data changes; the cap stays at 20 from the previous turn.

## Implementation

### 1. Wrapper + scroll logic

Wrap `.upnext-row` with a relative container `.upnext-wrap`, and attach a ref + scroll handler. Add `ChevronLeft` / `ChevronRight` from `lucide-react` (already used elsewhere).

```tsx
import { ChevronLeft, ChevronRight } from "lucide-react";

// inside Home():
const upnextRef = useRef<HTMLDivElement>(null);
const [canL, setCanL] = useState(false);
const [canR, setCanR] = useState(false);

const updateArrows = () => {
  const el = upnextRef.current;
  if (!el) return;
  setCanL(el.scrollLeft > 4);
  setCanR(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
};

useEffect(() => {
  updateArrows();
  const el = upnextRef.current;
  if (!el) return;
  el.addEventListener("scroll", updateArrows, { passive: true });
  const ro = new ResizeObserver(updateArrows);
  ro.observe(el);
  return () => { el.removeEventListener("scroll", updateArrows); ro.disconnect(); };
}, [upNext.length]);

const scrollByPage = (dir: 1 | -1) => {
  const el = upnextRef.current;
  if (!el) return;
  el.scrollBy({ left: dir * el.clientWidth, behavior: "smooth" });
};
```

### 2. Markup

```tsx
<div className="upnext-wrap">
  <button
    type="button"
    className="upnext-nav left"
    onClick={() => scrollByPage(-1)}
    disabled={!canL}
    aria-label="Scroll left"
  >
    <ChevronLeft size={18} />
  </button>
  <div className="upnext-row" ref={upnextRef}>
    {/* existing items + add button unchanged */}
  </div>
  <button
    type="button"
    className="upnext-nav right"
    onClick={() => scrollByPage(1)}
    disabled={!canR}
    aria-label="Scroll right"
  >
    <ChevronRight size={18} />
  </button>
</div>
```

### 3. Sizing — 5 covers at once

Replace fixed `width: 84px` on `.upnext-item / .upnext-cover / .upnext-add` with a CSS-var-driven width so 5 fit in the row's content box, accounting for the 14px gaps and 18px padding.

```css
.upnext-wrap { position: relative; }
.upnext-row {
  --upnext-gap: 14px;
  --upnext-pad: 18px;
  --upnext-item-w: calc((100% - 2 * var(--upnext-pad) - 4 * var(--upnext-gap)) / 5);
  scroll-behavior: smooth;
  scroll-snap-type: x mandatory;
  /* existing: display:flex; gap:14px; padding:18px; bg; radius; overflow-x:auto; shadow */
}
.upnext-item, .upnext-add {
  width: var(--upnext-item-w);
  min-width: 64px;
  scroll-snap-align: start;
}
.upnext-cover {
  width: 100%;
  aspect-ratio: 2 / 3;     /* replaces fixed 84×126 */
  height: auto;
}
.upnext-add { aspect-ratio: 2 / 3; height: auto; }
```

### 4. Arrow button styling

```css
.upnext-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 32px; height: 32px;
  border-radius: 999px;
  background: var(--paper);
  border: 1px solid rgba(31,38,48,0.12);
  display: flex; align-items: center; justify-content: center;
  color: var(--ink);
  cursor: pointer;
  box-shadow: 0 4px 10px -4px rgba(31,38,48,0.25);
  transition: opacity 0.15s ease, transform 0.15s ease, background 0.15s ease;
  z-index: 2;
}
.upnext-nav.left { left: -12px; }
.upnext-nav.right { right: -12px; }
.upnext-nav:hover:not(:disabled) { background: var(--cream); }
.upnext-nav:disabled { opacity: 0; pointer-events: none; }
```

Arrows fade out when there's nothing to scroll in that direction (clean look on small libraries that already fit). They live outside `.upnext-row` so they don't get clipped by `overflow-x: auto`.

## Notes

- Page scroll = `clientWidth` (i.e. roughly 5 items). Simple, no per-item math.
- Mobile keeps native swipe; arrows are an additive aid.
- "Reorder →" link and "+ ADD" slot unchanged.

## Verify

`bun run test` — expect all 18 tests to still pass.