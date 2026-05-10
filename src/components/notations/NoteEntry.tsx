import { Link } from "@tanstack/react-router";
import { Network, Copy, ExternalLink, Download } from "lucide-react";
import { format } from "date-fns";
import type { NotationEntry } from "@/lib/notations";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { exportEntryCard, type CardRatio } from "./ExportCard";

export default function NoteEntry({
  entry,
  selected,
}: {
  entry: NotationEntry;
  selected?: boolean;
}) {
  return (
    <article
      data-entry-id={entry.id}
      className={`group rounded-2xl bg-card shadow-paper p-5 transition ${
        selected ? "ring-1 ring-terra/50" : ""
      }`}
    >
      <p className="whitespace-pre-wrap font-sans text-base leading-normal">
        {entry.body}
      </p>
      <Meta entry={entry} />
    </article>
  );
}

export function Meta({ entry }: { entry: NotationEntry }) {
  const onCopy = () => {
    navigator.clipboard.writeText(entry.body);
    toast.success("Copied");
  };
  const onExport = async (ratio: CardRatio) => {
    try {
      await exportEntryCard(entry, ratio);
      toast.success("Card saved");
    } catch (e) {
      toast.error("Export failed");
      console.error(e);
    }
  };
  return (
    <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
      <div className="font-mono text-xs text-muted-foreground">
        {entry.kind === "quote" && entry.pageNumber ? `p. ${entry.pageNumber} · ` : ""}
        {format(new Date(entry.createdAt), "MMM d, yyyy")} · {entry.book.title}
        {entry.book.author && <> · {entry.book.author}</>}
      </div>
      <div
        data-no-print
        className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity"
      >
        <button
          onClick={onCopy}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition px-2 py-1 rounded-full"
          title="Copy"
        >
          <Copy className="h-3 w-3" />
        </button>
        <Popover>
          <PopoverTrigger asChild>
            <button
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition px-2 py-1 rounded-full"
              title="Export as card"
            >
              <Download className="h-3 w-3" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-44 p-1 rounded-xl">
            <button
              onClick={() => onExport("square")}
              className="block w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-muted"
            >
              Square <span className="font-mono text-xs text-muted-foreground">1080×1080</span>
            </button>
            <button
              onClick={() => onExport("portrait")}
              className="block w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-muted"
            >
              Portrait <span className="font-mono text-xs text-muted-foreground">4:5</span>
            </button>
          </PopoverContent>
        </Popover>
        <Link
          to="/books/$bookId"
          params={{ bookId: entry.bookId }}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition px-2 py-1 rounded-full"
          title="Open book"
        >
          <ExternalLink className="h-3 w-3" /> Book
        </Link>
        <button
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition px-2 py-1 rounded-full"
          title="Connect (coming soon)"
          onClick={() => toast("Connect action coming in a follow-up build")}
        >
          <Network className="h-3 w-3" /> Connect
        </button>
      </div>
    </div>
  );
}
