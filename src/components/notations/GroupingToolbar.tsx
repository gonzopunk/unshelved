import { useNavigate, useSearch } from "@tanstack/react-router";
import type { Grouping } from "@/lib/notations";

const OPTIONS: { value: Grouping; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "book", label: "By book" },
  { value: "author", label: "By author" },
  { value: "series", label: "By series" },
  { value: "month", label: "By month" },
];

export default function GroupingToolbar({ defaultGrouping }: { defaultGrouping: Grouping }) {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { grouping?: Grouping };
  const current: Grouping = search.grouping ?? defaultGrouping;
  const set = (g: Grouping) =>
    navigate({ to: ".", search: (prev: Record<string, unknown>) => ({ ...prev, grouping: g }), replace: true } as never);
  return (
    <div className="flex flex-wrap gap-1 text-xs">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          onClick={() => set(o.value)}
          className={`px-3 py-1 rounded-full border transition ${
            current === o.value
              ? "bg-forest text-paper border-forest"
              : "bg-transparent text-muted-foreground border-border hover:bg-muted"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
