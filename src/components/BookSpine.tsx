import { Link } from "@tanstack/react-router";
import type { Book } from "@/lib/queries";

export default function BookSpine({ book }: { book: Book }) {
  return (
    <Link
      to="/books/$bookId"
      params={{ bookId: book.id }}
      className="group relative block w-14 h-56 rounded-md shadow-paper hover:shadow-lift transition-all duration-300 hover:-translate-y-2 shrink-0"
      style={{ background: book.cover_color, color: book.cover_text_color }}
    >
      <div className="absolute inset-0 flex items-center justify-center [writing-mode:vertical-rl] rotate-180 px-2">
        <span className="font-display text-sm font-medium line-clamp-1">{book.title}</span>
      </div>
      <div className="absolute top-2 left-1/2 -translate-x-1/2 h-px w-6 opacity-30" style={{ background: book.cover_text_color }} />
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 h-px w-6 opacity-30" style={{ background: book.cover_text_color }} />
    </Link>
  );
}
