import { Link } from "@tanstack/react-router";
import GeneratedCover from "./GeneratedCover";
import type { Book, UserBook } from "@/lib/queries";

type Props = {
  book: Book;
  userBook: UserBook;
  variant?: "grid" | "compact";
};

function fmtTime(s: number | null | undefined) {
  if (!s) return "0:00";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function BookCard({ book, userBook }: Props) {
  const finished = userBook.status === "loved" || userBook.status === "liked" || userBook.status === "meh";
  const paused = userBook.paused;
  const pct = Number(userBook.progress_pct ?? 0);

  return (
    <Link
      to="/books/$bookId"
      params={{ bookId: book.id }}
      className="group relative block rounded-3xl bg-card shadow-paper hover:shadow-lift transition-all duration-300 hover:-translate-y-1 overflow-hidden"
    >
      <div className="flex gap-4 p-4">
        <div className="relative shrink-0">
          <GeneratedCover book={book} className="w-20 h-28 rounded-lg shadow-lift" />
          {book.format === "print" && (
            <div
              className="absolute -top-1 right-2 w-3 h-10"
              style={{ background: book.bookmark_color, clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%)" }}
            />
          )}
          {book.format === "audiobook" && (
            <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-paper border border-border flex items-end justify-center gap-0.5 p-1.5">
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className="wave-bar w-0.5 bg-terra rounded-full" style={{ height: "100%", animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          )}
          {book.format === "ebook" && (
            <div className="absolute right-1 top-2 bottom-2 w-1 rounded-full bg-mist overflow-hidden">
              <div className="bg-honey w-full rounded-full" style={{ height: `${pct}%` }} />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-display text-lg leading-tight truncate">{book.title}</h3>
              <p className="text-xs text-muted-foreground truncate">{book.author}</p>
            </div>
            <span className="text-[0.6rem] uppercase tracking-widest font-mono text-muted-foreground shrink-0">{book.format}</span>
          </div>

          <ProgressBar userBook={userBook} format={book.format} paused={paused} />

          <div className="mt-2 flex items-center justify-between font-mono text-[0.7rem] text-muted-foreground">
            {book.format === "audiobook" ? (
              <span>{fmtTime(userBook.current_seconds)} / {fmtTime(userBook.total_seconds)}</span>
            ) : book.format === "ebook" ? (
              <span>Loc {userBook.current_page ?? 0} · {Math.round(pct)}%</span>
            ) : (
              <span>p. {userBook.current_page ?? 0} / {userBook.total_pages ?? "?"}</span>
            )}
            <span>{Math.round(pct)}%</span>
          </div>
        </div>
      </div>

      {finished && (
        <>
          <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(135deg, rgba(111,179,122,0.18), rgba(209,118,72,0.12))" }} />
          <div
            className="absolute top-4 right-4 px-2 py-1 border-2 border-terra text-terra font-mono text-[0.6rem] tracking-widest rotate-[-8deg] rounded"
            style={{ boxShadow: "inset 0 0 0 1px var(--terra)" }}
          >
            FINISHED
          </div>
        </>
      )}
    </Link>
  );
}

function ProgressBar({ userBook, format, paused }: { userBook: UserBook; format: string; paused: boolean }) {
  const pct = Math.min(100, Math.max(0, Number(userBook.progress_pct ?? 0)));
  if (paused) {
    return <div className="mt-3 h-2 rounded-full stripe-bar bg-mist overflow-hidden" />;
  }
  if (format === "ebook") {
    return (
      <div className="mt-3 h-2 rounded-full bg-mist overflow-hidden relative">
        <div className="absolute inset-y-0 left-0 dashed-bar" style={{ width: `${pct}%` }} />
      </div>
    );
  }
  const color = format === "audiobook" ? "var(--terra)" : "var(--forest)";
  return (
    <div className="mt-3 h-2 rounded-full bg-mist overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}
