import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export type EntryKind = "note" | "quote";

export type NotationBook = {
  id: string;
  title: string;
  author: string | null;
  cover_color: string | null;
  cover_secondary_color: string | null;
};

export type NotationEntry = {
  kind: EntryKind;
  id: string;
  bookId: string;
  body: string;
  pageNumber: number | null;
  createdAt: string;
  book: NotationBook;
  tagIds: string[];
  /** Map of axis key -> values from book_axis_values for this entry's book */
  axisValues: Record<string, string[]>;
};

export type Tag = { id: string; name: string; color: string | null };
export type TagAxis = { id: string; key: string; label: string };

export type NotationsData = {
  entries: NotationEntry[];
  tags: Tag[];
  axes: TagAxis[];
  /** authors present in entries */
  authors: string[];
  /** values from the reserved axis 'series' (key === 'series') */
  seriesValues: string[];
  /** map axisKey -> sorted unique values present across books with entries */
  axisValuesByKey: Record<string, string[]>;
  books: NotationBook[];
};

export function useNotations() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["notations", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<NotationsData> => {
      const [notesRes, hlRes, booksRes, tagsRes, btRes, axesRes, bavRes] = await Promise.all([
        supabase.from("notes").select("id, book_id, content, created_at"),
        supabase.from("highlights").select("id, book_id, quote_text, page_number, created_at"),
        supabase.from("books").select("id, title, author, cover_color, cover_secondary_color"),
        supabase.from("tags").select("id, name, color"),
        supabase.from("book_tags").select("book_id, tag_id"),
        supabase.from("tag_axes").select("id, key, label"),
        supabase.from("book_axis_values").select("book_id, axis_id, values"),
      ]);
      for (const r of [notesRes, hlRes, booksRes, tagsRes, btRes, axesRes, bavRes]) {
        if (r.error) throw r.error;
      }

      const books = (booksRes.data ?? []) as NotationBook[];
      const bookById = new Map(books.map((b) => [b.id, b]));
      const tags = (tagsRes.data ?? []) as Tag[];
      const axes = (axesRes.data ?? []) as TagAxis[];
      const axisById = new Map(axes.map((a) => [a.id, a]));

      // tags per book
      const tagsByBook = new Map<string, string[]>();
      for (const row of btRes.data ?? []) {
        const arr = tagsByBook.get(row.book_id) ?? [];
        arr.push(row.tag_id);
        tagsByBook.set(row.book_id, arr);
      }
      // axis values per book: { [axisKey]: string[] }
      const axisValsByBook = new Map<string, Record<string, string[]>>();
      for (const row of bavRes.data ?? []) {
        const axis = axisById.get(row.axis_id);
        if (!axis) continue;
        const obj = axisValsByBook.get(row.book_id) ?? {};
        obj[axis.key] = (row.values as string[] | null) ?? [];
        axisValsByBook.set(row.book_id, obj);
      }

      const make = (
        kind: EntryKind,
        id: string,
        bookId: string,
        body: string,
        pageNumber: number | null,
        createdAt: string,
      ): NotationEntry | null => {
        const book = bookById.get(bookId);
        if (!book) return null;
        return {
          kind,
          id,
          bookId,
          body,
          pageNumber,
          createdAt,
          book,
          tagIds: tagsByBook.get(bookId) ?? [],
          axisValues: axisValsByBook.get(bookId) ?? {},
        };
      };

      const entries: NotationEntry[] = [];
      for (const n of notesRes.data ?? []) {
        const e = make("note", n.id, n.book_id, n.content, null, n.created_at);
        if (e) entries.push(e);
      }
      for (const h of hlRes.data ?? []) {
        const e = make("quote", h.id, h.book_id, h.quote_text, h.page_number ?? null, h.created_at);
        if (e) entries.push(e);
      }

      const authors = Array.from(
        new Set(entries.map((e) => e.book.author).filter((a): a is string => !!a)),
      ).sort((a, b) => a.localeCompare(b));

      const axisValuesByKey: Record<string, Set<string>> = {};
      for (const e of entries) {
        for (const [k, vs] of Object.entries(e.axisValues)) {
          axisValuesByKey[k] ??= new Set();
          for (const v of vs) axisValuesByKey[k].add(v);
        }
      }
      const axisValuesByKeyOut: Record<string, string[]> = {};
      for (const [k, set] of Object.entries(axisValuesByKey)) {
        axisValuesByKeyOut[k] = Array.from(set).sort((a, b) => a.localeCompare(b));
      }

      return {
        entries,
        tags,
        axes,
        authors,
        seriesValues: axisValuesByKeyOut["series"] ?? [],
        axisValuesByKey: axisValuesByKeyOut,
        books: Array.from(new Set(entries.map((e) => e.bookId)))
          .map((id) => bookById.get(id)!)
          .filter(Boolean)
          .sort((a, b) => a.title.localeCompare(b.title)),
      };
    },
  });
}

// ============= Filtering / Grouping / Search =============

export type Grouping =
  | "newest"
  | "oldest"
  | "book"
  | "author"
  | "series"
  | "axis"
  | "month";

export type Display = "stream" | "scroll";

