import { Link } from "@tanstack/react-router";
import { useLibrary, useReorderBoard, type BookStatus, type BookWithShelf, type UserBook } from "@/lib/queries";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMemo, useState } from "react";
import { format, formatDistanceToNow } from "date-fns";


type ColDef = {
  id: BookStatus;
  title: string;
  sub: string;
  accent: string;
  icon?: string;
};

const SHELVES: ColDef[] = [
  { id: "want", title: "Want to Read", sub: "queued up", accent: "var(--sage)" },
  { id: "reading", title: "Currently Reading", sub: "in progress", accent: "var(--terra)" },
  { id: "later", title: "Come Back Later", sub: "paused, no rush", accent: "var(--dust)" },
  { id: "dnf", title: "DNF", sub: "set down for now", accent: "rgba(31,38,48,0.4)" },
];

const RATINGS: ColDef[] = [
  { id: "loved", title: "Loved It", sub: "5 stars · keep close", accent: "var(--terra)", icon: "♥" },
  { id: "liked", title: "Liked It", sub: "4 stars · glad I read", accent: "var(--sage)", icon: "★" },
  { id: "meh", title: "Meh", sub: "1–3 stars · onward", accent: "rgba(31,38,48,0.4)", icon: "·" },
];

const FMT_LABEL: Record<string, string> = { print: "Print", ebook: "Ebook", audiobook: "Audio" };

const ALL_COL_IDS: BookStatus[] = ["want", "reading", "later", "dnf", "loved", "liked", "meh"];

export default function LibraryBoard() {
  const { data: library = [] } = useLibrary();
  const reorder = useReorderBoard();
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  );
  const [activeId, setActiveId] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const out: Record<BookStatus, BookWithShelf[]> = {
      want: [], reading: [], later: [], dnf: [], loved: [], liked: [], meh: [],
    };
    for (const b of library) {
      const s = (b.user_books[0]?.status ?? "want") as BookStatus;
      if (out[s]) out[s].push(b);
    }
    // Sort each column by board_position (nulls last, then by created_at desc as fallback).
    for (const k of Object.keys(out) as BookStatus[]) {
      out[k].sort((a, b) => {
        const pa = a.user_books[0]?.board_position;
        const pb = b.user_books[0]?.board_position;
        if (pa == null && pb == null) {
          return (b.created_at ?? "").localeCompare(a.created_at ?? "");
        }
        if (pa == null) return 1;
        if (pb == null) return -1;
        return pa - pb;
      });
    }
    return out;
  }, [library]);

  const activeBook = library.find((b) => b.id === activeId) ?? null;
  const activeCol = activeBook?.user_books[0]?.status as BookStatus | undefined;

  const findContainer = (id: string): BookStatus | null => {
    if (ALL_COL_IDS.includes(id as BookStatus)) return id as BookStatus;
    const book = library.find((b) => b.id === id);
    return (book?.user_books[0]?.status as BookStatus | undefined) ?? null;
  };

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));

  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const activeIdStr = String(e.active.id);
    const overId = e.over?.id ? String(e.over.id) : null;
    if (!overId) return;

    const sourceCol = findContainer(activeIdStr);
    const targetCol = findContainer(overId);
    if (!sourceCol || !targetCol) return;

    const activeBook = library.find((b) => b.id === activeIdStr);
    const activeUb = activeBook?.user_books[0];
    if (!activeBook || !activeUb) return;

    // Compute the target list after the move.
    const sourceList = grouped[sourceCol].filter((b) => b.id !== activeIdStr);
    const targetListBase = sourceCol === targetCol ? sourceList : grouped[targetCol].slice();

    let insertIndex: number;
    if (ALL_COL_IDS.includes(overId as BookStatus)) {
      insertIndex = targetListBase.length;
    } else {
      insertIndex = targetListBase.findIndex((b) => b.id === overId);
      if (insertIndex < 0) insertIndex = targetListBase.length;
    }

    const newTargetList = targetListBase.slice();
    newTargetList.splice(insertIndex, 0, activeBook);

    // No-op if order and column unchanged.
    if (sourceCol === targetCol) {
      const oldIdx = grouped[sourceCol].findIndex((b) => b.id === activeIdStr);
      if (oldIdx === insertIndex) return;
    }

    // Build update list: reassign board_position for the entire target column,
    // and (if cross-column) compact the source column too.
    const updates: { id: string; status: BookStatus; board_position: number }[] = [];
    newTargetList.forEach((b, i) => {
      const ub = b.user_books[0];
      if (!ub) return;
      updates.push({ id: ub.id, status: targetCol, board_position: i });
    });
    if (sourceCol !== targetCol) {
      sourceList.forEach((b, i) => {
        const ub = b.user_books[0];
        if (!ub) return;
        updates.push({ id: ub.id, status: sourceCol, board_position: i });
      });
    }
    reorder.mutate(updates);
  };

  const onDragOver = (_e: DragOverEvent) => {
    // Live cross-column reordering could go here; the optimistic onDragEnd is enough for snappy feel.
  };


  return (
    <div className="bv">
      <DndContext sensors={sensors} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd}>
        <section className="bv-section">
          <div className="bv-section-head">
            <h2>Shelves</h2>
            <span className="bv-rule" />
            <span className="bv-section-hint">drag to reorder or move between columns ↔</span>
          </div>
          <div className="bv-cols cols-4">
            {SHELVES.map((col) => (
              <Column key={col.id} col={col} books={grouped[col.id]} />
            ))}
          </div>
        </section>

        <section className="bv-section">
          <div className="bv-section-head">
            <h2>Rated</h2>
            <span className="bv-rule" />
            <span className="bv-section-hint">books you've finished</span>
          </div>
          <div className="bv-cols cols-3">
            {RATINGS.map((col) => (
              <Column key={col.id} col={col} books={grouped[col.id]} />
            ))}
          </div>
        </section>

        <DragOverlay dropAnimation={null}>
          {activeBook && activeCol && <MiniCard book={activeBook} colId={activeCol} overlay />}
        </DragOverlay>
      </DndContext>

      <BoardStyles />
    </div>
  );
}


