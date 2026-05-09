import type { BookWithShelf } from "@/lib/queries";
import type { ImportRow } from "./types";

export function normKey(title: string, author: string | null): string {
  const t = title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
  const a = (author ?? "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
  return `${t}|${a}`;
}

export type DedupeMaps = {
  byKey: Map<string, BookWithShelf>;
};

export function buildDedupeMaps(library: BookWithShelf[]): DedupeMaps {
  const byKey = new Map<string, BookWithShelf>();
  for (const b of library) byKey.set(normKey(b.title, b.author), b);
  return { byKey };
}

/** Mark each row as duplicate against existing library OR against earlier rows. */
export function annotateDuplicates(rows: ImportRow[], maps: DedupeMaps): ImportRow[] {
  const seen = new Set<string>();
  return rows.map((r) => {
    const k = normKey(r.title, r.author);
    const inLib = maps.byKey.get(k);
    const inBatch = seen.has(k);
    seen.add(k);
    const duplicate = !!inLib || inBatch;
    return {
      ...r,
      duplicate,
      matchedBookId: inLib?.id ?? null,
      selected: !duplicate && r.title.trim().length > 0,
    };
  });
}
