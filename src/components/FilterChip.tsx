import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown, X } from "lucide-react";

export type FilterChipProps = {
  label: string;
  options: { value: string; label: string; count?: number }[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
};

export function FilterChip({ label, options, selected, onChange }: FilterChipProps) {
  const [open, setOpen] = useState(false);
  const active = selected.size > 0;
  const toggle = (v: string) => {
    const next = new Set(selected);
    if (next.has(v)) next.delete(v); else next.add(v);
    onChange(next);
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm border transition ${
            active
              ? "bg-forest text-paper border-forest"
              : "bg-card border-border text-ink hover:bg-muted"
          }`}
        >
          {label}
          {active && <span className="text-xs opacity-90">· {selected.size}</span>}
          <ChevronDown className="h-3.5 w-3.5 opacity-70" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2 max-h-72 overflow-y-auto" align="start">
        {options.length === 0 ? (
          <div className="text-sm text-muted-foreground italic px-2 py-1.5">No options</div>
        ) : (
          options.map((o) => (
            <label key={o.value} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-sm">
              <Checkbox checked={selected.has(o.value)} onCheckedChange={() => toggle(o.value)} />
              <span className="flex-1 truncate">{o.label}</span>
              {o.count !== undefined && <span className="text-xs text-muted-foreground">{o.count}</span>}
            </label>
          ))
        )}
        {active && (
          <button
            onClick={() => onChange(new Set())}
            className="w-full mt-1 flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-ink py-1.5 border-t border-border"
          >
            <X className="h-3 w-3" /> Clear
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}
