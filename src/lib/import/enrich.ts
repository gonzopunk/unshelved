import type { ImportRow } from "./types";

const CACHE_KEY = "unshelved.import.olcache.v1";

type CacheHit = {
  coverUrl: string | null;
  totalPages: number | null;
};

function loadCache(): Record<string, CacheHit> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) ?? "{}"); } catch { return {}; }
}
function saveCache(c: Record<string, CacheHit>) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(c)); } catch { /* quota */ }
}

function rowKey(r: ImportRow): string {
  return r.isbn ? `isbn:${r.isbn}` : `q:${r.title.toLowerCase()}|${(r.author ?? "").toLowerCase()}`;
}

async function lookupOnce(r: ImportRow, signal: AbortSignal): Promise<CacheHit> {
  if (r.isbn) {
    const url = `https://openlibrary.org/api/books?bibkeys=ISBN:${encodeURIComponent(r.isbn)}&format=json&jscmd=data`;
    const res = await fetch(url, { signal });
    if (!res.ok) return { coverUrl: null, totalPages: null };
    const json = await res.json();
    const entry = json[`ISBN:${r.isbn}`];
    if (!entry) return { coverUrl: null, totalPages: null };
    return {
      coverUrl: entry.cover?.large ?? entry.cover?.medium ?? null,
      totalPages: typeof entry.number_of_pages === "number" ? entry.number_of_pages : null,
    };
  }
  const q = `${r.title} ${r.author ?? ""}`.trim();
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=1&fields=cover_i,number_of_pages_median`;
  const res = await fetch(url, { signal });
  if (!res.ok) return { coverUrl: null, totalPages: null };
  const json = await res.json();
  const doc = json.docs?.[0];
  if (!doc) return { coverUrl: null, totalPages: null };
  return {
    coverUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : null,
    totalPages: typeof doc.number_of_pages_median === "number" ? doc.number_of_pages_median : null,
  };
}

export type EnrichOptions = {
  fetchCovers: boolean;
  overwritePages: boolean;
  onProgress?: (done: number, total: number) => void;
  signal?: AbortSignal;
};

/** Enrich a list of rows in batches of 10. Returns a fresh array. */
export async function enrichRows(rows: ImportRow[], opts: EnrichOptions): Promise<ImportRow[]> {
  const cache = loadCache();
  const out = rows.map((r) => ({ ...r }));
  const indices = out.map((r, i) => ({ r, i })).filter(({ r }) => !r.enrichTried);
  const total = indices.length;
  let done = 0;

  for (let i = 0; i < indices.length; i += 10) {
    if (opts.signal?.aborted) break;
    const chunk = indices.slice(i, i + 10);
    await Promise.all(chunk.map(async ({ r, i: idx }) => {
      try {
        const key = rowKey(r);
        let hit = cache[key];
        if (!hit) {
          hit = await lookupOnce(r, opts.signal ?? new AbortController().signal);
          cache[key] = hit;
        }
        const next = { ...out[idx], enrichTried: true };
        if (opts.fetchCovers && hit.coverUrl && !next.coverUrl) {
          next.coverUrl = hit.coverUrl;
          // Try palette extraction; non-blocking failure is fine.
          try {
            const pal = await extractCoverPalette(hit.coverUrl);
            if (pal) {
              next.coverColor = pal.dominant;
              next.coverSecondaryColor = pal.secondary;
              next.coverTextColor = pal.text;
              next.bookmarkColor = pal.bookmark;
            }
          } catch { /* ignore */ }
        }
        if (hit.totalPages && (opts.overwritePages || !next.totalPages)) {
          next.totalPages = hit.totalPages;
        }
        out[idx] = next;
      } catch {
        out[idx] = { ...out[idx], enrichTried: true };
      } finally {
        done++;
        opts.onProgress?.(done, total);
      }
    }));
  }
  saveCache(cache);
  return out;
}
