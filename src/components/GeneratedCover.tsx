import type { Book, UserBook } from "@/lib/queries";

type CoverBook = Pick<Book, "title" | "author" | "cover_color" | "cover_text_color"> &
  Partial<Pick<Book, "cover_url" | "cover_secondary_color">>;

export default function GeneratedCover({ book, className = "", style }: { book: CoverBook; className?: string; style?: React.CSSProperties }) {
  const sec = book.cover_secondary_color;
  const bg = sec
    ? `linear-gradient(135deg, ${book.cover_color} 0%, ${book.cover_color} 55%, ${sec} 100%)`
    : book.cover_color;
  if (book.cover_url) {
    return (
      <div className={`relative overflow-hidden ${className}`} style={{ background: bg, ...style }}>
        <img src={book.cover_url} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
      </div>
    );
  }
  return (
    <div
      className={`relative flex flex-col justify-between p-3 font-display ${className}`}
      style={{ background: bg, color: book.cover_text_color, ...style }}
    >
      <div className="text-[0.65rem] uppercase tracking-[0.2em] opacity-70">Unshelved</div>
      <div>
        <div className="text-base leading-tight font-semibold line-clamp-4">{book.title}</div>
        {book.author && <div className="mt-1 text-[0.7rem] opacity-80 italic">{book.author}</div>}
      </div>
      <div className="absolute inset-0 pointer-events-none mix-blend-overlay opacity-20" style={{ background: "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.4), transparent 60%)" }} />
    </div>
  );
}

export function spineStyle(book: Pick<Book, "cover_color" | "cover_text_color"> & Partial<Pick<Book, "cover_secondary_color">>): React.CSSProperties {
  const sec = book.cover_secondary_color;
  return {
    background: sec
      ? `linear-gradient(180deg, ${sec} 0%, ${sec} 6%, ${book.cover_color} 6%, ${book.cover_color} 94%, ${sec} 94%, ${sec} 100%)`
      : book.cover_color,
    color: book.cover_text_color,
  };
}

export type CardBook = Book & { user_books: UserBook[] };
