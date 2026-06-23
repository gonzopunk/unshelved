import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { Library as LibraryIcon } from "lucide-react";
import { useLibrary, useBookTagsMap, useBookAxisMap } from "@/lib/queries";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import LibraryFilters from "@/components/library/LibraryFilters";
import LibraryToolbar from "@/components/library/LibraryToolbar";
import LibraryGrid from "@/components/library/LibraryGrid";
import LibraryList from "@/components/library/LibraryList";
import LibraryBoard from "@/components/library/LibraryBoard";
import ActiveFilters from "@/components/library/ActiveFilters";
import {
  filterLibrary, sortLibrary,
  searchToFilters, filtersToSearch,
  activeFilterCount,
  STATUS_LABELS, FORMAT_LABELS,
  type LibrarySearch, type LibraryFilters as F,
  type SortKey, type SortDir, type ViewMode,
} from "@/lib/library-filter";

export const Route = createFileRoute("/_authenticated/library")({
  validateSearch: (search: Record<string, unknown>): LibrarySearch & {
    sort?: SortKey; dir?: SortDir; view?: ViewMode;
  } => {
    const s = search as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const k of [
      "q", "status", "format", "author", "tags", "axis",
      "dateFrom", "dateTo", "sort", "dir", "view",
    ] as const) {
      if (typeof s[k] === "string" && s[k]) out[k] = s[k];
    }
    if (typeof s.rating === "number") out.rating = s.rating;
    else if (typeof s.rating === "string" && s.rating) {
      const n = Number(s.rating);
      if (!Number.isNaN(n)) out.rating = n;
    }
    if (s.paused === 1 || s.paused === "1" || s.paused === true) out.paused = 1;
    return out;
  },
  head: () => ({ meta: [{ title: "Library — Unshelved" }] }),
  component: LibraryPage,
});

function LibraryPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/_authenticated/library" });
  const filters = useMemo(() => searchToFilters(search), [search]);
  const sort: SortKey = (search.sort as SortKey) ?? "added";
  const dir: SortDir = (search.dir as SortDir) ?? "desc";
  const view: ViewMode = (search.view as ViewMode) ?? "grid";

  const { data: library = [], isLoading } = useLibrary();
  const { data: bookTags = {} } = useBookTagsMap();
  const { data: bookAxes = {} } = useBookAxisMap();

  const { user } = useAuth();
  const { data: axisDefs = [] } = useQuery({
    queryKey: ["tag-axes-list", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tag_axes")
        .select("key, label, kind, values, scale_min, scale_max")
        .order("position");
      if (error) throw error;
      return data ?? [];
    },
  });

  const axisOptions = useMemo(() => {
    return axisDefs
      .map((a) => {
        const present = new Set<string>();
        Object.values(bookAxes).forEach((rows) =>
          rows.forEach((r) => r.key === a.key && present.add(r.value)),
        );
        const values = a.values?.length
          ? a.values.filter((v) => present.has(v))
          : [...present].sort();
        return { key: a.key, label: a.label, values };
      })
      .filter((a) => a.values.length > 0);
  }, [axisDefs, bookAxes]);

  const writeSearch = (patch: Record<string, unknown>) =>
    navigate({
      to: ".",
      search: (prev: Record<string, unknown>) => {
        const next = { ...prev, ...patch };
        for (const [k, v] of Object.entries(next)) {
          if (v === undefined || v === null || v === "" || v === 0) delete (next as Record<string, unknown>)[k];
        }
        if ((next as Record<string, unknown>).sort === "added") delete (next as Record<string, unknown>).sort;
        if ((next as Record<string, unknown>).dir === "desc") delete (next as Record<string, unknown>).dir;
        if ((next as Record<string, unknown>).view === "grid") delete (next as Record<string, unknown>).view;
        return next;
      },
      replace: true,
    } as never);

  const onFiltersChange = (patch: Partial<F>) => {
    const merged = { ...filters, ...patch };
    const next = filtersToSearch(merged);
    writeSearch({
      q: next.q, status: next.status, format: next.format,
      author: next.author, tags: next.tags, axis: next.axis,
      rating: next.rating, dateFrom: next.dateFrom, dateTo: next.dateTo,
      paused: next.paused,
    });
  };

  const filtered = useMemo(
    () => filterLibrary(library, filters, { bookTags, bookAxes }),
    [library, filters, bookTags, bookAxes],
  );
  const sorted = useMemo(() => sortLibrary(filtered, sort, dir), [filtered, sort, dir]);

  const chips = [
    filters.q && {
      key: "q", label: `“${filters.q}”`,
      onRemove: () => onFiltersChange({ q: "" }),
    },
    ...filters.status.map((s) => ({
      key: `status-${s}`, label: `Status: ${STATUS_LABELS[s]}`,
      onRemove: () => onFiltersChange({ status: filters.status.filter((x) => x !== s) }),
    })),
    filters.format && {
      key: "format", label: `Format: ${FORMAT_LABELS[filters.format]}`,
      onRemove: () => onFiltersChange({ format: null }),
    },
    filters.author && {
      key: "author", label: `Author: ${filters.author}`,
      onRemove: () => onFiltersChange({ author: null }),
    },
    ...filters.tags.map((t) => ({
      key: `tag-${t}`, label: `Tag: ${t}`,
      onRemove: () => onFiltersChange({ tags: filters.tags.filter((x) => x !== t) }),
    })),
    ...filters.axis.map((a) => ({
      key: `axis-${a.key}-${a.value}`, label: `${a.key}: ${a.value}`,
      onRemove: () => onFiltersChange({ axis: filters.axis.filter((x) => !(x.key === a.key && x.value === a.value)) }),
    })),
    filters.rating != null && {
      key: "rating", label: `Rating: ${filters.rating}★`,
      onRemove: () => onFiltersChange({ rating: null }),
    },
    (filters.dateFrom || filters.dateTo) && {
      key: "date", label: `Finished: ${filters.dateFrom ?? "…"} → ${filters.dateTo ?? "…"}`,
      onRemove: () => onFiltersChange({ dateFrom: null, dateTo: null }),
    },
    filters.paused && {
      key: "paused", label: "Paused only",
      onRemove: () => onFiltersChange({ paused: false }),
    },
  ].filter(Boolean) as { key: string; label: string; onRemove: () => void }[];

  const clearAll = () =>
    writeSearch({
      q: undefined, status: undefined, format: undefined, author: undefined,
      tags: undefined, axis: undefined, rating: undefined,
      dateFrom: undefined, dateTo: undefined, paused: undefined,
    });

  return (
    <div className="max-w-7xl mx-auto px-6">
      <header className="mb-6">
        <h1 className="font-display text-4xl">Library</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-prose">
          Every book, every shelf — sliced any way you need it.
        </p>
      </header>

      {view !== "board" && (
        <div className="space-y-3 mb-6">
          <LibraryFilters
            filters={filters}
            onChange={onFiltersChange}
            library={library}
            bookTags={bookTags}
            axisOptions={axisOptions}
          />
          <ActiveFilters chips={chips} onClearAll={clearAll} />
        </div>
      )}

      <div className="mb-4">
        <LibraryToolbar
          count={sorted.length}
          total={library.length}
          sort={sort}
          dir={dir}
          view={view}
          onSortChange={(s, d) => writeSearch({ sort: s, dir: d })}
          onViewChange={(v) => writeSearch({ view: v })}
        />
      </div>

      <div className="pb-24">
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : library.length === 0 ? (
          <EmptyState
            title="Your library is empty"
            body="Add a book or import your existing library to get started."
            cta={
              <Link
                to="/settings/imports"
                className="inline-flex items-center gap-1.5 rounded-full bg-forest text-paper px-4 py-2 text-sm"
              >
                Import library
              </Link>
            }
          />
        ) : sorted.length === 0 ? (
          <EmptyState
            title="No books match these filters"
            body={`${activeFilterCount(filters)} filter(s) applied.`}
            cta={
              <button
                onClick={clearAll}
                className="inline-flex items-center gap-1.5 rounded-full bg-forest text-paper px-4 py-2 text-sm"
              >
                Reset filters
              </button>
            }
          />
        ) : view === "list" ? (
          <LibraryList books={sorted} />
        ) : (
          <LibraryGrid books={sorted} />
        )}
      </div>
    </div>
  );
}

function EmptyState({ title, body, cta }: { title: string; body: string; cta?: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-card shadow-paper p-12 text-center">
      <LibraryIcon className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
      <div className="font-display text-xl mb-1">{title}</div>
      <p className="text-sm text-muted-foreground mb-4">{body}</p>
      {cta}
    </div>
  );
}
