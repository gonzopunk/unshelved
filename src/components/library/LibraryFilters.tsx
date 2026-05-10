import { useMemo, useState } from "react";
import { Search, ChevronDown, Check } from "lucide-react";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  STATUS_LABELS, FORMAT_LABELS,
  type LibraryFilters as F,
} from "@/lib/library-filter";
import type { BookWithShelf, BookStatus, BookFormat } from "@/lib/queries";

const STATUSES: BookStatus[] = ["want", "reading", "later", "loved", "liked", "meh", "dnf"];
const FORMATS: BookFormat[] = ["print", "ebook", "audiobook"];

type AxisOption = { key: string; label: string; values: string[] };

export default function LibraryFilters({
  filters,
  onChange,
  library,
  bookTags,
  axisOptions,
}: {
  filters: F;
  onChange: (patch: Partial<F>) => void;
  library: BookWithShelf[];
  bookTags: Record<string, string[]>;
  axisOptions: AxisOption[];
}) {
  const [qLocal, setQLocal] = useState(filters.q);
  // debounced commit
  useDebouncedEffect(() => onChange({ q: qLocal }), 200, [qLocal]);

  const allAuthors = useMemo(() => {
    const s = new Set<string>();
    library.forEach((b) => b.author && s.add(b.author));
    return [...s].sort((a, b) => a.localeCompare(b));
  }, [library]);

  const allTags = useMemo(() => {
    const s = new Set<string>();
    Object.values(bookTags).forEach((arr) => arr.forEach((t) => s.add(t)));
    return [...s].sort();
  }, [bookTags]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={qLocal}
          onChange={(e) => setQLocal(e.target.value)}
          placeholder="Search title or author…"
          className="pl-9 w-64 rounded-full bg-card"
        />
      </div>

      <MultiPopover
        label="Status"
        selected={filters.status}
        options={STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }))}
        onChange={(v) => onChange({ status: v as BookStatus[] })}
      />

      <SinglePopover
        label="Format"
        selected={filters.format}
        options={FORMATS.map((f) => ({ value: f, label: FORMAT_LABELS[f] }))}
        onChange={(v) => onChange({ format: v as BookFormat | null })}
      />

      <SinglePopover
        label="Author"
        selected={filters.author}
        options={allAuthors.map((a) => ({ value: a, label: a }))}
        onChange={(v) => onChange({ author: v })}
        searchable
      />

      <MultiPopover
        label="Tags"
        selected={filters.tags}
        options={allTags.map((t) => ({ value: t, label: t }))}
        onChange={(v) => onChange({ tags: v })}
        searchable
        emptyMsg="No tags yet"
      />

      {axisOptions.length > 0 && (
        <AxisPopover
          axes={axisOptions}
          selected={filters.axis}
          onChange={(v) => onChange({ axis: v })}
        />
      )}

      <Popover>
        <PopoverTrigger asChild>
          <TriggerBtn label="Rating" value={filters.rating ? `${filters.rating}★` : null} />
        </PopoverTrigger>
        <PopoverContent className="w-auto rounded-2xl p-3">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => onChange({ rating: filters.rating === n ? null : n })}
                  className={`text-lg leading-none ${
                    n <= (filters.rating ?? 0) ? "text-terra" : "text-mist"
                  }`}
                  aria-label={`${n} stars`}
                >
                  ★
                </button>
              ))}
            </div>
            {filters.rating != null && (
              <button
                onClick={() => onChange({ rating: null })}
                className="text-xs text-muted-foreground hover:text-ink underline underline-offset-2"
              >
                Clear
              </button>
            )}
          </div>
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger asChild>
          <TriggerBtn
            label="Finished"
            value={
              filters.dateFrom || filters.dateTo
                ? `${filters.dateFrom ?? "…"} → ${filters.dateTo ?? "…"}`
                : null
            }
          />
        </PopoverTrigger>
        <PopoverContent className="w-auto rounded-2xl p-3 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-10">From</span>
            <Input
              type="date"
              value={filters.dateFrom ?? ""}
              onChange={(e) => onChange({ dateFrom: e.target.value || null })}
              className="h-8"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-10">To</span>
            <Input
              type="date"
              value={filters.dateTo ?? ""}
              onChange={(e) => onChange({ dateTo: e.target.value || null })}
              className="h-8"
            />
          </div>
          {(filters.dateFrom || filters.dateTo) && (
            <button
              onClick={() => onChange({ dateFrom: null, dateTo: null })}
              className="text-xs text-muted-foreground hover:text-ink underline underline-offset-2"
            >
              Clear
            </button>
          )}
        </PopoverContent>
      </Popover>

      <button
        onClick={() => onChange({ paused: !filters.paused })}
        className={`text-xs rounded-full px-3 py-1.5 border transition ${
          filters.paused
            ? "bg-forest text-paper border-forest"
            : "bg-card border-border text-muted-foreground hover:text-ink"
        }`}
        title="Show only paused books"
      >
        Paused
      </button>
    </div>
  );
}

/* ---------- shared bits ---------- */

