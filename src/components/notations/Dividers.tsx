import { Link } from "@tanstack/react-router";
import type { EntryGroup } from "@/lib/notations";

export function BookHeader({ group }: { group: EntryGroup }) {
  return (
    <div className="flex items-center gap-3 mt-10 mb-4">
      {group.accent && (
        <span
          className="h-8 w-2 rounded-sm shrink-0"
          style={{ backgroundColor: group.accent }}
          aria-hidden
        />
      )}
      <div className="min-w-0">
        <h2 className="font-display text-xl truncate">
          <Link
            to="/books/$bookId"
            params={{ bookId: group.key }}
            className="hover:underline underline-offset-4"
          >
            {group.label}
          </Link>
        </h2>
        {group.subLabel && (
          <div className="font-mono text-xs text-muted-foreground">{group.subLabel} · {group.entries.length} entries</div>
        )}
      </div>
    </div>
  );
}

export function Divider({ label, count }: { label: string; count: number }) {
  if (!label) return null;
  return (
    <div className="flex items-center gap-4 mt-10 mb-4">
      <span className="h-px flex-1 bg-border" />
      <span className="font-display italic text-sm text-muted-foreground">
        {label} <span className="font-mono not-italic text-xs">· {count}</span>
      </span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}
