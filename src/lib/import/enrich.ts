import type { ImportRow } from "./types";

const CACHE_KEY = "unshelved.import.olcache.v2";

type CacheHit = {
  coverUrl: string | null;
  totalPages: number | null;
  publicationYear: number | null;
  publisher: string | null;
  isbn: string | null;
  description: string | null;
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

function parseYear(s: unknown): number | null {
  if (typeof s !== "string") return null;
  const m = s.match(/\b(\d{4})\b/);
  if (!m) return null;
  const y = parseInt(m[1], 10);
  return y >= 1000 && y <= 2100 ? y : null;
}

const EMPTY: CacheHit = {
  coverUrl: null, totalPages: null, publicationYear: null,
  publisher: null, isbn: null, description: null,
};

async function lookupOnce(r: ImportRow, signal: AbortSignal): Promise<CacheHit> {
  if (r.isbn) {
    const url = `https://openlibrary.org/api/books?bibkeys=ISBN:${encodeURIComponent(r.isbn)}&format=json&jscmd=data`;
    const res = await fetch(url, { signal });
    if (!res.ok) return EMPTY;
    const json = await res.json();
    const entry = json[`ISBN:${r.isbn}`];
    if (!entry) return EMPTY;
    const desc =
      (typeof entry.excerpts?.[0]?.text === "string" && entry.excerpts[0].text) ||
      (typeof entry.notes === "string" ? entry.notes : entry.notes?.value) ||
      null;
    return {
      coverUrl: entry.cover?.large ?? entry.cover?.medium ?? null,
      totalPages: typeof entry.number_of_pages === "number" ? entry.number_of_pages : null,
      publicationYear: parseYear(entry.publish_date),
      publisher: entry.publishers?.[0]?.name ?? null,
      isbn: entry.identifiers?.isbn_13?.[0] ?? entry.identifiers?.isbn_10?.[0] ?? r.isbn,
      description: desc,
    };
  }
  const q = `${r.title} ${r.author ?? ""}`.trim();
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=1&fields=cover_i,number_of_pages_median,first_publish_year,publisher,isbn`;
  const res = await fetch(url, { signal });
  if (!res.ok) return EMPTY;
  const json = await res.json();
  const doc = json.docs?.[0];
  if (!doc) return EMPTY;
  return {
    coverUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : null,
    totalPages: typeof doc.number_of_pages_median === "number" ? doc.number_of_pages_median : null,
    publicationYear: typeof doc.first_publish_year === "number" ? doc.first_publish_year : null,
    publisher: Array.isArray(doc.publisher) && doc.publisher.length ? String(doc.publisher[0]) : null,
    isbn: Array.isArray(doc.isbn) && doc.isbn.length ? String(doc.isbn[0]) : null,
    description: null,
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
        }
        if (hit.totalPages && (opts.overwritePages || !next.totalPages)) {
          next.totalPages = hit.totalPages;
        }
        if (hit.publicationYear && !next.publicationYear) next.publicationYear = hit.publicationYear;
        if (hit.publisher && !next.publisher) next.publisher = hit.publisher;
        if (hit.isbn && !next.isbn) next.isbn = hit.isbn;
        if (hit.description && !next.description) next.description = hit.description;
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
