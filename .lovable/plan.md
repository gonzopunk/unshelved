# Update vulnerable dependencies

All findings are transitive vulnerabilities (undici, ws, protobufjs, dompurify, esbuild, etc.) pulled in by five direct dependencies. The fix is to bump the direct deps to their latest versions, which pull patched transitives, and refresh the lockfile.

## Steps

1. Run `bun update` for the affected direct dependencies:
   - `@cloudflare/vite-plugin`
   - `@supabase/supabase-js`
   - `@tanstack/react-start` (plus the matching `@tanstack/react-router` / `@tanstack/start-*` siblings so versions stay aligned)
   - `posthog-js`
   - `react-email`
2. If any high-severity transitive remains pinned, add a `bun` `overrides` entry in `package.json` (e.g. `undici`, `ws`, `protobufjs`) to force patched versions.
3. Re-run the dependency scan / `bun audit` to confirm the high-severity advisories are gone.
4. Smoke-test the app via the running dev server (auth, library, board) since TanStack Start and Supabase client are on the upgrade list.

## Notes / risks

- TanStack Start minor bumps occasionally tweak server-function or router APIs. If typecheck or build fails after the upgrade, pin to the latest compatible minor instead of latest major.
- No application code changes are expected; this is a dependency-only update.
- Medium-severity findings will largely clear as a side effect of the same bumps; remaining ones can be addressed in a follow-up if needed.
