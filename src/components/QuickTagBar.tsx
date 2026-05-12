import { useMemo, useState, useRef, useEffect } from "react";
import {
  useTagAxes,
  useBookAxisValues,
  useBookTags,
  useTags,
  useSetAxisValue,
  useClearAxisValue,
  useAddBookTag,
  useRemoveBookTag,
  type TagAxis,
  type BookAxisValue,
} from "@/lib/tagging";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { X, Plus, ChevronDown } from "lucide-react";

interface Props {
  bookId: string;
}

export default function QuickTagBar({ bookId }: Props) {
  const { data: axes = [] } = useTagAxes();
  const { data: values = [] } = useBookAxisValues(bookId);
  const { data: bookTags = [] } = useBookTags(bookId);
  const { data: allTags = [] } = useTags();
  const addTag = useAddBookTag();
  const removeTag = useRemoveBookTag();

  const valueByAxis = useMemo(() => {
    const m = new Map<string, BookAxisValue>();
    for (const v of values) m.set(v.axis_id, v);
    return m;
  }, [values]);

  const visible = axes.filter((a) => !a.hidden);

  return (
    <div className="mt-6 rounded-2xl bg-card shadow-paper px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {visible.map((axis) => (
          <AxisControl key={axis.id} axis={axis} bookId={bookId} value={valueByAxis.get(axis.id)} />
        ))}
        <div className="h-5 w-px bg-border mx-1" />
        <FreeTagsRow
          bookId={bookId}
          tags={bookTags}
          suggestions={allTags.filter((t) => !bookTags.some((bt) => bt.id === t.id))}
          onAdd={(name) => addTag.mutate({ book_id: bookId, name })}
          onRemove={(tag_id) => removeTag.mutate({ book_id: bookId, tag_id })}
        />
      </div>
    </div>
  );
}

function AxisControl({
  axis,
  bookId,
  value,
}: {
  axis: TagAxis;
  bookId: string;
  value: BookAxisValue | undefined;
}) {
  if (axis.kind === "scale") return <ScaleAxis axis={axis} bookId={bookId} value={value} />;
  if (axis.kind === "single") return <SingleAxis axis={axis} bookId={bookId} value={value} />;
  return <MultiAxis axis={axis} bookId={bookId} value={value} />;
}

