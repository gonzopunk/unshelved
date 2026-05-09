import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import FilterBar from "@/components/notations/FilterBar";
import EntryShell from "@/components/notations/EntryShell";
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

  return (
    <div className="max-w-3xl mx-auto px-6">
      <header className="mb-6">
        <h1 className="font-display text-4xl">Notations</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-prose">
          Every mark you’ve left on a book — notes and quotes, side by side.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3 mb-5">
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
      </div>

      <FilterBar data={data} />

      <div className="mt-6 pb-24">
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : total === 0 ? (
          <div className="rounded-2xl bg-card shadow-paper p-8 text-center text-muted-foreground">
            Nothing matches these filters yet.
          </div>
        ) : (
          <>
            <div className="font-mono text-xs text-muted-foreground mb-4">
              {total} {total === 1 ? "entry" : "entries"}
            </div>
            <div className="space-y-3">
              {entries.map((e) => (
                <EntryShell key={`${e.kind}-${e.id}`} entry={e} />
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
