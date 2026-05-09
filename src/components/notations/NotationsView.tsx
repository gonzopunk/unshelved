import { useSearch } from "@tanstack/react-router";
import EntryShell from "@/components/notations/EntryShell";
import { BookHeader, Divider } from "@/components/notations/Dividers";
import {
  useNotations,
  useFilteredGrouped,
  emptyFilters,
  type NotationFilters,
  type Grouping,
  type Display,
} from "@/lib/notations";

export type ViewKindFilter = "notes" | "quotes" | "both";

export function NotationsView({
  forcedKind,
  defaultDisplay,
  defaultGrouping,
}: {
  forcedKind: ViewKindFilter;
  defaultDisplay: Display;
  defaultGrouping: Grouping;
}) {
  const { data, isLoading } = useNotations();
  const search = useSearch({ strict: false }) as Partial<NotationFilters> & {
    display?: Display;
    grouping?: Grouping;
    axisKey?: string;
  };

  const display: Display = search.display ?? defaultDisplay;
  const grouping: Grouping = search.grouping ?? defaultGrouping;

  // For Notes/Quotes views, kind is forced regardless of URL.
  const kind: NotationFilters["kind"] =
    forcedKind === "both" ? (search.kind ?? "both") : forcedKind;

  const filters: NotationFilters = {
    ...emptyFilters,
    ...search,
    bookIds: search.bookIds ?? [],
    authorNames: search.authorNames ?? [],
    seriesValues: search.seriesValues ?? [],
    tagIds: search.tagIds ?? [],
    axisFilter: search.axisFilter ?? null,
    dateFrom: search.dateFrom ?? null,
    dateTo: search.dateTo ?? null,
    kind,
    q: search.q ?? "",
  };

  const { groups, total } = useFilteredGrouped(filters, grouping, search.axisKey ?? null, data);

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading…</div>;
  }
  if (total === 0) {
    return (
      <div className="rounded-2xl bg-card shadow-paper p-8 text-center text-muted-foreground">
        Nothing matches these filters yet.
      </div>
    );
  }

  const wrapClass =
    display === "scroll"
      ? "max-w-2xl mx-auto"
      : "max-w-3xl mx-auto";
  const stackClass = display === "scroll" ? "space-y-8" : "space-y-3";
  const isUngrouped = grouping === "newest" || grouping === "oldest";

  return (
    <div className={wrapClass}>
      <div className="font-mono text-xs text-muted-foreground mb-4">
        {total} {total === 1 ? "entry" : "entries"}
      </div>
      {isUngrouped ? (
        <div className={stackClass}>
          {groups[0]?.entries.map((e) => (
            <EntryShell key={`${e.kind}-${e.id}`} entry={e} display={display} />
          ))}
        </div>
      ) : (
        groups.map((g) => (
          <section key={g.key}>
            {grouping === "book" ? (
              <BookHeader group={g} />
            ) : (
              <Divider label={g.label} count={g.entries.length} />
            )}
            <div className={stackClass}>
              {g.entries.map((e) => (
                <EntryShell key={`${e.kind}-${e.id}`} entry={e} display={display} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
