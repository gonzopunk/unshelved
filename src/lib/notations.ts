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
  /** Map of axis key -> values from book_axis_values for this entry's book */
  axisValues: Record<string, string[]>;
};

export type NotationsData = {
  entries: NotationEntry[];
  /** authors present in entries */
  authors: string[];
  /** values from the reserved axis 'series' */
  seriesValues: string[];
  books: NotationBook[];
};

export function useNotations() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["notations", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<NotationsData> => {
      const [notesRes, hlRes, booksRes, axesRes, bavRes] = await Promise.all([
        supabase.from("notes").select("id, book_id, content, created_at"),
        supabase.from("highlights").select("id, book_id, quote_text, page_number, created_at"),
        supabase.from("books").select("id, title, author, cover_color, cover_secondary_color"),
        supabase.from("tag_axes").select("id, key, label"),
        supabase.from("book_axis_values").select("book_id, axis_id, values"),
      ]);
      for (const r of [notesRes, hlRes, booksRes, axesRes, bavRes]) {
        if (r.error) throw r.error;
      }

      const books = (booksRes.data ?? []) as NotationBook[];
      const bookById = new Map(books.map((b) => [b.id, b]));
      const axes = (axesRes.data ?? []) as { id: string; key: string; label: string }[];
      const axisById = new Map(axes.map((a) => [a.id, a]));

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
          kind, id, bookId, body, pageNumber, createdAt, book,
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

      const seriesSet = new Set<string>();
      for (const e of entries) {
        for (const v of e.axisValues["series"] ?? []) seriesSet.add(v);
      }

      return {
        entries,
        authors,
        seriesValues: Array.from(seriesSet).sort((a, b) => a.localeCompare(b)),
        books: Array.from(new Set(entries.map((e) => e.bookId)))
          .map((id) => bookById.get(id))
          .filter((b): b is NotationBook => b !== undefined)
          .sort((a, b) => a.title.localeCompare(b.title)),
      };
    },
  });
}

// ============= Filtering / Sorting =============

export type Sort = "newest" | "oldest";

export type NotationFilters = {
  bookIds: string[];
  authorNames: string[];
  seriesValues: string[];
  dateFrom: string | null;
  dateTo: string | null;
  kind: "both" | "notes" | "quotes";
  q: string;
};

export const emptyFilters: NotationFilters = {
  bookIds: [],
  authorNames: [],
  seriesValues: [],
  dateFrom: null,
  dateTo: null,
  kind: "both",
  q: "",
};

export function applyFilters(entries: NotationEntry[], f: NotationFilters): NotationEntry[] {
  const q = f.q.trim().toLowerCase();
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
    if (from !== null && new Date(e.createdAt).getTime() < from) return false;
    if (to !== null && new Date(e.createdAt).getTime() > to) return false;
    if (q) {
      if (!e.body.toLowerCase().includes(q) &&
          !e.book.title.toLowerCase().includes(q) &&
          !((e.book.author ?? "").toLowerCase().includes(q))) return false;
    }
    return true;
  });
}

export function sortEntries(entries: NotationEntry[], sort: Sort): NotationEntry[] {
  return [...entries].sort((a, b) =>
    sort === "newest"
      ? +new Date(b.createdAt) - +new Date(a.createdAt)
      : +new Date(a.createdAt) - +new Date(b.createdAt),
  );
}

export function useFilteredSorted(
  filters: NotationFilters,
  sort: Sort,
  data: NotationsData | undefined,
) {
  return useMemo(() => {
    if (!data) return { entries: [] as NotationEntry[], total: 0 };
    const filtered = applyFilters(data.entries, filters);
    return { entries: sortEntries(filtered, sort), total: filtered.length };
  }, [data, filters, sort]);
}
