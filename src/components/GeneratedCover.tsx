import type { Book, UserBook } from "@/lib/queries";

export default function GeneratedCover({ book, className = "", style }: { book: Pick<Book, "title" | "author" | "cover_color" | "cover_text_color">; className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`relative flex flex-col justify-between p-3 font-display ${className}`}
      style={{ background: book.cover_color, color: book.cover_text_color, ...style }}
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

export function spineStyle(book: Pick<Book, "cover_color" | "cover_text_color">): React.CSSProperties {
  return { background: book.cover_color, color: book.cover_text_color };
}

export type CardBook = Book & { user_books: UserBook[] };