function TriggerBtn({ label, value }: { label: string; value: string | null }) {
  return (
    <Button
      variant="outline"
      size="sm"
      className="rounded-full bg-card gap-1.5 font-normal"
    >
      <span className="text-muted-foreground">{label}</span>
      {value && <span className="text-ink">{value}</span>}
      <ChevronDown className="h-3 w-3 opacity-60" />
    </Button>
  );
}

function MultiPopover({
  label,
  selected,
  options,
  onChange,
  searchable,
  emptyMsg,
}: {
  label: string;
  selected: string[];
  options: { value: string; label: string }[];
  onChange: (v: string[]) => void;
  searchable?: boolean;
  emptyMsg?: string;
}) {
  const [q, setQ] = useState("");
  const filtered = q
    ? options.filter((o) => o.label.toLowerCase().includes(q.toLowerCase()))
    : options;
  const valueLabel =
    selected.length === 0
      ? null
      : selected.length === 1
        ? options.find((o) => o.value === selected[0])?.label ?? selected[0]
        : `${selected.length} selected`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <TriggerBtn label={label} value={valueLabel} />
      </PopoverTrigger>
      <PopoverContent className="w-64 rounded-2xl p-2 max-h-80 overflow-y-auto">
        {searchable && (
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search…"
            className="mb-2 h-8"
          />
        )}
        {filtered.length === 0 ? (
          <div className="text-xs text-muted-foreground p-2">{emptyMsg ?? "No options"}</div>
        ) : (
          filtered.map((o) => {
            const on = selected.includes(o.value);
            return (
              <button
                key={o.value}
                onClick={() =>
                  onChange(on ? selected.filter((x) => x !== o.value) : [...selected, o.value])
                }
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted text-left"
              >
                <span className="h-4 w-4 inline-flex items-center justify-center">
                  {on && <Check className="h-3.5 w-3.5 text-forest" />}
                </span>
                <span className="truncate">{o.label}</span>
              </button>
            );
          })
        )}
        {selected.length > 0 && (
          <button
            onClick={() => onChange([])}
            className="mt-2 w-full text-xs text-muted-foreground hover:text-ink underline underline-offset-2"
          >
            Clear
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}

function SinglePopover({
  label,
  selected,
  options,
  onChange,
  searchable,
}: {
  label: string;
  selected: string | null;
  options: { value: string; label: string }[];
  onChange: (v: string | null) => void;
  searchable?: boolean;
}) {
  const [q, setQ] = useState("");
  const filtered = q
    ? options.filter((o) => o.label.toLowerCase().includes(q.toLowerCase()))
    : options;
  const valueLabel = selected ? options.find((o) => o.value === selected)?.label ?? selected : null;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <TriggerBtn label={label} value={valueLabel} />
      </PopoverTrigger>
      <PopoverContent className="w-64 rounded-2xl p-2 max-h-80 overflow-y-auto">
        {searchable && (
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search…"
            className="mb-2 h-8"
          />
        )}
        {filtered.map((o) => (
          <button
            key={o.value}
            onClick={() => onChange(o.value === selected ? null : o.value)}
            className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted text-left ${
              o.value === selected ? "bg-muted" : ""
            }`}
          >
            <span className="truncate">{o.label}</span>
          </button>
        ))}
        {selected && (
          <button
            onClick={() => onChange(null)}
            className="mt-2 w-full text-xs text-muted-foreground hover:text-ink underline underline-offset-2"
          >
            Clear
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}

function AxisPopover({
  axes,
  selected,
  onChange,
}: {
  axes: AxisOption[];
  selected: { key: string; value: string }[];
  onChange: (v: { key: string; value: string }[]) => void;
}) {
  const valueLabel =
    selected.length === 0
      ? null
      : selected.length === 1
        ? `${selected[0].key}: ${selected[0].value}`
        : `${selected.length} selected`;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <TriggerBtn label="Axes" value={valueLabel} />
      </PopoverTrigger>
      <PopoverContent className="w-72 rounded-2xl p-2 max-h-96 overflow-y-auto">
        {axes.map((axis) => (
          <div key={axis.key} className="mb-2">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground px-2 py-1">
              {axis.label}
            </div>
            <div className="flex flex-wrap gap-1 px-1">
              {axis.values.map((v) => {
                const on = selected.some((s) => s.key === axis.key && s.value === v);
                return (
                  <button
                    key={v}
                    onClick={() =>
                      onChange(
                        on
                          ? selected.filter((s) => !(s.key === axis.key && s.value === v))
                          : [...selected, { key: axis.key, value: v }],
                      )
                    }
                    className={`text-xs rounded-full px-2.5 py-1 border transition ${
                      on
                        ? "bg-forest text-paper border-forest"
                        : "bg-card border-border text-ink hover:bg-muted"
                    }`}
                  >
                    {v}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        {selected.length > 0 && (
          <button
            onClick={() => onChange([])}
            className="mt-2 w-full text-xs text-muted-foreground hover:text-ink underline underline-offset-2"
          >
            Clear
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}

/* ---------- tiny debounced effect ---------- */

import { useEffect, useRef } from "react";
function useDebouncedEffect(fn: () => void, ms: number, deps: React.DependencyList) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    const t = setTimeout(() => ref.current(), ms);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