function Column({ col, books }: { col: ColDef; books: BookWithShelf[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id });
  return (
    <div
      ref={setNodeRef}
      className={"col" + (isOver ? " hovered" : "")}
      style={{ ["--col-accent" as string]: col.accent }}
    >
      <div className="col-head">
        <div className="col-head-left">
          <span className="col-dot" style={{ background: col.accent }} />
          <div>
            <div className="col-title-text">
              {col.title}
              {col.icon && <span className="col-rating-icon">{col.icon}</span>}
            </div>
            <div className="col-sub">{col.sub}</div>
          </div>
        </div>
        <div className="col-count">{books.length}</div>
      </div>
      <SortableContext items={books.map((b) => b.id)} strategy={verticalListSortingStrategy}>
        <div className="col-cards">
          {books.length === 0 && <div className="col-empty">empty</div>}
          {books.map((b) => (
            <MiniCard key={b.id} book={b} colId={col.id} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

function MiniCard({ book, colId, overlay }: { book: BookWithShelf; colId: BookStatus; overlay?: boolean }) {
  const sortable = useSortable({ id: book.id, disabled: overlay });
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = sortable;
  const style = overlay
    ? undefined
    : {
        transform: CSS.Transform.toString(transform),
        transition,
      };
  const ub = book.user_books[0] as UserBook | undefined;
  const isPrint = book.format === "print";
  const isEbook = book.format === "ebook";
  const isAudio = book.format === "audiobook";
  const paused = !!ub?.paused;

  const pct = (() => {
    if (!ub) return 0;
    if (ub.total_pages && ub.current_page != null) return Math.round((ub.current_page / ub.total_pages) * 100);
    if (ub.total_seconds && ub.current_seconds != null) return Math.round((ub.current_seconds / ub.total_seconds) * 100);
    return Math.round(Number(ub.progress_pct ?? 0));
  })();

  const showProgress = ub && (colId === "reading" || colId === "later");
  const showRating = ub?.rating && (colId === "loved" || colId === "liked" || colId === "meh");
  const showDnf = colId === "dnf" && ub?.current_page;
  const showAdded = colId === "want";

  const fmtTime = (s: number | null | undefined) => {
    if (!s) return "0m";
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={"mc" + (isDragging && !overlay ? " dragging" : "") + (paused ? " paused" : "") + (overlay ? " overlay" : "")}
    >
      <div className="mc-cover-wrap">
        {isPrint && <div className="mc-bookmark" style={{ ["--bk" as string]: book.bookmark_color }} />}
        {isAudio && (
          <div className="mc-spool">
            {[3, 5, 7, 4, 6].map((h, i) => <div key={i} className="b" style={{ height: h + "px" }} />)}
          </div>
        )}
        <div
          className={"mc-cover" + (isEbook ? " screen" : "")}
          style={{ background: book.cover_color, color: book.cover_text_color }}
        >
          <div className="mc-cover-rule" />
          <div className="mc-cover-title">{book.title}</div>
          {isEbook && showProgress && (
            <div className="mc-screen-dot" style={{ top: `${Math.max(5, Math.min(95, pct))}%` }} />
          )}
        </div>
      </div>

      <div className="mc-info">
        <Link
          to="/books/$bookId"
          params={{ bookId: book.id }}
          onPointerDown={(e) => e.stopPropagation()}
          className="mc-title-link"
        >
          <div className="mc-title">{book.title}</div>
        </Link>
        <div className="mc-author">{book.author}</div>
        <div className="mc-meta">
          <span className={"mc-fmt " + book.format}>{FMT_LABEL[book.format]}</span>
          {showAdded && book.created_at && (
            <><span className="sep">·</span><span className="mc-mono">added {format(new Date(book.created_at), "MMM d")}</span></>
          )}
          {showProgress && isPrint && ub?.total_pages && (
            <><span className="sep">·</span><span className="mc-mono">p. {ub.current_page ?? 0}/{ub.total_pages}</span></>
          )}
          {showProgress && isAudio && (
            <><span className="sep">·</span><span className="mc-mono">{fmtTime(ub?.current_seconds)}</span></>
          )}
          {showProgress && isEbook && (
            <><span className="sep">·</span><span className="mc-mono">{pct}%</span></>
          )}
          {showRating && ub?.finished_at && (
            <><span className="sep">·</span><span className="mc-mono">{format(new Date(ub.finished_at), "MMM d")}</span></>
          )}
          {showDnf && (
            <><span className="sep">·</span><span className="mc-dnf">stopped p.{ub?.current_page}</span></>
          )}
          {colId === "later" && ub?.started_at && (
            <><span className="sep">·</span><span className="mc-mono">{formatDistanceToNow(new Date(ub.started_at), { addSuffix: true })}</span></>
          )}
        </div>
        {showProgress && (
          <div className={"mc-bar" + (isEbook ? " ebook-style" : "")}>
            <div className={"mc-fill " + book.format} style={{ width: `${pct}%` }} />
          </div>
        )}
        {showRating && (
          <div className="mc-rating">
            {[1, 2, 3, 4, 5].map((n) => (
              <span key={n} className={"star " + (n <= (ub?.rating ?? 0) ? "on" : "")}>●</span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

function BoardStyles() {
  return (
    <style>{`
      .bv {
        font-family: 'Manrope', system-ui, sans-serif;
        color: var(--ink);
      }


      .bv-section { margin-bottom: 40px; }
      .bv-section-head { display: flex; align-items: center; gap: 16px; margin-bottom: 18px; }
      .bv-section-head h2 {
        font-family: 'Newsreader', serif; font-size: 24px; font-weight: 500;
        margin: 0; letter-spacing: -0.01em;
      }
      .bv-rule { flex: 1; height: 1px; background: var(--mist); }
      .bv-section-hint {
        font-size: 12px; letter-spacing: 0.04em;
        color: rgba(31,38,48,0.5); font-family: 'JetBrains Mono', monospace;
      }

      .bv-cols { display: grid; gap: 16px; overflow-x: auto; -webkit-overflow-scrolling: touch; padding-bottom: 8px; }
      .bv-cols.cols-4 { grid-template-columns: repeat(4, minmax(280px, 1fr)); }
      .bv-cols.cols-3 { grid-template-columns: repeat(3, minmax(280px, 1fr)); }

      .col {
        background: var(--paper); border-radius: 20px;
        padding: 16px 14px 14px;
        box-shadow: 0 1px 0 rgba(31,38,48,0.04), 0 18px 40px -28px rgba(31,38,48,0.22);
        display: flex; flex-direction: column;
        min-height: 360px;
        transition: background 0.2s ease, box-shadow 0.2s ease;
      }
      .col.hovered {
        background: #F4F8E9;
        box-shadow: 0 1px 0 rgba(31,38,48,0.04), 0 18px 40px -28px rgba(31,38,48,0.22), inset 0 0 0 2px var(--sage);
      }
      .col-head {
        display: flex; align-items: center; justify-content: space-between;
        padding: 0 6px 12px; margin-bottom: 10px;
        border-bottom: 1px solid var(--mist);
      }
      .col-head-left { display: flex; align-items: center; gap: 10px; }
      .col-dot { width: 8px; height: 8px; border-radius: 50%; }
      .col-title-text { font-family: 'Newsreader', serif; font-size: 18px; font-weight: 500; letter-spacing: -0.01em; }
      .col-sub { font-size: 11px; color: rgba(31,38,48,0.5); letter-spacing: 0.04em; }
      .col-count {
        padding: 3px 9px; border-radius: 999px;
        background: var(--cream); font-family: 'JetBrains Mono', monospace;
        font-size: 11px; color: rgba(31,38,48,0.6);
      }
      .col-rating-icon { font-size: 14px; color: var(--col-accent, var(--terra)); margin-left: 4px; }

      .col-cards { display: flex; flex-direction: column; gap: 8px; flex: 1; }
      .col-empty {
        padding: 28px 14px; text-align: center; font-size: 12px;
        color: rgba(31,38,48,0.4);
        border: 1.5px dashed rgba(31,38,48,0.12);
        border-radius: 14px; font-family: 'Newsreader', serif; font-style: italic;
      }

      .mc {
        display: grid; grid-template-columns: 56px 1fr; gap: 12px;
        padding: 10px; background: var(--cream); border-radius: 14px;
        cursor: grab; position: relative;
        transition: transform 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease;
      }
      .mc:hover {
        transform: translateY(-2px);
        box-shadow: 0 1px 0 rgba(31,38,48,0.06), 0 14px 24px -16px rgba(31,38,48,0.28);
        background: #F0F0E5;
      }
      .mc:active { cursor: grabbing; }
      .mc.dragging {
        opacity: 0;
        pointer-events: none;
        transition: none;
      }
      .mc.overlay {
        box-shadow: 0 1px 0 rgba(31,38,48,0.06), 0 22px 40px -16px rgba(31,38,48,0.4);
        transform: rotate(-2deg); background: #F0F0E5;
      }

      .mc-cover-wrap { position: relative; }
      .mc-cover {
        width: 56px; aspect-ratio: 2/3;
        border-radius: 2px 6px 6px 2px;
        padding: 6px 5px;
        font-family: 'Newsreader', serif;
        display: flex; flex-direction: column; justify-content: flex-end;
        position: relative; overflow: hidden;
        box-shadow: inset 3px 0 0 rgba(0,0,0,0.16), 0 4px 8px -4px rgba(31,38,48,0.4);
      }
      .mc-cover::before {
        content: ""; position: absolute; top: 0; left: 0; right: 0; height: 35%;
        background: linear-gradient(180deg, rgba(255,255,255,0.10), transparent);
      }
      .mc-cover::after {
        content: ""; position: absolute; top: 2px; bottom: 2px; right: 0;
        width: 2px;
        background: repeating-linear-gradient(90deg, rgba(0,0,0,0.18) 0 1px, rgba(255,255,255,0.4) 1px 2px);
        opacity: 0.5;
      }
      .mc-cover.screen::after {
        background: rgba(255,255,255,0.22); width: 1.5px; right: 3px; top: 5px; bottom: 5px;
      }
      .mc-screen-dot {
        position: absolute; right: 3px; width: 4px; height: 4px;
        background: var(--paper); border-radius: 50%;
        transform: translate(50%, -50%);
        box-shadow: 0 0 0 1px rgba(0,0,0,0.2); z-index: 1;
      }
      .mc-cover-title { font-size: 8px; line-height: 1.05; font-weight: 500; }
      .mc-cover-rule { height: 1px; background: currentColor; opacity: 0.4; width: 50%; margin-bottom: 4px; }

      .mc-bookmark {
        position: absolute; top: -3px; left: 50%;
        transform: translateX(-50%);
        width: 6px; height: 24px;
        background: var(--bk, var(--terra));
        border-radius: 1px 1px 0 0; z-index: 2;
        box-shadow: 0 2px 3px rgba(31,38,48,0.3);
      }
      .mc-bookmark::before {
        content: ""; position: absolute; top: 0; left: 0; bottom: 0;
        width: 2px; background: linear-gradient(90deg, rgba(0,0,0,0.22), transparent);
      }
      .mc-bookmark::after {
        content: ""; position: absolute; left: 0; right: 0; bottom: -3px;
        height: 4px; background: var(--bk, var(--terra));
        clip-path: polygon(0 0, 100% 0, 100% 100%, 50% 50%, 0 100%);
      }

      .mc-spool {
        position: absolute; top: 3px; right: 3px;
        padding: 2px 4px; background: rgba(0,0,0,0.35);
        border-radius: 999px; display: flex; gap: 1.5px; align-items: center; z-index: 2;
      }
      .mc-spool .b { width: 1.2px; background: rgba(250,251,243,0.95); border-radius: 1px; }

      .mc-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
      .mc-title-link { text-decoration: none; color: inherit; }
      .mc-title-link:hover .mc-title { text-decoration: underline; }
      .mc-title {
        font-family: 'Newsreader', serif; font-size: 14.5px; font-weight: 500;
        letter-spacing: -0.005em; line-height: 1.15; color: var(--ink);
        overflow: hidden; text-overflow: ellipsis;
        display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
      }
      .mc-author {
        font-size: 11.5px; color: rgba(31,38,48,0.6);
        overflow: hidden; white-space: nowrap; text-overflow: ellipsis;
      }
      .mc-meta {
        display: flex; align-items: center; gap: 5px; flex-wrap: wrap;
        margin-top: 4px; font-size: 10.5px; color: rgba(31,38,48,0.55);
      }
      .mc-fmt {
        padding: 2px 6px; border-radius: 999px;
        font-size: 9.5px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase;
      }
      .mc-fmt.print { background: rgba(111,179,122,0.18); color: #2F6638; }
      .mc-fmt.ebook { background: rgba(45,106,149,0.16); color: #1F5266; }
      .mc-fmt.audiobook { background: rgba(209,118,72,0.18); color: #A85428; }

      .mc-mono { font-family: 'JetBrains Mono', monospace; font-size: 10px; }
      .sep { color: rgba(31,38,48,0.25); }

      .mc-bar {
        margin-top: 6px; height: 4px; background: var(--mist);
        border-radius: 999px; overflow: hidden; position: relative;
      }
      .mc-bar.ebook-style {
        background: repeating-linear-gradient(90deg, var(--mist) 0 2px, transparent 2px 3px);
        background-color: rgba(31,38,48,0.05); height: 3px;
      }
      .mc-fill { height: 100%; border-radius: 999px; }
      .mc-fill.print { background: var(--sage); }
      .mc-fill.ebook { background: var(--forest); }
      .mc-fill.audiobook { background: var(--terra); }
      .mc.paused .mc-fill {
        opacity: 0.55;
        background-image: repeating-linear-gradient(45deg, rgba(255,255,255,0.4) 0 3px, transparent 3px 6px);
      }

      .mc-rating { display: flex; gap: 2px; align-items: center; margin-top: 4px; }
      .mc-rating .star { font-size: 9px; color: rgba(31,38,48,0.18); }
      .mc-rating .star.on { color: var(--terra); }

      .mc-dnf {
        padding: 1px 6px; border-radius: 4px;
        background: rgba(31,38,48,0.08); font-size: 10px;
        color: rgba(31,38,48,0.55); font-style: italic;
      }
    `}</style>
  );
}
