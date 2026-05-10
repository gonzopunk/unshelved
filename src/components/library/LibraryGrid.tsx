import BookCard from "@/components/BookCard";
import type { BookWithShelf } from "@/lib/queries";

export default function LibraryGrid({ books }: { books: BookWithShelf[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
      {books.map((b) => {
        const ub = b.user_books[0];
        if (!ub) return null;
        return <BookCard key={b.id} book={b} userBook={ub} />;
      })}
    </div>
  );
}
