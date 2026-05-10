import type { BookWithShelf, BookStatus, BookFormat } from "@/lib/queries";

export type SortKey = "added" | "title" | "author" | "rating" | "finished" | "progress";
export type SortDir = "asc" | "desc";
export type ViewMode = "grid" | "list";

export type LibraryFilters = {
  q: string;
  status: BookStatus[];           // multi
  format: BookFormat | null;      // single
  author: string | null;          // single (exact)
  tags: string[];                 // multi (tag names, lowercase compare)
  axis: { key: string; value: string }[]; // multi (axis_key:value)
  rating: number | null;          // 1..5
  dateFrom: string | null;        // ISO yyyy-mm-dd, finished_at >=
  dateTo: string | null;          // ISO yyyy-mm-dd, finished_at <=
  paused: boolean;                // optional flag
};

export const emptyLibraryFilters: LibraryFilters = {
  q: "",
  status: [],
  format: null,
  author: null,
  tags: [],
  axis: [],
  rating: null,
  dateFrom: null,
  dateTo: null,
  paused: false,
};

export type AxisRow = { axis_id: string; key: string; value: string };

export type LibraryCtx = {
  bookTags: Record<string, string[]>;        // bookId -> tag names (lowercased)
  bookAxes: Record<string, AxisRow[]>;       // bookId -> axis rows
};

export function filterLibrary(
  books: BookWithShelf[],
  f: LibraryFilters,
  ctx: LibraryCtx,
): BookWithShelf[] {
  const q = f.q.trim().toLowerCase();
  return books.filter((b) => {
    const ub = b.user_books[0];
    if (q) {
      const hay = `${b.title} ${b.author ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (f.format && b.format !== f.format) return false;
    if (f.author && (b.author ?? "") !== f.author) return false;
    if (f.status.length) {
      if (!ub || !f.status.includes(ub.status)) return false;
    }
    if (f.paused && !ub?.paused) return false;
    if (f.rating != null) {
      if ((ub?.rating ?? 0) !== f.rating) return false;
    }
    if (f.dateFrom || f.dateTo) {
      const fin = ub?.finished_at;
      if (!fin) return false;
      const t = fin.slice(0, 10);
      if (f.dateFrom && t < f.dateFrom) return false;
      if (f.dateTo && t > f.dateTo) return false;
    }
    if (f.tags.length) {
      const have = ctx.bookTags[b.id] ?? [];
      const want = f.tags.map((t) => t.toLowerCase());
      if (!want.every((t) => have.includes(t))) return false;
    }
    if (f.axis.length) {
      const have = ctx.bookAxes[b.id] ?? [];
      const ok = f.axis.every((a) =>
        have.some((r) => r.key === a.key && r.value === a.value),
      );
      if (!ok) return false;
    }
    return true;
  });
}

export function sortLibrary(
  books: BookWithShelf[],
  sort: SortKey,
  dir: SortDir,
): BookWithShelf[] {
  const m = dir === "asc" ? 1 : -1;
  const arr = [...books];
  arr.sort((a, b) => {
    const ua = a.user_books[0];
    const ub = b.user_books[0];
    let av: string | number = 0;
    let bv: string | number = 0;
    switch (sort) {
      case "title":
        av = a.title.toLowerCase();
        bv = b.title.toLowerCase();
        break;
      case "author":
        av = (a.author ?? "").toLowerCase();
        bv = (b.author ?? "").toLowerCase();
        break;
      case "rating":
        av = ua?.rating ?? 0;
        bv = ub?.rating ?? 0;
        break;
      case "finished":
        av = ua?.finished_at ?? "";
        bv = ub?.finished_at ?? "";
        break;
      case "progress":
        av = Number(ua?.progress_pct ?? 0);
        bv = Number(ub?.progress_pct ?? 0);
        break;
      case "added":
      default:
        av = a.created_at;
        bv = b.created_at;
        break;
    }
    if (av < bv) return -1 * m;
    if (av > bv) return 1 * m;
    return 0;
  });
  return arr;
}

/* ---------- URL <-> filters serialization ---------- */

export type LibrarySearch = Partial<{
  q: string;
  status: string;       // comma-separated
  format: BookFormat;
  author: string;
  tags: string;         // comma-separated
  axis: string;         // comma-separated key:value
  rating: number;
  dateFrom: string;
  dateTo: string;
  paused: 1;
  sort: SortKey;
  dir: SortDir;
  view: ViewMode;
}>;

const STATUS_VALUES: BookStatus[] = ["want", "reading", "later", "dnf", "loved", "liked", "meh"];

export function searchToFilters(s: LibrarySearch): LibraryFilters {
  const status = (s.status ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter((x) => STATUS_VALUES.includes(x as BookStatus)) as BookStatus[];
  const tags = (s.tags ?? "").split(",").map((x) => x.trim()).filter(Boolean);
  const axis = (s.axis ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .map((kv) => {
      const i = kv.indexOf(":");
      return i > 0 ? { key: kv.slice(0, i), value: kv.slice(i + 1) } : null;
    })
    .filter((x): x is { key: string; value: string } => !!x);
  return {
    ...emptyLibraryFilters,
    q: s.q ?? "",
    status,
    format: s.format ?? null,
    author: s.author ?? null,
    tags,
    axis,
    rating: s.rating ?? null,
    dateFrom: s.dateFrom ?? null,
    dateTo: s.dateTo ?? null,
    paused: !!s.paused,
  };
}

export function filtersToSearch(f: LibraryFilters): LibrarySearch {
  const s: LibrarySearch = {};
  if (f.q) s.q = f.q;
  if (f.status.length) s.status = f.status.join(",");
  if (f.format) s.format = f.format;
  if (f.author) s.author = f.author;
  if (f.tags.length) s.tags = f.tags.join(",");
  if (f.axis.length) s.axis = f.axis.map((a) => `${a.key}:${a.value}`).join(",");
  if (f.rating != null) s.rating = f.rating;
  if (f.dateFrom) s.dateFrom = f.dateFrom;
  if (f.dateTo) s.dateTo = f.dateTo;
  if (f.paused) s.paused = 1;
  return s;
}

export function activeFilterCount(f: LibraryFilters): number {
  let n = 0;
  if (f.q) n++;
  n += f.status.length;
  if (f.format) n++;
  if (f.author) n++;
  n += f.tags.length;
  n += f.axis.length;
  if (f.rating != null) n++;
  if (f.dateFrom || f.dateTo) n++;
  if (f.paused) n++;
  return n;
}

export const STATUS_LABELS: Record<BookStatus, string> = {
  want: "Want to read",
  reading: "Reading",
  later: "Later",
  dnf: "Did not finish",
  loved: "Loved",
  liked: "Liked",
  meh: "Meh",
};

export const FORMAT_LABELS: Record<BookFormat, string> = {
  print: "Print",
  ebook: "Ebook",
  audiobook: "Audiobook",
};
