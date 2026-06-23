import { LayoutGrid, List as ListIcon, Kanban, ChevronDown } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SortKey, SortDir, ViewMode } from "@/lib/library-filter";

const SORT_OPTIONS: { sort: SortKey; dir: SortDir; label: string }[] = [
  { sort: "added", dir: "desc", label: "Recently added" },
  { sort: "added", dir: "asc", label: "Oldest added" },
  { sort: "title", dir: "asc", label: "Title A→Z" },
  { sort: "title", dir: "desc", label: "Title Z→A" },
  { sort: "author", dir: "asc", label: "Author A→Z" },
  { sort: "rating", dir: "desc", label: "Rating: high→low" },
  { sort: "rating", dir: "asc", label: "Rating: low→high" },
  { sort: "finished", dir: "desc", label: "Finished: newest" },
  { sort: "finished", dir: "asc", label: "Finished: oldest" },
  { sort: "progress", dir: "desc", label: "Progress: most→least" },
];

export default function LibraryToolbar({
  count,
  total,
  sort,
  dir,
  view,
  onSortChange,
  onViewChange,
}: {
  count: number;
  total: number;
  sort: SortKey;
  dir: SortDir;
  view: ViewMode;
  onSortChange: (sort: SortKey, dir: SortDir) => void;
  onViewChange: (v: ViewMode) => void;
}) {
  const current =
    SORT_OPTIONS.find((o) => o.sort === sort && o.dir === dir)?.label ??
    "Recently added";

  return (
    <div className="flex items-center gap-3 text-sm">
      <div className="font-mono text-xs text-muted-foreground">
        {count === total ? `${total} books` : `${count} of ${total} books`}
      </div>
      <div className="ml-auto flex items-center gap-2">
        {view !== "board" && (
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs hover:bg-muted">
              <span className="text-muted-foreground">Sort</span>
              <span>{current}</span>
              <ChevronDown className="h-3 w-3 opacity-60" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-2xl">
              {SORT_OPTIONS.map((o) => (
                <DropdownMenuItem
                  key={`${o.sort}-${o.dir}`}
                  onClick={() => onSortChange(o.sort, o.dir)}
                  className="rounded-xl text-sm"
                >
                  {o.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <div className="inline-flex items-center rounded-full bg-muted p-1">
          <button
            onClick={() => onViewChange("grid")}
            className={`p-1.5 rounded-full transition ${
              view === "grid" ? "bg-card shadow-paper" : "text-muted-foreground"
            }`}
            title="Grid view"
            aria-label="Grid view"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onViewChange("list")}
            className={`p-1.5 rounded-full transition ${
              view === "list" ? "bg-card shadow-paper" : "text-muted-foreground"
            }`}
            title="List view"
            aria-label="List view"
          >
            <ListIcon className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onViewChange("board")}
            className={`p-1.5 rounded-full transition ${
              view === "board" ? "bg-card shadow-paper" : "text-muted-foreground"
            }`}
            title="Board view"
            aria-label="Board view"
          >
            <Kanban className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