export type NotationFilters = {
  bookIds: string[];
  authorNames: string[];
  seriesValues: string[];
  tagIds: string[];
  /** "key:value" e.g. "mood:cozy" */
  axisFilter: string | null;
  dateFrom: string | null;
  dateTo: string | null;
  kind: "both" | "notes" | "quotes";
  q: string;
};

export const emptyFilters: NotationFilters = {
  bookIds: [],
  authorNames: [],
  seriesValues: [],
  tagIds: [],
  axisFilter: null,
  dateFrom: null,
  dateTo: null,
  kind: "both",
  q: "",
};

export function applyFilters(entries: NotationEntry[], f: NotationFilters): NotationEntry[] {
  const q = f.q.trim().toLowerCase();
  let axisKey: string | null = null;
  let axisVal: string | null = null;
  if (f.axisFilter && f.axisFilter.includes(":")) {
    const [k, ...rest] = f.axisFilter.split(":");
    axisKey = k;
    axisVal = rest.join(":");
  }
  const from = f.dateFrom ? new Date(f.dateFrom).getTime() : null;
  const to = f.dateTo ? new Date(f.dateTo).getTime() + 86_400_000 : null;
  return entries.filter((e) => {
    if (f.kind === "notes" && e.kind !== "note") return false;
    if (f.kind === "quotes" && e.kind !== "quote") return false;
    if (f.bookIds.length && !f.bookIds.includes(e.bookId)) return false;
    if (f.authorNames.length && (!e.book.author || !f.authorNames.includes(e.book.author))) return false;
    if (f.seriesValues.length) {
      const series = e.axisValues["series"] ?? [];
      if (!series.some((s) => f.seriesValues.includes(s))) return false;
    }
    if (f.tagIds.length && !f.tagIds.some((t) => e.tagIds.includes(t))) return false;
    if (axisKey && axisVal !== null) {
      const vs = e.axisValues[axisKey] ?? [];
      if (!vs.includes(axisVal)) return false;
    }
    if (from !== null) {
      const t = new Date(e.createdAt).getTime();
      if (t < from) return false;
    }
    if (to !== null) {
      const t = new Date(e.createdAt).getTime();
      if (t > to) return false;
    }
    if (q) {
      if (!e.body.toLowerCase().includes(q) &&
          !(e.book.title.toLowerCase().includes(q)) &&
          !((e.book.author ?? "").toLowerCase().includes(q))) return false;
    }
    return true;
  });
}

export type EntryGroup = {
  key: string;
  label: string;
  /** optional accent color for header (e.g. cover swatch) */
  accent?: string | null;
  subLabel?: string | null;
  entries: NotationEntry[];
};

export function groupEntries(
  entries: NotationEntry[],
  grouping: Grouping,
  axisKey?: string | null,
): EntryGroup[] {
  if (grouping === "newest" || grouping === "oldest") {
    const sorted = [...entries].sort((a, b) =>
      grouping === "newest"
        ? +new Date(b.createdAt) - +new Date(a.createdAt)
        : +new Date(a.createdAt) - +new Date(b.createdAt),
    );
    return [{ key: "all", label: "", entries: sorted }];
  }
  const byKey = new Map<string, EntryGroup>();
  const push = (key: string, label: string, e: NotationEntry, extras?: Partial<EntryGroup>) => {
    let g = byKey.get(key);
    if (!g) {
      g = { key, label, entries: [], ...extras };
      byKey.set(key, g);
    }
    g.entries.push(e);
  };
  for (const e of entries) {
    if (grouping === "book") {
      push(e.bookId, e.book.title, e, { subLabel: e.book.author, accent: e.book.cover_color });
    } else if (grouping === "author") {
      const a = e.book.author ?? "Unknown";
      push(`author:${a}`, a, e);
    } else if (grouping === "series") {
      const series = e.axisValues["series"] ?? [];
      if (series.length === 0) push("series:none", "Unsorted", e);
      else for (const s of series) push(`series:${s}`, s, e);
    } else if (grouping === "axis") {
      const k = axisKey || "";
      const vs = e.axisValues[k] ?? [];
      if (vs.length === 0) push("axis:none", "Unsorted", e);
      else for (const v of vs) push(`axis:${v}`, v, e);
    } else if (grouping === "month") {
      const d = new Date(e.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
      push(key, label, e);
    }
  }
  // sort entries within each group by newest
  for (const g of byKey.values()) {
    g.entries.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }
  // sort groups: month desc, otherwise by label
  const out = Array.from(byKey.values());
  if (grouping === "month") out.sort((a, b) => (a.key < b.key ? 1 : -1));
  else out.sort((a, b) => a.label.localeCompare(b.label));
  return out;
}

export function useFilteredGrouped(
  filters: NotationFilters,
  grouping: Grouping,
  axisKey: string | null,
  data: NotationsData | undefined,
) {
  return useMemo(() => {
    if (!data) return { groups: [] as EntryGroup[], total: 0 };
    const filtered = applyFilters(data.entries, filters);
    const groups = groupEntries(filtered, grouping, axisKey);
    return { groups, total: filtered.length };
  }, [data, filters, grouping, axisKey]);
}
