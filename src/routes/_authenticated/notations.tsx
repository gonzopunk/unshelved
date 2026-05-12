import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Printer } from "lucide-react";
import { toast } from "sonner";
import FilterBar from "@/components/notations/FilterBar";
import EntryShell from "@/components/notations/EntryShell";
import ResurfacedHero from "@/components/notations/ResurfacedHero";
import ActiveFilters from "@/components/library/ActiveFilters";
import { exportEntryCard } from "@/components/notations/ExportCard";
import { useNotationsKeyboard } from "@/lib/notations-keyboard";
import {
  useNotations,
  useFilteredSorted,
  emptyFilters,
  type NotationFilters,
  type Sort,
} from "@/lib/notations";

export const Route = createFileRoute("/_authenticated/notations")({
  validateSearch: (search: Record<string, unknown>) => search,
  component: NotationsPage,
});

function NotationsPage() {
  const { data, isLoading } = useNotations();
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as Partial<NotationFilters> & { sort?: Sort };

  const kind: NotationFilters["kind"] = (search.kind as NotationFilters["kind"]) ?? "both";
  const sort: Sort = search.sort ?? "newest";

  const filters: NotationFilters = {
    ...emptyFilters,
    ...search,
    bookIds: search.bookIds ?? [],
    authorNames: search.authorNames ?? [],
    seriesValues: search.seriesValues ?? [],
    dateFrom: search.dateFrom ?? null,
    dateTo: search.dateTo ?? null,
    kind,
    q: search.q ?? "",
  };

  const setKind = (k: NotationFilters["kind"]) =>
    navigate({
      to: ".",
      search: (prev: Record<string, unknown>) => ({ ...prev, kind: k === "both" ? undefined : k }),
      replace: true,
    } as never);
  const setSort = (s: Sort) =>
    navigate({
      to: ".",
      search: (prev: Record<string, unknown>) => ({ ...prev, sort: s === "newest" ? undefined : s }),
      replace: true,
    } as never);

  const { entries, total } = useFilteredSorted(filters, sort, data);

  const [selectedIdx, setSelectedIdx] = useState(0);
  useEffect(() => {
    if (selectedIdx >= entries.length) setSelectedIdx(0);
  }, [entries.length, selectedIdx]);

  const scrollSelected = (idx: number) => {
    const e = entries[idx];
    if (!e) return;
    const el = document.querySelector(`[data-entry-id="${e.id}"]`);
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  };

  const onDown = useCallback(() => {
    setSelectedIdx((i) => {
      const n = Math.min(i + 1, entries.length - 1);
      scrollSelected(n);
      return n;
    });
  }, [entries]);
  const onUp = useCallback(() => {
    setSelectedIdx((i) => {
      const n = Math.max(i - 1, 0);
      scrollSelected(n);
      return n;
    });
  }, [entries]);
  const onOpen = useCallback(() => {
    const e = entries[selectedIdx];
    if (e) navigate({ to: "/books/$bookId", params: { bookId: e.bookId } } as never);
  }, [entries, selectedIdx, navigate]);
  const onCopy = useCallback(() => {
    const e = entries[selectedIdx];
    if (e) {
      navigator.clipboard.writeText(e.body);
      toast.success("Copied");
    }
  }, [entries, selectedIdx]);
  const onExport = useCallback(async () => {
    const e = entries[selectedIdx];
    if (!e) return;
    try {
      await exportEntryCard(e, "square");
      toast.success("Card saved");
    } catch (err) {
      toast.error("Export failed");
      console.error(err);
    }
  }, [entries, selectedIdx]);
  const onHelp = useCallback(() => {
    toast("j/k move · o open book · c copy · e export · ? help");
  }, []);

  useNotationsKeyboard(
    { onDown, onUp, onOpen, onCopy, onExport, onHelp },
    !isLoading && entries.length > 0,
  );

  const patchSearch = (patch: Record<string, unknown>) =>
    navigate({
      to: ".",
      search: (prev: Record<string, unknown>) => ({ ...prev, ...patch }),
      replace: true,
    } as never);

  const chips = [
    filters.q && {
      key: "q", label: `“${filters.q}”`,
      onRemove: () => patchSearch({ q: undefined }),
    },
    filters.bookIds.length > 0 && {
      key: "books", label: `${filters.bookIds.length} book${filters.bookIds.length === 1 ? "" : "s"}`,
      onRemove: () => patchSearch({ bookIds: undefined }),
    },
    filters.authorNames.length > 0 && {
      key: "authors", label: `${filters.authorNames.length} author${filters.authorNames.length === 1 ? "" : "s"}`,
      onRemove: () => patchSearch({ authorNames: undefined }),
    },
    filters.seriesValues.length > 0 && {
      key: "series", label: `${filters.seriesValues.length} series`,
      onRemove: () => patchSearch({ seriesValues: undefined }),
    },
    (filters.dateFrom || filters.dateTo) && {
      key: "date", label: `${filters.dateFrom ?? "…"} → ${filters.dateTo ?? "…"}`,
      onRemove: () => patchSearch({ dateFrom: undefined, dateTo: undefined }),
    },
    kind !== "both" && {
      key: "kind", label: kind === "notes" ? "Notes only" : "Quotes only",
      onRemove: () => patchSearch({ kind: undefined }),
    },
  ].filter(Boolean) as { key: string; label: string; onRemove: () => void }[];

  const clearAllChips = () =>
    patchSearch({
      q: undefined, bookIds: undefined, authorNames: undefined,
      seriesValues: undefined, dateFrom: undefined, dateTo: undefined,
      kind: undefined,
    });

  const contentFilterCount = chips.filter((c) => c.key !== "kind").length;
  const activeFilterSummary = chips.map((c) => c.label).join(" · ");

  return (
    <div data-print-root className="max-w-3xl mx-auto px-6">
      <header className="mb-6" data-no-print>
        <h1 className="font-display text-4xl">Notations</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-prose">
          Every mark you’ve left on a book — notes and quotes, side by side.
        </p>
      </header>

      <div className="hidden print:block mb-6">
        <h1 className="font-display text-3xl">Notations</h1>
        <div className="font-mono text-xs text-muted-foreground mt-1">
          {new Date().toLocaleDateString()} · {total} {total === 1 ? "entry" : "entries"}
          {activeFilterSummary && <> · {activeFilterSummary}</>}
        </div>
      </div>

      {data && <ResurfacedHero entries={data.entries} />}

      <div className="flex flex-wrap items-center gap-3 mb-5" data-no-print>
        <Segmented
          value={kind}
          onChange={(v) => setKind(v as NotationFilters["kind"])}
          options={[
            { value: "both", label: "Both" },
            { value: "notes", label: "Notes" },
            { value: "quotes", label: "Quotes" },
          ]}
        />
        <span className="h-5 w-px bg-border" />
        <Segmented
          value={sort}
          onChange={(v) => setSort(v as Sort)}
          options={[
            { value: "newest", label: "Newest" },
            { value: "oldest", label: "Oldest" },
          ]}
        />
        <button
          onClick={() => window.print()}
          className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs hover:bg-muted transition"
          title="Print"
        >
          <Printer className="h-3 w-3" /> Print
        </button>
      </div>

      <div data-no-print>
        <FilterBar data={data} />
      </div>

      {chips.length > 0 && (
        <div className="mt-3" data-no-print>
          <ActiveFilters chips={chips} onClearAll={clearAllChips} />
        </div>
      )}

      <div className="mt-6 pb-24">
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : total === 0 ? (
          <div className="rounded-2xl bg-card shadow-paper p-8 text-center text-muted-foreground">
            {contentFilterCount > 0 ? (
              "Nothing matches these filters."
            ) : kind === "quotes" ? (
              "No quotes yet. Add a quote to a book to start building your commonplace."
            ) : kind === "notes" ? (
              "No notes yet. Leave a note on a book to start building your commonplace."
            ) : (
              "No notations yet. Notes and quotes you add to books will gather here as your commonplace."
            )}
          </div>
        ) : (
          <>
            <div className="font-mono text-xs text-muted-foreground mb-4" data-no-print>
              {total} {total === 1 ? "entry" : "entries"}
              <span className="ml-3 opacity-70">press ? for shortcuts</span>
            </div>
            <div className="space-y-3 print:space-y-4">
              {entries.map((e, i) => (
                <EntryShell key={`${e.kind}-${e.id}`} entry={e} selected={i === selectedIdx} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Segmented({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="inline-flex items-center rounded-full bg-muted p-1 text-xs">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`px-3 py-1 rounded-full transition ${
            value === o.value ? "bg-card shadow-paper text-ink" : "text-muted-foreground"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
