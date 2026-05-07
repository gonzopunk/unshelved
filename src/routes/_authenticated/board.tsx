import { createFileRoute, Link } from "@tanstack/react-router";
import { useLibrary, useUpdateStatus, type BookStatus, type BookWithShelf } from "@/lib/queries";
import { DndContext, DragOverlay, PointerSensor, useDroppable, useDraggable, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core";
import { useMemo, useState } from "react";
import GeneratedCover from "@/components/GeneratedCover";

export const Route = createFileRoute("/_authenticated/board")({
  head: () => ({ meta: [{ title: "Board — Margins" }] }),
  component: BoardPage,
});

const COLUMNS: { id: BookStatus; label: string; tint: string }[] = [
  { id: "want", label: "Want to Read", tint: "var(--honey)" },
  { id: "reading", label: "Currently Reading", tint: "var(--sage)" },
  { id: "later", label: "Come Back Later", tint: "var(--dust)" },
  { id: "dnf", label: "DNF", tint: "var(--mist)" },
  { id: "loved", label: "Loved It", tint: "var(--terra)" },
  { id: "liked", label: "Liked It", tint: "var(--sage)" },
  { id: "meh", label: "Meh", tint: "var(--mist)" },
];

function BoardPage() {
  const { data: library = [] } = useLibrary();
  const updateStatus = useUpdateStatus();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const [activeId, setActiveId] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const out: Record<BookStatus, BookWithShelf[]> = { want: [], reading: [], later: [], dnf: [], loved: [], liked: [], meh: [] };
    for (const b of library) {
      const s = (b.user_books[0]?.status ?? "want") as BookStatus;
      out[s].push(b);
    }
    return out;
  }, [library]);

  const activeBook = library.find((b) => b.id === activeId);

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));
  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const bookId = String(e.active.id);
    const overId = e.over?.id;
    if (!overId) return;
    const targetStatus = String(overId) as BookStatus;
    const book = library.find((b) => b.id === bookId);
    const ub = book?.user_books[0];
    if (!ub || ub.status === targetStatus) return;
    updateStatus.mutate({ id: ub.id, status: targetStatus });
  };

  return (
    <main className="max-w-[100rem] mx-auto px-6">
      <header className="mb-6">
        <h1 className="font-display text-4xl">Board</h1>
        <p className="text-sm text-muted-foreground">Drag books between shelves to update them.</p>
      </header>
      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-6 -mx-6 px-6">
          {COLUMNS.map((col) => (
            <Column key={col.id} id={col.id} label={col.label} tint={col.tint} books={grouped[col.id]} />
          ))}
        </div>
        <DragOverlay>
          {activeBook && <MiniCard book={activeBook} dragging />}
        </DragOverlay>
      </DndContext>
    </main>
  );
}

function Column({ id, label, tint, books }: { id: BookStatus; label: string; tint: string; books: BookWithShelf[] }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={`w-72 shrink-0 rounded-3xl bg-card shadow-paper p-4 transition ${isOver ? "ring-2 ring-primary" : ""}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: tint }} />
          <h2 className="font-display text-lg">{label}</h2>
        </div>
        <span className="font-mono text-xs text-muted-foreground">{books.length}</span>
      </div>
      <div className="space-y-2 min-h-40">
        {books.map((b) => <MiniCard key={b.id} book={b} />)}
        {books.length === 0 && <div className="text-xs text-muted-foreground italic text-center py-8">empty shelf</div>}
      </div>
    </div>
  );
}

function MiniCard({ book, dragging }: { book: BookWithShelf; dragging?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: book.id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`rounded-2xl bg-paper border border-border p-2 flex gap-2 items-center cursor-grab active:cursor-grabbing transition ${isDragging ? "opacity-30" : ""} ${dragging ? "shadow-lift rotate-2" : "shadow-paper"}`}
    >
      <GeneratedCover book={book} className="w-10 h-14 rounded shrink-0" />
      <div className="min-w-0 flex-1">
        <Link
          to="/books/$bookId"
          params={{ bookId: book.id }}
          onPointerDown={(e) => e.stopPropagation()}
          className="font-display text-sm leading-tight line-clamp-2 hover:underline"
        >
          {book.title}
        </Link>
        <div className="text-[0.65rem] text-muted-foreground truncate">{book.author}</div>
      </div>
    </div>
  );
}
