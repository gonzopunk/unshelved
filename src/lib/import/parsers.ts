import Papa from "papaparse";
import type { BookFormat, BookStatus } from "@/lib/queries";
import type { ColumnMap, FieldKey, ImportRow, ImportSource } from "./types";

// ────────────────────────────────────────────────────────────
// Helpers

let _uid = 0;
const nextUid = () => `r${Date.now().toString(36)}${(_uid++).toString(36)}`;

export function emptyRow(): ImportRow {
  return {
    uid: nextUid(),
    title: "",
    author: null,
    isbn: null,
    format: "print",
    status: "want",
    rating: null,
    totalPages: null,
    currentPage: null,
    startedAt: null,
    finishedAt: null,
    tags: [],
    note: null,
    coverUrl: null,
    coverColor: null,
    coverSecondaryColor: null,
    coverTextColor: null,
    bookmarkColor: null,
    enrichTried: false,
    selected: true,
    duplicate: false,
    matchedBookId: null,
  };
}

const num = (v: unknown): number | null => {
  if (v == null || v === "") return null;
  const n = Number(String(v).replace(/[^\d.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
};
const trimOrNull = (v: unknown): string | null => {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
};
const isoDate = (v: unknown): string | null => {
  const s = trimOrNull(v);
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString();
};

// ISBN cleanup — strip the leading `=` and quote chars Goodreads uses.
const cleanIsbn = (v: unknown): string | null => {
  const s = trimOrNull(v);
  if (!s) return null;
  const cleaned = s.replace(/[="\s-]/g, "");
  return cleaned.length >= 10 ? cleaned : null;
};

const goodreadsStatus: Record<string, BookStatus> = {
  "to-read": "want",
  "currently-reading": "reading",
  "read": "liked", // default, user can override per-row
};

const storygraphStatus: Record<string, BookStatus> = {
  "to-read": "want",
  "currently-reading": "reading",
  "read": "liked",
  "did-not-finish": "dnf",
};

export function ratingToStatus(rating: number | null, fallback: BookStatus): BookStatus {
  if (rating == null) return fallback;
  if (rating >= 5) return "loved";
  if (rating >= 4) return "liked";
  if (rating >= 3) return "meh";
  if (rating >= 1) return "dnf";
  return fallback;
}

function detectFormat(s: string | null): BookFormat {
  if (!s) return "print";
  const v = s.toLowerCase();
  if (v.includes("audio")) return "audiobook";
  if (v.includes("ebook") || v.includes("kindle") || v.includes("digital")) return "ebook";
  return "print";
}

// ────────────────────────────────────────────────────────────
// CSV parsing

export function parseCsvText(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
    transformHeader: (h) => h.trim(),
  });
  const headers = (result.meta.fields ?? []).map((h) => String(h));
  return { headers, rows: result.data ?? [] };
}

// Auto column detection for known CSVs and best-effort generic.
export function detectColumnMap(headers: string[], source: ImportSource): ColumnMap {
  const lower = headers.map((h) => h.toLowerCase());
  const find = (...needles: string[]): string | undefined => {
    for (const n of needles) {
      const idx = lower.findIndex((h) => h === n || h.includes(n));
      if (idx !== -1) return headers[idx];
    }
    return undefined;
  };
  if (source === "goodreads") {
    return {
      title: find("title"),
      author: find("author"),
      isbn: find("isbn13", "isbn"),
      rating: find("my rating"),
      totalPages: find("number of pages"),
      status: find("exclusive shelf"),
      tags: find("bookshelves"),
      startedAt: find("date added"),
      finishedAt: find("date read"),
      note: find("my review"),
    };
  }
  if (source === "storygraph") {
    return {
      title: find("title"),
      author: find("authors", "author"),
      isbn: find("isbn"),
      rating: find("star rating"),
      status: find("read status"),
      format: find("format"),
      totalPages: find("number of pages"),
      startedAt: find("date started"),
      finishedAt: find("date finished", "last date read"),
      tags: find("tags"),
      note: find("review"),
    };
  }
  return {
    title: find("title"),
    author: find("author"),
    isbn: find("isbn"),
    rating: find("rating", "stars"),
    status: find("shelf", "status"),
    format: find("format"),
    totalPages: find("pages", "page count"),
    startedAt: find("started"),
    finishedAt: find("finished"),
    tags: find("tag", "shelves"),
    note: find("note", "review"),
  };
}

export function applyMap(
  rows: Record<string, string>[],
  map: ColumnMap,
  source: ImportSource,
): ImportRow[] {
  const out: ImportRow[] = [];
  for (const raw of rows) {
    const get = (k: FieldKey) => (map[k] ? raw[map[k]!] : undefined);
    const title = trimOrNull(get("title"));
    if (!title) continue;
    const author = trimOrNull(get("author"));
    const isbn = cleanIsbn(get("isbn"));
    const ratingNum = num(get("rating"));
    const rating = ratingNum != null ? Math.min(5, Math.max(0, ratingNum)) : null;
    const formatStr = trimOrNull(get("format"));
    const statusRaw = (trimOrNull(get("status")) ?? "").toLowerCase();
    const baseStatus =
      source === "goodreads" ? (goodreadsStatus[statusRaw] ?? "want")
      : source === "storygraph" ? (storygraphStatus[statusRaw] ?? "want")
      : (statusRaw as BookStatus) || "want";
    // For finished items, map rating → finer status when available.
    const status =
      baseStatus === "liked" && rating != null && rating > 0
        ? ratingToStatus(rating, baseStatus)
        : baseStatus;
    const tagsRaw = trimOrNull(get("tags")) ?? "";
    const tags = tagsRaw
      .split(/[,;|]/)
      .map((t) => t.trim())
      .filter((t) => t && !["read", "to-read", "currently-reading"].includes(t.toLowerCase()));
    out.push({
      ...emptyRow(),
      title,
      author,
      isbn,
      format: detectFormat(formatStr),
      status,
      rating,
      totalPages: num(get("totalPages")),
      currentPage: num(get("currentPage")),
      startedAt: isoDate(get("startedAt")),
      finishedAt: isoDate(get("finishedAt")),
      tags,
      note: trimOrNull(get("note")),
    });
  }
  return out;
}

// ────────────────────────────────────────────────────────────
// Paste parser — "Title — Author" or ISBN per line.

const ISBN_RE = /^(?:97[89])?\d{9}[\dXx]$/;

export function parsePaste(text: string): ImportRow[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const out: ImportRow[] = [];
  for (const line of lines) {
    const cleaned = line.replace(/-/g, "");
    if (ISBN_RE.test(cleaned)) {
      out.push({ ...emptyRow(), title: line, isbn: cleaned });
      continue;
    }
    const sep = line.match(/[—–\-:|]/);
    if (sep) {
      const idx = line.indexOf(sep[0]);
      const title = line.slice(0, idx).trim();
      const author = line.slice(idx + sep[0].length).trim();
      if (title) out.push({ ...emptyRow(), title, author: author || null });
    } else {
      out.push({ ...emptyRow(), title: line });
    }
  }
  return out;
}
