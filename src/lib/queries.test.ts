import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// queries.ts exports React Query hooks with inline queryKey arrays rather
// than exported key factories. Per WP3 instructions, do not refactor
// queries.ts — only assert what is already present. We do a source-level
// check so this test stays fully isolated from the Vite/SSR runtime
// (which @/ alias + Supabase imports require).
const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, "queries.ts"), "utf8");

describe("queries.ts load-bearing exports", () => {
  it("exports useLibrary", () => {
    expect(source).toMatch(/export function useLibrary\b/);
  });
  it("exports useProfile", () => {
    expect(source).toMatch(/export function useProfile\b/);
  });
  it("exports useBookDetail", () => {
    expect(source).toMatch(/export function useBookDetail\b/);
  });
});

describe("queries.ts query key domains", () => {
  it('library queryKey starts with "library"', () => {
    expect(source).toMatch(/queryKey:\s*\[\s*["']library["']/);
  });
  it('profile queryKey starts with "profile"', () => {
    expect(source).toMatch(/queryKey:\s*\[\s*["']profile["']/);
  });
  it('book detail queryKey starts with "book"', () => {
    expect(source).toMatch(/queryKey:\s*\[\s*["']book["']/);
  });
});
