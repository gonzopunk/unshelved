## Why it looks off-center

The PNG file itself is asymmetric. It's 1014×1000 px with an alpha channel, and the opaque logo content occupies pixels (20, 20) to (1014, 1000) — meaning there are **20 px of transparent padding on the top and left edges, and 0 px on the bottom and right**.

- In the browser, the `<img>` is rendered as a centered box. Because the transparent padding is lopsided, the visible logo gets pushed down and to the right inside that box — exactly what your screenshot shows.
- Paint / Adobe Express show it "centered" because they either crop to the visible content or display against a different background where the asymmetric transparent margin is less obvious.

This is a problem with the asset, not the login page CSS.

## Fix

Rewrite `src/assets/unshelved_logo.png` so the opaque content sits on a symmetric, square canvas:

1. Trim the existing alpha bbox (gives a clean 994×980 opaque region).
2. Paste it centered onto a new transparent square canvas (1024×1024, with equal padding on all sides).
3. Overwrite `src/assets/unshelved_logo.png` with the new file.

No code or component changes are needed — `login.tsx`, `signup.tsx`, and anywhere else that imports `unshelved_logo.png` will automatically render it centered.

## Verification

- Reload `/login` — the U-with-reader mark sits visually centered above the "Unshelved" wordline, with equal whitespace left/right and top/bottom.
- Same check on `/signup` and any other usage.
