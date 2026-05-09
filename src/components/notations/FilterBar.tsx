import { useNavigate, useSearch, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronDown, X, Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import type { NotationsData, NotationFilters } from "@/lib/notations";
import { emptyFilters } from "@/lib/notations";

type SearchShape = Partial<NotationFilters>;

export default function FilterBar({ data }: { data: NotationsData | undefined }) {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as SearchShape;

  const filters: NotationFilters = {
    ...emptyFilters,
    ...search,
    bookIds: search.bookIds ?? [],
    authorNames: search.authorNames ?? [],
    seriesValues: search.seriesValues ?? [],
    dateFrom: search.dateFrom ?? null,
    dateTo: search.dateTo ?? null,
    kind: (search.kind as NotationFilters["kind"]) ?? "both",
    q: search.q ?? "",
  };

  const update = (patch: Partial<NotationFilters>) =>
    navigate({
      to: ".",
      search: (prev: Record<string, unknown>) => {
        const next = { ...prev, ...patch };
        for (const [k, v] of Object.entries(next)) {
          if (v === null || v === "" || (Array.isArray(v) && v.length === 0)) delete (next as Record<string, unknown>)[k];
        }
        return next;
      },
      replace: true,
    } as never);

  const clearAll = () =>
    navigate({
      to: ".",
      search: (prev: Record<string, unknown>) => {
        const keep: Record<string, unknown> = {};
        if (prev.kind) keep.kind = prev.kind;
        if (prev.sort) keep.sort = prev.sort;
        return keep;
      },
      replace: true,
    } as never);

  const booksById = useMemo(
    () => new Map((data?.books ?? []).map((b) => [b.id, b])),
    [data?.books],
  );

  const hasAny =
    filters.bookIds.length ||
    filters.authorNames.length ||
    filters.seriesValues.length ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.q;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput value={filters.q} onChange={(q) => update({ q })} />

        <MultiSelect
          label="Book"
          values={filters.bookIds}
          options={(data?.books ?? []).map((b) => ({ value: b.id, label: b.title }))}
          onChange={(bookIds) => update({ bookIds })}
        />
        <MultiSelect
          label="Author"
          values={filters.authorNames}
          options={(data?.authors ?? []).map((a) => ({ value: a, label: a }))}
          onChange={(authorNames) => update({ authorNames })}
        />
        <MultiSelect
          label="Series"
          values={filters.seriesValues}
          options={(data?.seriesValues ?? []).map((s) => ({ value: s, label: s }))}
          onChange={(seriesValues) => update({ seriesValues })}
          emptyHint={
            <span className="text-xs text-muted-foreground">
              Create a <code className="font-mono">series</code> tag-axis in{" "}
              <Link to="/settings" className="underline">Settings</Link> to enable.
            </span>
          }
        />

        <DateRange
          from={filters.dateFrom}
          to={filters.dateTo}
          onChange={(dateFrom, dateTo) => update({ dateFrom, dateTo })}
        />

        {hasAny && (
          <button
            onClick={clearAll}
            className="text-xs text-muted-foreground hover:text-ink underline underline-offset-4 ml-auto"
          >
            Clear all
          </button>
        )}
      </div>

      {hasAny && (
        <div className="flex flex-wrap gap-1.5">
          {filters.q && (
            <Chip label={`“${filters.q}”`} onRemove={() => update({ q: "" })} />
          )}
          {filters.bookIds.map((id) => (
            <Chip key={id} label={`Book: ${booksById.get(id)?.title ?? id}`} onRemove={() => update({ bookIds: filters.bookIds.filter((x) => x !== id) })} />
          ))}
          {filters.authorNames.map((a) => (
            <Chip key={a} label={`Author: ${a}`} onRemove={() => update({ authorNames: filters.authorNames.filter((x) => x !== a) })} />
          ))}
          {filters.seriesValues.map((s) => (
            <Chip key={s} label={`Series: ${s}`} onRemove={() => update({ seriesValues: filters.seriesValues.filter((x) => x !== s) })} />
          ))}
          {(filters.dateFrom || filters.dateTo) && (
            <Chip
              label={`${filters.dateFrom ?? "…"} → ${filters.dateTo ?? "…"}`}
              onRemove={() => update({ dateFrom: null, dateTo: null })}
            />
          )}
        </div>
      )}
    </div>
  );
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs">
      {label}
      <button onClick={onRemove} className="text-muted-foreground hover:text-ink" aria-label="Remove filter">
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

function SearchInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search…"
        className="pl-8 h-9 rounded-full w-56 text-sm"
      />
    </div>
  );
}

function MultiSelect({
  label,
  values,
  options,
  onChange,
  emptyHint,
}: {
  label: string;
  values: string[];
  options: { value: string; label: string }[];
  onChange: (next: string[]) => void;
  emptyHint?: React.ReactNode;
}) {
  const [q, setQ] = useState("");
  const filtered = options.filter((o) => o.label.toLowerCase().includes(q.toLowerCase()));
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs transition ${
            values.length ? "bg-forest text-paper border-forest" : "bg-card border-border text-ink hover:bg-muted"
          }`}
        >
          {label}
          {values.length > 0 && <span className="font-mono">· {values.length}</span>}
          <ChevronDown className="h-3 w-3 opacity-70" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2 rounded-xl" align="start">
        {options.length === 0 ? (
          <div className="px-2 py-3 text-xs text-muted-foreground">
            {emptyHint ?? "No options"}
          </div>
        ) : (
          <>
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={`Find ${label.toLowerCase()}…`}
              className="h-8 mb-2 text-xs"
            />
            <div className="max-h-64 overflow-y-auto space-y-0.5">
              {filtered.map((o) => {
                const checked = values.includes(o.value);
                return (
                  <label
                    key={o.value}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted cursor-pointer text-sm"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(v) => {
                        if (v) onChange([...values, o.value]);
                        else onChange(values.filter((x) => x !== o.value));
                      }}
                    />
                    <span className="truncate">{o.label}</span>
                  </label>
                );
              })}
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

function DateRange({
  from,
  to,
  onChange,
}: {
  from: string | null;
  to: string | null;
  onChange: (from: string | null, to: string | null) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs transition ${
            from || to ? "bg-forest text-paper border-forest" : "bg-card border-border text-ink hover:bg-muted"
          }`}
        >
          Dates
          <ChevronDown className="h-3 w-3 opacity-70" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3 rounded-xl space-y-2" align="start">
        <label className="block text-xs text-muted-foreground">
          From
          <Input
            type="date"
            value={from ?? ""}
            onChange={(e) => onChange(e.target.value || null, to)}
            className="h-8 mt-1"
          />
        </label>
        <label className="block text-xs text-muted-foreground">
          To
          <Input
            type="date"
            value={to ?? ""}
            onChange={(e) => onChange(from, e.target.value || null)}
            className="h-8 mt-1"
          />
        </label>
      </PopoverContent>
    </Popover>
  );
}
