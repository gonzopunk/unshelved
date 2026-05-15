## Interactive star rating on Recently finished

Two-file edit. Spec is fully specified by the user; this is a direct implementation.

### 1. `src/lib/queries.ts`
Add `useUpdateRating` next to `useUpdateStatus`:
```ts
export function useUpdateRating() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, rating }: { id: string; rating: number }) => {
      const { error } = await supabase.from("user_books").update({ rating }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["library"] });
      qc.invalidateQueries({ queryKey: ["book"] });
    },
  });
}
```
No other hook touched.

### 2. `src/routes/_authenticated/index.tsx`
- Import `useUpdateRating` from `@/lib/queries`.
- In `Home`: `const updateRating = useUpdateRating();`
- In the `fin-row` star block, replace the 5 static `<span className="star ...">` elements with 5 interactive `<button className="star-btn ...">` elements per spec, wired to `updateRating.mutate({ id: ub.id, rating: n })` (guarded on `ub?.id`).
- In `HomepageStyles`, remove `.star` / `.star.on` rules and add `.star-btn`, `.star-btn.on`, `.star-btn:hover` per spec (8px filled circle glyph, honey color when on, terra-ish hover, transition 0.12s).

### 3. Verification
`bun run test` — all 18 tests pass. No schema changes. Only the two files modified.
