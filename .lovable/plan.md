The logo in `src/routes/login.tsx` uses `src/assets/unshelved_logo.png`, and the U/book symbol is shifted inside the raster canvas. The `<img>` element itself is centered by its parent, so the misalignment lives in the asset.

**Recommended fix:** create a reusable inline SVG `Logo` component with a square `viewBox` and the U/book/person geometry centered mathematically. SVG stays sharp at any size and makes centering deterministic.

Plan:
1. Create `src/components/Logo.tsx` as an inline SVG using the current palette (`terra`, `forest`, paper/cream tones).
2. Replace the `<img src={unshelvedLogo} ... />` usage in `src/routes/login.tsx` with `<Logo className="w-[120px] h-[120px]" />`.
3. Search for other usages of `unshelvedLogo` (e.g. `signup.tsx`) and replace them consistently with the new `Logo` component.
4. Remove `src/assets/unshelved_logo.png` once it is no longer referenced.
5. Verify in the preview that the logo appears centered both horizontally and vertically inside its container.

Scope is limited to the logo component and its call sites; no broader layout changes.