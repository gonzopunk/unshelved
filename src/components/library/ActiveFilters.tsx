import { X } from "lucide-react";

export type ActiveChip = {
  key: string;
  label: string;
  onRemove: () => void;
};

export default function ActiveFilters({
  chips,
  onClearAll,
}: {
  chips: ActiveChip[];
  onClearAll?: () => void;
}) {
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((c) => (
        <button
          key={c.key}
          onClick={c.onRemove}
          className="group inline-flex items-center gap-1.5 rounded-full bg-mist/60 hover:bg-mist text-ink px-3 py-1 text-xs transition"
          title="Remove filter"
        >
          <span>{c.label}</span>
          <X className="h-3 w-3 opacity-60 group-hover:opacity-100" />
        </button>
      ))}
      {chips.length >= 2 && onClearAll && (
        <button
          onClick={onClearAll}
          className="text-xs text-muted-foreground hover:text-ink underline underline-offset-2"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
