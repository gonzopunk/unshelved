## Problem

The Add a connection modal scrolls horizontally when a candidate book has a very long title (e.g. "Garden Guide - A [...] Guide to Great Gardens [...] for Beginners and [...] Advanced"). The modal itself appears to grow past `max-w-lg`, and a horizontal scrollbar shows at the bottom of the dialog.

## Root cause

`DialogContent` is a CSS `grid` container. Grid items default to `min-width: auto`, which lets them expand to their content's intrinsic width. The form wrapper (`<div className="space-y-4">`) is a grid item; the candidate list buttons inside it have very long single-line titles, and although the title `<div>` has `truncate`, the grid item ancestor never gets a `min-width: 0` constraint, so the whole column expands and the dialog overflows. `overflow-y-auto` on `DialogContent` then implies `overflow-x: auto`, producing the scrollbar.

The selected-target row (`<div className="mt-1 flex items-center justify-between …">`) has the same latent bug: its title `<div>` has no `truncate` and the flex child has no `min-w-0`, so picking a long-titled target would also overflow.

## Fix

In `src/components/AddConnectionModal.tsx` only — three minimal changes:

1. **Form wrapper (line 125):** add `min-w-0` so the grid item can shrink below its content's intrinsic width.
   - From: `<div className="space-y-4">`
   - To: `<div className="space-y-4 min-w-0">`

2. **DialogContent (line 121):** add `overflow-x-hidden` as a defensive belt to guarantee the modal never shows a horizontal scrollbar.
   - Append `overflow-x-hidden` to the existing className.

3. **Selected-target row (lines 134–138):** add `min-w-0` to the text column and `truncate` to the title and author so a long-titled selected target also stays inside the modal.
   - Wrap the inner text `<div>` with `min-w-0 flex-1` and add `truncate` to both the title and author lines.

No other files touched. After the change, run `bun run test` to confirm all 18 tests still pass.