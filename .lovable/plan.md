# Weighted Connections

Add a `strength` integer (1–5, default 3) on `connections` that drives card visuals and graph physics.

## 1. Migration

- Add `strength int NOT NULL DEFAULT 3` with `CHECK (strength BETWEEN 1 AND 5)` on `public.connections`.
- Replace `seed_sample_library` — identical to current version except the `connections` INSERT column list gains `strength` and each of the 18 rows gets the explicit value from the spec.

## 2. `src/lib/weave.ts`

- `useCreateConnection`: input type gains `strength?: number`; insert payload sets `strength: input.strength ?? 3`.
- `useUpdateConnection`: args gain `strength?: number`; patch builder adds `if (strength !== undefined) patch.strength = strength`.

## 3. `src/components/AddConnectionModal.tsx`

- New `strength` state (default 3); initialize in the open-effect for both editing (`editing.strength ?? 3`) and create (3) branches.
- Pass `strength` in both create and update mutate payloads.
- Insert the strength selector (5 round buttons + descriptor) between the Why textarea and the Tags input, per spec markup.

## 4. `src/components/ConnectionCard.tsx`

Full replacement, keeping `EndpointInfo` export and props signature:

- Card shell uses `borderLeft: 5px solid var(--forest)` on the rounded card.
- Local `STRENGTH_CFG` map (1→5) controlling `gap`, `lineH`, `lineOpacity`, `dotSize`.
- `dotColor(kind)` → `var(--honey)` for `reference_book`, else `var(--forest)`.
- Connector row: `items-stretch`, two endpoint cells with soft green fill, dots absolutely positioned on inner edges at 50%, middle connector div sized by `cfg.gap` with a centered horizontal bar.
- Why text unchanged.
- Footer: tags + new strength pill (`STRENGTH: N`) on the left; existing edit/delete buttons on the right.

## 5. `src/components/WebGraph.tsx`

- `Link` type gains `strength?: number`.
- `linkWidth`: `0.8 + (s-1)*0.8`.
- `linkColor`: opacity `0.12 + (s-1)*0.14`, multiplied by `0.2` when either endpoint is dimmed.
- Add `linkStrength` prop: `0.1 + (s-1)*0.18`.

## 6. `src/routes/_authenticated/weave.tsx`

In the graph `useMemo`:
- Add `const maxStrength = new Map<string, number>()` alongside `counts`.
- In the connections loop, after `counts.set(...)`, track `Math.max(prev, c.strength ?? 3)` per pair key.
- Links output adds `strength: maxStrength.get(key) ?? 3`.

## Execution order

1. Apply migration (column + seed replacement) — wait for approval & regenerated types.
2. Edit the five source files.
3. Run `bun run test` once (expect 18/18).

## Verification checklist

- Cards render new design; strength badge visible.
- Modal selector defaults to 3, descriptor updates, edit pre-populates.
- Strength-5 card: narrow gap, thick dark line, large dots.
- Web graph: strength-5 edges thick/opaque, strength-1 faint; high-strength pairs cluster closer.
- Sample reset works; seeded connections show strengths.
- `bun run test` passes 18/18.
