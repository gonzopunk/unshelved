import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useBookDetail, useUpdateProgress, useUpdateStatus, useUpdateRating, type BookStatus } from "@/lib/queries";
import GeneratedCover from "@/components/GeneratedCover";
import SampleBadge from "@/components/SampleBadge";
import StarRating from "@/components/StarRating";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pause, Play, Pencil, Trash2, Network } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AddBookModal from "@/components/AddBookModal";
import AddConnectionModal from "@/components/AddConnectionModal";
import QuickTagBar from "@/components/QuickTagBar";
import ConnectionCard, { type EndpointInfo } from "@/components/ConnectionCard";
import { useBookConnections, useReferenceBooks, type ConnectionKind, type Connection } from "@/lib/weave";
import { useLibrary } from "@/lib/queries";
import { format } from "date-fns";
import { toast } from "sonner";
import NewSessionCard from "@/components/sessions/NewSessionCard";
import SessionRow from "@/components/sessions/SessionRow";
import PaceStrip from "@/components/sessions/PaceStrip";
import RhythmStrip from "@/components/sessions/RhythmStrip";


export const Route = createFileRoute("/_authenticated/books/$bookId")({
  validateSearch: (search: Record<string, unknown>) => ({
    tab: typeof search.tab === "string" ? search.tab : "notes",
  }),
  component: BookDetail,
});

const SHELVES: { value: BookStatus; label: string }[] = [
  { value: "want", label: "Want to Read" },
  { value: "reading", label: "Currently Reading" },
  { value: "later", label: "Come Back Later" },
  { value: "dnf", label: "DNF" },
  { value: "loved", label: "Loved It" },
  { value: "liked", label: "Liked It" },
  { value: "meh", label: "Meh" },
];