function ScaleAxis({ axis, bookId, value }: { axis: TagAxis; bookId: string; value?: BookAxisValue }) {
  const set = useSetAxisValue();
  const clear = useClearAxisValue();
  const min = axis.scale_min ?? 0;
  const max = axis.scale_max ?? 5;
  const current = value?.scale_value ?? null;
  const isSpice = axis.key === "spice";
  const isPace = axis.key === "pace";
  // For spice, render 1..max (0 = unset, no highlighted pepper)
  const start = isSpice ? Math.max(1, min) : min;
  const dots = [];
  for (let i = start; i <= max; i++) dots.push(i);
  const glyph = isSpice ? "🌶" : "●";
  const paceLabels: Record<number, string> = {
    1: "glacial",
    2: "languid",
    3: "steady",
    4: "brisk",
    5: "blistering",
  };
  const spiceLabels: Record<number, string> = {
    1: "mild",
    2: "warm",
    3: "spicy",
    4: "sizzling",
    5: "scorching",
  };
  return (
    <div className="flex items-center gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{axis.label}</span>
      <div className="flex items-center gap-0.5">
        {dots.map((d) => {
          const active = current !== null && current > 0 && d <= current;
          const title = isPace
            ? paceLabels[d] ?? `${d}`
            : isSpice
              ? spiceLabels[d] ?? `${d}`
              : `${axis.label} ${d}`;
          return (
            <button
              key={d}
              type="button"
              title={title}
              onClick={() =>
                current === d
                  ? clear.mutate({ book_id: bookId, axis_id: axis.id })
                  : set.mutate({ book_id: bookId, axis_id: axis.id, scale_value: d })
              }
              className={`h-5 w-5 rounded-full text-xs leading-none transition ${
                isSpice ? "text-terra" : ""
              } ${active ? "" : "opacity-25 hover:opacity-60"}`}
              aria-label={`${axis.label} ${d}${isPace ? ` (${paceLabels[d]})` : isSpice ? ` (${spiceLabels[d]})` : ""}`}
            >
              {glyph}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SingleAxis({ axis, bookId, value }: { axis: TagAxis; bookId: string; value?: BookAxisValue }) {
  const set = useSetAxisValue();
  const clear = useClearAxisValue();
  const current = value?.values?.[0] ?? null;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs transition ${
            current ? "bg-mist text-ink" : "text-muted-foreground hover:bg-mist"
          }`}
        >
          <span className="font-mono text-[10px] uppercase tracking-widest opacity-70">{axis.label}</span>
          {current && <span className="font-medium">{current}</span>}
          <ChevronDown className="h-3 w-3 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-1.5" align="start">
        <div className="flex flex-wrap gap-1">
          {axis.values.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => set.mutate({ book_id: bookId, axis_id: axis.id, values: [v] })}
              className={`rounded-full px-2.5 py-1 text-xs transition ${
                v === current ? "bg-forest text-paper" : "bg-mist hover:bg-border"
              }`}
            >
              {v}
            </button>
          ))}
          {current && (
            <button
              type="button"
              onClick={() => clear.mutate({ book_id: bookId, axis_id: axis.id })}
              className="rounded-full px-2.5 py-1 text-xs text-muted-foreground hover:text-ink"
            >
              clear
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function MultiAxis({ axis, bookId, value }: { axis: TagAxis; bookId: string; value?: BookAxisValue }) {
  const set = useSetAxisValue();
  const current = value?.values ?? [];
  const isCw = axis.key === "content_warnings";
  const [draft, setDraft] = useState("");
  const toggle = (v: string) => {
    const next = current.includes(v) ? current.filter((x) => x !== v) : [...current, v];
    set.mutate({ book_id: bookId, axis_id: axis.id, values: next });
  };
  const addCustom = () => {
    const clean = draft.trim().toLowerCase();
    if (!clean || current.includes(clean)) return setDraft("");
    set.mutate({ book_id: bookId, axis_id: axis.id, values: [...current, clean] });
    setDraft("");
  };
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs transition ${
            current.length ? "bg-mist text-ink" : "text-muted-foreground hover:bg-mist"
          }`}
        >
          <span className="font-mono text-[10px] uppercase tracking-widest opacity-70">{axis.label}</span>
          {current.length > 0 && (
            <span className="font-medium">{current.length === 1 ? current[0] : `${current.length}`}</span>
          )}
          <ChevronDown className="h-3 w-3 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="start">
        <div className="flex flex-wrap gap-1 mb-2">
          {[...new Set([...axis.values, ...current])].map((v) => {
            const on = current.includes(v);
            return (
              <button
                key={v}
                type="button"
                onClick={() => toggle(v)}
                className={`rounded-full px-2.5 py-1 text-xs transition ${
                  on
                    ? isCw
                      ? "bg-muted-foreground/20 text-ink"
                      : "bg-forest text-paper"
                    : "bg-mist hover:bg-border"
                }`}
              >
                {isCw ? `cw: ${v}` : v}
              </button>
            );
          })}
        </div>
        {axis.open && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addCustom();
            }}
            className="flex gap-1"
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="add new…"
              className="flex-1 rounded-full bg-mist px-3 py-1 text-xs outline-none focus:ring-1 focus:ring-primary"
            />
            <button type="submit" className="rounded-full bg-forest text-paper px-2.5 py-1 text-xs">
              add
            </button>
          </form>
        )}
      </PopoverContent>
    </Popover>
  );
}

function FreeTagsRow({
  tags,
  suggestions,
  onAdd,
  onRemove,
}: {
  bookId: string;
  tags: { id: string; name: string }[];
  suggestions: { id: string; name: string }[];
  onAdd: (name: string) => void;
  onRemove: (tag_id: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);

  const matches = draft
    ? suggestions.filter((t) => t.name.startsWith(draft.toLowerCase())).slice(0, 6)
    : suggestions.slice(0, 6);

  const submit = () => {
    const v = draft.trim();
    if (v) onAdd(v);
    setDraft("");
    setAdding(false);
  };

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Tags</span>
      {tags.map((t) => (
        <span
          key={t.id}
          className="group inline-flex items-center gap-1 rounded-full bg-terra/15 text-terra px-2 py-0.5 text-xs"
        >
          {t.name}
          <button
            type="button"
            onClick={() => onRemove(t.id)}
            className="opacity-0 group-hover:opacity-100 transition"
            aria-label={`Remove ${t.name}`}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      {adding ? (
        <div className="relative">
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submit();
              } else if (e.key === "Escape") {
                e.preventDefault();
                setDraft("");
                setAdding(false);
              }
            }}
            onBlur={() => {
              // delay so suggestion mousedown can fire first
              setTimeout(() => submit(), 150);
            }}
            placeholder="tag…"
            className="rounded-full bg-mist px-2.5 py-0.5 text-xs outline-none focus:ring-1 focus:ring-primary w-28"
          />
          {matches.length > 0 && (
            <div className="absolute left-0 top-full mt-1 z-50 rounded-md border border-border bg-popover shadow-md p-1 flex flex-wrap gap-1 w-56">
              {matches.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onAdd(t.name);
                    setDraft("");
                    setAdding(false);
                  }}
                  className="rounded-full bg-mist hover:bg-border px-2 py-0.5 text-xs"
                >
                  {t.name}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs text-muted-foreground hover:text-ink hover:bg-mist transition"
        >
          <Plus className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
