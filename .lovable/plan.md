The logo file and `/unshelved_logo_transparent.png` path are working. The issue is the image itself: it is a square 1254×1254 PNG with the visible mark offset to the lower-right, so when it is constrained to 32px tall it renders as a tiny sliver in the nav. There is enough room in the nav; the asset needs a cropped/normalized version for this placement.

Plan:
1. Create a corrected public PNG from `public/unshelved_logo_transparent.png` by cropping to the visible pixels and preserving transparency.
2. Keep the desktop nav image source as `/unshelved_logo_transparent.png`, with `alt="Unshelved"` and 32px height, so the route code stays minimal.
3. Verify in the preview that the logo appears before Library and the other nav elements remain unchanged.

Technical detail:
- Only the static asset will be replaced; `_authenticated.tsx` should not need markup changes unless verification shows a sizing rule is still needed.