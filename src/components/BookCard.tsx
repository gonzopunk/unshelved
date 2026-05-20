import { Link } from "@tanstack/react-router";
import { format } from "date-fns";
import type { Book, UserBook } from "@/lib/queries";
import SampleBadge from "@/components/SampleBadge";

type Props = {
  book: Book;
  userBook: UserBook;
  tilt?: number;
};

const FMT_LABEL: Record<string, string> = { print: "Print", ebook: "Ebook", audiobook: "Audiobook" };

function FmtIcon({ format: f }: { format: string }) {
  const common = { width: 11, height: 11, fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (f === "print") return (
    <svg viewBox="0 0 24 24" {...common}><path d="M4 5c0-.55.45-1 1-1h6v16H5c-.55 0-1-.45-1-1V5z" /><path d="M20 5c0-.55-.45-1-1-1h-6v16h6c.55 0 1-.45 1-1V5z" /></svg>
  );
  if (f === "ebook") return (
    <svg viewBox="0 0 24 24" {...common}><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 17h6" /></svg>
  );
  return (
    <svg viewBox="0 0 24 24" {...common}><path d="M4 14v-2a8 8 0 0116 0v2" /><path d="M4 14a2 2 0 002 2h1v-5H6a2 2 0 00-2 2v1z" /><path d="M20 14a2 2 0 01-2 2h-1v-5h1a2 2 0 012 2v1z" /></svg>
  );
}

function fmtTime(s: number | null | undefined) {
  if (!s) return "0m";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function BookCard({ book, userBook, tilt = 0 }: Props) {
  const isPrint = book.format === "print";
  const isEbook = book.format === "ebook";
  const isAudio = book.format === "audiobook";
  const finished = ["loved", "liked", "meh"].includes(userBook.status);
  const paused = !!userBook.paused;

  const pct = (() => {
    if (userBook.total_pages && userBook.current_page != null) return Math.min(100, Math.round((userBook.current_page / userBook.total_pages) * 100));
    if (userBook.total_seconds && userBook.current_seconds != null) return Math.min(100, Math.round((userBook.current_seconds / userBook.total_seconds) * 100));
    return Math.min(100, Math.round(Number(userBook.progress_pct ?? 0)));
  })();

  const started = userBook.started_at ? format(new Date(userBook.started_at), "MMM d") : "—";

  return (
    <Link
      to="/books/$bookId"
      params={{ bookId: book.id }}
      className={"bc-card" + (paused ? " paused" : "") + (finished ? " finished" : "")}
      style={{ transform: `rotate(${tilt}deg)` }}
    >
      <div className="bc-cover-wrap relative">
        {book.is_sample && <SampleBadge />}
        {isPrint && !finished && (
          <div className="bookmark-ribbon" style={{ ["--bk" as string]: book.bookmark_color }}>
            <div className="rb-body" />
            <div className="rb-notch" />
          </div>
        )}
        {isAudio && (
          <div className="audio-spool">
            {[6, 10, 14, 8, 12, 6].map((h, i) => <div key={i} className="bar" style={{ height: h + "px" }} />)}
          </div>
        )}

        <div
          className={"bc-cover" + (isEbook ? " screen" : "")}
          style={{
            background: book.cover_secondary_color
              ? `linear-gradient(135deg, ${book.cover_color} 0%, ${book.cover_color} 55%, ${book.cover_secondary_color} 100%)`
              : book.cover_color,
            color: book.cover_text_color,
          }}
        >
          {book.cover_url && (
            <img
              src={book.cover_url}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
            />
          )}
          {isEbook && (
            <div className="ebook-track">
              <div className="ebook-dot" style={{ top: `${Math.max(5, Math.min(95, pct))}%` }} />
            </div>
          )}
          {!book.cover_url && (
            <div className="cv-meta">
              <div className="cv-rule" />
              <div className="cv-title">{book.title}</div>
              <div className="cv-author">{book.author}</div>
            </div>
          )}
          {finished && <div className="finished-stamp">Finished</div>}
        </div>
      </div>

      <div className="bc-body hidden md:block">
        <div className="bc-titlerow">
          <div className="bc-title-text line-clamp-2">{book.title}</div>
          <div className={"bc-fmt-pill " + book.format}>
            <FmtIcon format={book.format} /> {FMT_LABEL[book.format]}
          </div>
        </div>
        <div className="bc-author">{book.author}</div>

        <div className="bc-prog-row">
          {isPrint && (
            <>
              <span>p. {userBook.current_page ?? 0} <span className="pct">/ {userBook.total_pages ?? "?"}</span></span>
              <span className="pct">{pct}%</span>
            </>
          )}
          {isEbook && (
            <>
              <span>loc {userBook.current_page ?? 0}{userBook.total_pages ? ` / ${userBook.total_pages}` : ""}</span>
              <span className="pct">{pct}%</span>
            </>
          )}
          {isAudio && (
            <>
              <span>{fmtTime(userBook.current_seconds)} <span className="pct">/ {fmtTime(userBook.total_seconds)}</span></span>
              <span className="pct">{pct}%</span>
            </>
          )}
        </div>

        <div className={"bc-bar" + (isEbook ? " ebook-style" : "")}>
          <div className={"bc-fill " + book.format} style={{ width: `${pct}%` }} />
        </div>

        <div className="bc-meta">
          <span className="bc-started">Started {started}</span>
          {paused && <><span className="sep">·</span><span>Paused</span></>}
          {finished && userBook.finished_at && (
            <><span className="sep">·</span><span>Finished {format(new Date(userBook.finished_at), "MMM d")}</span></>
          )}
        </div>
      </div>
    </Link>
  );
}
