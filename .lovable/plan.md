## Diagnosis

The nav is `position: fixed; left: 50%; transform: translateX(-50%)`, which centers against the **initial containing block (the layout viewport)**, not the visual viewport.

On mobile Chrome, when any page content causes horizontal overflow, Chrome widens the layout viewport to fit that overflow (other browsers/preview iframes don't always do this — which is why the bug is invisible in the Lovable mobile preview but reproduces in real Chrome). The fixed nav then centers on the wider layout viewport, so when you're scrolled to x=0 it appears pushed to the right.

So the bug isn't in the nav — it's that the **home page overflows horizontally on narrow widths**, and only the home page does. The most likely culprits in `src/routes/_authenticated/index.tsx` (`HomepageStyles`):

1. **`.hero-stats { grid-template-columns: 1fr 1fr }`** — `1fr` resolves to `minmax(auto, 1fr)`, so the giant `.stat-num` (56px serif) and labels like `{focus.title}` set a min-content width that can blow past 195px per cell on a 390px screen. This is the classic CSS-grid overflow trap.
2. **`.hero-title em`** at 44px renders the contextual line `You're N% through {focus.title}.` — a long unbroken title can overflow because `text-wrap: balance` doesn't break words.
3. **`.stat-lbl`** inside the focus card prints `{focus.title}` with no wrap rule — same overflow risk.
4. Several cards (`.quote`, `.stat`, `.upnext-row`) use generous horizontal padding (e.g. `padding: 22px 24px`, `padding: 44px 56px`) that's only narrowed at `max-width: 900px`, not at 640/400.

## Plan

Edit only `src/routes/_authenticated/index.tsx`, inside `HomepageStyles()`:

1. **Fix the grid overflow** — change `.hero-stats` to `grid-template-columns: minmax(0, 1fr) minmax(0, 1fr)`. This is the single most likely root cause.
2. **Let long titles wrap** — add `overflow-wrap: anywhere` (and `min-width: 0`) to `.stat`, `.stat-lbl`, and `.hero-title em` so a long book title can't push its container wider than its cell.
3. **Tighten card padding on small screens** — inside the existing `@media (max-width: 640px)` block (or add one), reduce `.stat` padding to `18px 16px` and `.quote` to `28px 20px` so the cards fit comfortably at 390px.
4. **Safety net** — add `overflow-x: clip` to `.hp`. This guarantees that any future overflowing child can never widen the layout viewport again, so the fixed nav stays centered even if a new element regresses. (`clip` over `hidden` so it doesn't create a new scroll container or affect sticky descendants.)

No changes to the nav, to `_authenticated.tsx`, or to any other route.

## Verification

After the edits I'll run Playwright headless Chromium at a 390-wide viewport, load `/`, screenshot the nav, and assert `document.documentElement.scrollWidth === clientWidth` to confirm no horizontal overflow remains. Then typecheck.