function BookDetail() {
  const { bookId } = Route.useParams();
  const { data, isLoading } = useBookDetail(bookId);
  const updateStatus = useUpdateStatus();
  const updateProgress = useUpdateProgress();
  const updateRating = useUpdateRating();
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { tab } = Route.useSearch();
  const [editOpen, setEditOpen] = useState(false);
  const [weaveSource, setWeaveSource] = useState<{ kind: ConnectionKind; id: string; label: string } | null>(null);
  const [editingConn, setEditingConn] = useState<Connection | null>(null);

  if (!user) {
    return <div className="text-center py-20 text-muted-foreground">Loading…</div>;
  }
  if (isLoading || !data) {
    return <div className="text-center py-20 text-muted-foreground">Loading…</div>;
  }
  const { book, userBook, sessions, notes, highlights } = data;
  if (!book) {
    return <div className="text-center py-20 text-muted-foreground">Loading…</div>;
  }
  if (!userBook) {
    return <div className="text-center py-20 text-muted-foreground">No shelf info for this book.</div>;
  }
  const pct = Number(userBook.progress_pct ?? 0);

  const setProgress = (val: number) => {
    if (book.format === "audiobook") {
      const total = userBook.total_seconds ?? 0;
      updateProgress.mutate({ id: userBook.id, current_seconds: Math.round((val / 100) * total), progress_pct: val });
    } else {
      const total = userBook.total_pages ?? 0;
      updateProgress.mutate({ id: userBook.id, current_page: Math.round((val / 100) * total), progress_pct: val });
    }
  };

  const deleteBook = async () => {
    if (!confirm("Remove this book from your library?")) return;

    // Check whether this book is an endpoint in any connection.
    const { data: connData } = await supabase
      .from("connections")
      .select("id, source_id, target_id")
      .or(`source_id.eq.${book.id},target_id.eq.${book.id}`);

    if (connData && connData.length > 0) {
      // Preserve the book's identity as a reference so connections
      // remain readable after the book is removed from the library.
      const { data: refBook, error: refError } = await supabase
        .from("reference_books")
        .insert({ user_id: user!.id, title: book.title, author: book.author })
        .select()
        .single();

      if (refError) {
        toast.error("Could not preserve connections — book not deleted.");
        return;
      }

      const sourceIds = connData
        .filter((c) => c.source_id === book.id)
        .map((c) => c.id);
      const targetIds = connData
        .filter((c) => c.target_id === book.id)
        .map((c) => c.id);

      if (sourceIds.length > 0) {
        await supabase
          .from("connections")
          .update({ source_kind: "reference_book" as const, source_id: refBook.id })
          .in("id", sourceIds);
      }
      if (targetIds.length > 0) {
        await supabase
          .from("connections")
          .update({ target_kind: "reference_book" as const, target_id: refBook.id })
          .in("id", targetIds);
      }
    }

    await supabase.from("books").delete().eq("id", book.id);
    qc.invalidateQueries({ queryKey: ["library"] });
    qc.invalidateQueries({ queryKey: ["connections"] });
    qc.invalidateQueries({ queryKey: ["reference_books"] });
    toast.success("Removed");
    navigate({ to: "/" });
  };

  return (
    <main className="max-w-5xl mx-auto px-6">
      <button
        onClick={() => window.history.back()}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-ink mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="grid md:grid-cols-[220px_1fr] gap-8 items-start">
        <GeneratedCover book={book} className="w-full aspect-[3/4] rounded-2xl shadow-lift" />

        <div>
          <div className="flex items-center gap-2">
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">{book.format}</p>
            {book.is_sample && <SampleBadge variant="inline" />}
          </div>
          <h1 className="font-display text-4xl md:text-5xl mt-1">{book.title}</h1>
          <p className="text-lg text-muted-foreground mt-1">{book.author}</p>

          <div className="mt-3">
            <StarRating
              value={userBook.rating}
              size={24}
              onChange={(v) => updateRating.mutate({ id: userBook.id, rating: v })}
            />
            {userBook.rating && (
              <RatingNote userBookId={userBook.id} note={userBook.note} />
            )}
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Progress</span>
              <span className="font-mono text-sm">{Math.round(pct)}%</span>
            </div>
            <div className="h-3 rounded-full bg-mist overflow-hidden">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
            </div>
            <input
              type="range" min={0} max={100} value={Math.round(pct)}
              onChange={(e) => setProgress(Number(e.target.value))}
              className="w-full mt-2 accent-primary"
            />
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <Select value={userBook.status} onValueChange={(v) => updateStatus.mutate({ id: userBook.id, status: v as BookStatus })}>
              <SelectTrigger className="w-52 rounded-full"><SelectValue /></SelectTrigger>
              <SelectContent>{SHELVES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
            </Select>
            <Button
              variant="outline"
              className="rounded-full gap-1.5"
              onClick={() => updateProgress.mutate({ id: userBook.id, paused: !userBook.paused })}
            >
              {userBook.paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              {userBook.paused ? "Resume" : "Pause"}
            </Button>
            <Button variant="outline" className="rounded-full gap-1.5" onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4" /> Edit
            </Button>
            <Button variant="ghost" className="rounded-full gap-1.5 text-destructive" onClick={deleteBook}>
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          </div>
        </div>
      </div>

      <QuickTagBar bookId={book.id} />

      <Tabs defaultValue={tab} className="mt-12">
        <TabsList className="rounded-full bg-card shadow-paper p-1">
          <TabsTrigger value="notes" className="rounded-full">Notes</TabsTrigger>
          <TabsTrigger value="quotes" className="rounded-full">Quotes</TabsTrigger>
          <TabsTrigger value="connections" className="rounded-full">Connections</TabsTrigger>
          <TabsTrigger value="sessions" className="rounded-full">Sessions</TabsTrigger>
        </TabsList>

        <TabsContent value="notes" className="mt-6">
          <NewNote bookId={book.id} userId={user!.id} />
          <div className="mt-4 space-y-3">
            {notes.length === 0 && <Empty>Notes, reactions, anything worth keeping. Or leave it blank — not every book needs ink.</Empty>}
            {notes.map(n => (
              <div key={n.id} className="rounded-2xl bg-card shadow-paper p-4">
                <p className="whitespace-pre-wrap">{n.content}</p>
                <div className="mt-2 flex items-center justify-between">
                  <div className="font-mono text-xs text-muted-foreground">{format(new Date(n.created_at), "MMM d, yyyy · h:mm a")}</div>
                  <button
                    onClick={() => setWeaveSource({ kind: "note", id: n.id, label: `Note on ${book.title}` })}
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition"
                  >
                    <Network className="h-3 w-3" /> Connect
                  </button>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="quotes" className="mt-6">
          <NewQuote bookId={book.id} userId={user!.id} />
          <div className="mt-4 space-y-3">
            {highlights.length === 0 && <Empty>No quotes saved yet.</Empty>}
            {highlights.map(h => (
              <blockquote key={h.id} className="rounded-2xl bg-card shadow-paper p-5 border-l-4 border-terra">
                <p className="font-display italic text-lg leading-snug">"{h.quote_text}"</p>
                <div className="mt-2 flex items-center justify-between">
                  {h.page_number ? <div className="font-mono text-xs text-muted-foreground">p. {h.page_number}</div> : <span />}
                  <button
                    onClick={() => setWeaveSource({ kind: "highlight", id: h.id, label: `Quote from ${book.title}` })}
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition"
                  >
                    <Network className="h-3 w-3" /> Connect
                  </button>
                </div>
              </blockquote>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="connections" className="mt-6">
          <WeaveTab
            book={book}
            highlights={highlights}
            notes={notes}
            onAdd={() => setWeaveSource({ kind: "book", id: book.id, label: book.title })}
            onEdit={(c, label) => {
              setWeaveSource({ kind: c.source_kind, id: c.source_id, label: label ?? book.title });
              setEditingConn(c);
            }}
          />
        </TabsContent>

        <TabsContent value="sessions" className="mt-6 space-y-4">
          <PaceStrip
            sessions={sessions}
            format={book.format}
            remainingUnits={
              book.format === "audiobook"
                ? (userBook.total_seconds ?? 0) - (userBook.current_seconds ?? 0)
                : (userBook.total_pages ?? 0) - (userBook.current_page ?? 0)
            }
            accent={book.cover_color}
          />
          <NewSessionCard bookId={book.id} userId={user!.id} format={book.format} userBook={userBook} />
          <RhythmStrip sessions={sessions} />
          <div className="rounded-2xl bg-card shadow-paper divide-y divide-border">
            {sessions.length === 0 && <Empty>No reading sessions logged.</Empty>}
            {sessions.map((s) => (
              <SessionRow key={s.id} session={s} bookId={book.id} userId={user!.id} format={book.format} />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <AddBookModal open={editOpen} onOpenChange={setEditOpen} editing={{ book, userBook }} />
      {weaveSource && (
        <AddConnectionModal
          open={!!weaveSource}
          onOpenChange={(o) => { if (!o) { setWeaveSource(null); setEditingConn(null); } }}
          source={weaveSource}
          editing={editingConn}
        />
      )}
    </main>
  );
}

function WeaveTab({
  book, highlights, notes, onAdd, onEdit,
}: {
  book: { id: string; title: string; author: string | null };
  highlights: { id: string; book_id: string; quote_text: string }[];
  notes: { id: string; book_id: string; content: string }[];
  onAdd: () => void;
  onEdit?: (c: Connection, sourceLabel?: string) => void;
}) {
  const highlightIds = useMemo(() => highlights.map(h => h.id), [highlights]);
  const noteIds = useMemo(() => notes.map(n => n.id), [notes]);
  const { data: connections = [], isLoading } = useBookConnections(book.id, highlightIds, noteIds);
  const { data: library = [] } = useLibrary();
  const { data: refBooks = [] } = useReferenceBooks();

  const lookup = useMemo(() => {
    const m = new Map<string, EndpointInfo>();
    for (const b of library) m.set(b.id, { kind: "book", id: b.id, title: b.title, author: b.author });
    for (const r of refBooks) m.set(r.id, { kind: "reference_book", id: r.id, title: r.title, author: r.author, isReference: true });
    for (const h of highlights) m.set(h.id, { kind: "highlight", id: h.id, title: `Quote from ${book.title}`, bookId: h.book_id, snippet: h.quote_text });
    for (const n of notes) m.set(n.id, { kind: "note", id: n.id, title: `Note on ${book.title}`, bookId: n.book_id, snippet: n.content });
    return m;
  }, [library, refBooks, highlights, notes, book.title]);

  const handleEdit = useMemo(() => {
    if (!onEdit) return undefined;
    return (c: Connection) => {
      const sourceLabel = lookup.get(c.source_id)?.title ?? book.title;
      onEdit(c, sourceLabel);
    };
  }, [onEdit, lookup, book.title]);

  const resolve = (kind: ConnectionKind, id: string): EndpointInfo =>
    lookup.get(id) ?? { kind, id, title: "Unknown" };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground italic">How this book — and what's in it — speaks to the rest of your library.</p>
        <Button size="sm" className="rounded-full gap-1.5" onClick={onAdd}>
          <Network className="h-4 w-4" /> Connect
        </Button>
      </div>
      {isLoading ? (
        <Empty>Loading…</Empty>
      ) : connections.length === 0 ? (
        <Empty>No connections yet. Connect this book to another book or quote.</Empty>
      ) : (
        <div className="space-y-3">
          {connections.map(c => (
            <ConnectionCard
              key={c.id}
              connection={c}
              source={resolve(c.source_kind, c.source_id)}
              target={resolve(c.target_kind, c.target_id)}
              onEdit={handleEdit}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function NewNote({ bookId, userId }: { bookId: string; userId: string }) {
  const [text, setText] = useState("");
  const qc = useQueryClient();
  return (
    <form onSubmit={async (e) => {
      e.preventDefault();
      if (!text.trim()) return;
      await supabase.from("notes").insert({ book_id: bookId, user_id: userId, content: text });
      setText("");
      qc.invalidateQueries({ queryKey: ["book"] });
    }} className="rounded-2xl bg-card shadow-paper p-4">
      <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="A thought, a reaction, a connection…" className="min-h-24 bg-transparent border-0 focus-visible:ring-0 resize-none" />
      <div className="flex justify-end mt-2"><Button type="submit" className="rounded-full" disabled={!text.trim()}>Save note</Button></div>
    </form>
  );
}

function NewQuote({ bookId, userId }: { bookId: string; userId: string }) {
  const [text, setText] = useState("");
  const [page, setPage] = useState("");
  const qc = useQueryClient();
  return (
    <form onSubmit={async (e) => {
      e.preventDefault();
      if (!text.trim()) return;
      await supabase.from("highlights").insert({ book_id: bookId, user_id: userId, quote_text: text, page_number: page ? Number(page) : null });
      setText(""); setPage("");
      qc.invalidateQueries({ queryKey: ["book"] });
    }} className="rounded-2xl bg-card shadow-paper p-4">
      <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a passage worth keeping…" className="min-h-24 bg-transparent border-0 focus-visible:ring-0 resize-none font-display italic" />
      <div className="flex justify-between gap-2 mt-2">
        <Input value={page} onChange={(e) => setPage(e.target.value)} placeholder="Page" className="w-24" inputMode="numeric" />
        <Button type="submit" className="rounded-full" disabled={!text.trim()}>Save quote</Button>
      </div>
    </form>
  );
}


function RatingNote({ userBookId, note }: { userBookId: string; note: string | null }) {
  const [value, setValue] = useState(note ?? "");
  const qc = useQueryClient();

  const save = async () => {
    const trimmed = value.trim();
    if (trimmed === (note ?? "").trim()) return;
    await supabase
      .from("user_books")
      .update({ note: trimmed || null })
      .eq("id", userBookId);
    qc.invalidateQueries({ queryKey: ["book"] });
  };

  return (
    <textarea
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={save}
      placeholder="What stayed with you?"
      rows={2}
      className="mt-2 w-full bg-transparent border-0 border-b border-mist text-sm text-ink placeholder:text-muted-foreground/40 resize-none focus:outline-none focus:border-terra py-1 transition-colors leading-relaxed"
    />
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl bg-card shadow-paper p-6 text-center text-muted-foreground italic">{children}</div>;
}
