import { Link } from "@tanstack/react-router";
import { format } from "date-fns";
import type { BookWithShelf } from "@/lib/queries";
import { STATUS_LABELS, FORMAT_LABELS } from "@/lib/library-filter";

export default function LibraryList({ books }: { books: BookWithShelf[] }) {
  return (
    <div className="rounded-2xl bg-card shadow-paper overflow-hidden">
      <div className="grid grid-cols-[2.5rem_minmax(0,2.5fr)_minmax(0,1.5fr)_6rem_4rem] md:grid-cols-[2.5rem_minmax(0,2.5fr)_minmax(0,1.5fr)_6rem_4rem_5rem_5rem] items-center gap-3 px-4 py-2 border-b border-border text-[10px] uppercase tracking-widest font-mono text-muted-foreground">
        <span></span>
        <span>Title</span>
        <span>Author</span>
        <span>Status</span>
        <span>Rating</span>
        <span className="hidden md:block">Format</span>
        <span className="hidden md:block">Finished</span>
      </div>
      {books.map((b) => {
        const ub = b.user_books[0];
        if (!ub) return null;
        return (
          <Link
            key={b.id}
            to="/books/$bookId"
            params={{ bookId: b.id }}
            className="grid grid-cols-[2.5rem_minmax(0,2.5fr)_minmax(0,1.5fr)_6rem_4rem] md:grid-cols-[2.5rem_minmax(0,2.5fr)_minmax(0,1.5fr)_6rem_4rem_5rem_5rem] items-center gap-3 px-4 py-2.5 border-b border-border last:border-0 hover:bg-muted/40 transition"
          >
            <div
              className="h-8 w-7 rounded-sm shrink-0"
              style={{
                background: b.cover_secondary_color
                  ? `linear-gradient(135deg, ${b.cover_color}, ${b.cover_secondary_color})`
                  : b.cover_color,
              }}
            />
            <div className="truncate text-sm">{b.title}</div>
            <div className="truncate text-sm text-muted-foreground">{b.author}</div>
            <div className="text-xs">{STATUS_LABELS[ub.status]}</div>
            <div className="text-xs font-mono">
              {ub.rating ? "★".repeat(ub.rating) : "—"}
            </div>
            <div className="hidden md:block text-xs text-muted-foreground">
              {FORMAT_LABELS[b.format]}
            </div>
            <div className="hidden md:block text-xs font-mono text-muted-foreground">
              {ub.finished_at ? format(new Date(ub.finished_at), "MMM d, yyyy") : "—"}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
