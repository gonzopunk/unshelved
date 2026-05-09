import { Link } from "@tanstack/react-router";
import { Network, Copy, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import type { NotationEntry, Display } from "@/lib/notations";
import { toast } from "sonner";

export default function NoteEntry({ entry, display }: { entry: NotationEntry; display: Display }) {
  const isScroll = display === "scroll";
  return (
    <article
      className={`group rounded-2xl bg-card shadow-paper p-5 ${isScroll ? "px-6 py-6" : ""}`}
    >
      <p
        className={`whitespace-pre-wrap font-sans ${
          isScroll ? "text-lg leading-relaxed" : "text-base leading-normal"
        }`}
      >
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
  return (
    <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
      <div className="font-mono text-xs text-muted-foreground">
        {entry.kind === "quote" && entry.pageNumber ? `p. ${entry.pageNumber} · ` : ""}
        {format(new Date(entry.createdAt), "MMM d, yyyy")} · {entry.book.title}
        {entry.book.author && <> · {entry.book.author}</>}
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
        <button
          onClick={onCopy}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition px-2 py-1 rounded-full"
          aria-label="Copy"
          title="Copy"
        >
          <Copy className="h-3 w-3" />
        </button>
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
          title="Weave (coming soon)"
          onClick={() => toast("Weave action coming in a follow-up build")}
        >
          <Network className="h-3 w-3" /> Weave
        </button>
      </div>
    </div>
  );
}
