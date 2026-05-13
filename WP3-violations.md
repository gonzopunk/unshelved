# WP3 Lint Violations Log

Captured during WP3 setup. **Do not fix in this work package** — these are deferred to a future pass.

## Raw Tailwind color rule (new)

- Violations found: **0**. No raw color regressions in app code (excluding `src/components/ui/**`).

## Terminology rule (new — `no-restricted-syntax` on `JSXText`)

This rule is intentionally noisy: per WP3 spec, the selector flags every JSX text node and the message is the human reminder to look for "Margins" / "Unweave". Most flagged nodes are legitimate copy and require no action. Reviewers should grep for the actual banned words ("Margins", "Unweave", "Weave" used as a noun) when triaging this rule's output.

## Pre-existing Prettier violations

`bun run lint` reports a large number of `prettier/prettier` formatting errors across pre-existing files (e.g. `src/routes/_authenticated/weave.tsx`, `src/routes/login.tsx`, etc.). These predate WP3 and are unrelated to the new rules. Deferred — fix with `bun run format` in a dedicated pass.
