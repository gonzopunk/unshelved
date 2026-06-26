import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { BookStatus, BookFormat, Book, UserBook } from "@/lib/queries";
import { extractCoverPalette } from "@/lib/palette";
import { track } from "@/lib/analytics";

const PALETTE = [
  { color: "#1F5266", text: "#FAFBF3", name: "Forest" },
  { color: "#6FB37A", text: "#1F2630", name: "Sage" },
  { color: "#D17648", text: "#FAFBF3", name: "Terra" },
  { color: "#5DA8D5", text: "#1F2630", name: "Honey" },
  { color: "#2D6A95", text: "#FAFBF3", name: "Dust" },
  { color: "#1F2630", text: "#EEEEE3", name: "Ink" },
  { color: "#FAFBF3", text: "#1F2630", name: "Paper" },
  { color: "#EEEEE3", text: "#1F2630", name: "Cream" },
];

const SHELVES: { value: BookStatus; label: string }[] = [
  { value: "want", label: "Want to Read" },
  { value: "reading", label: "Currently Reading" },
  { value: "later", label: "Come Back Later" },
  { value: "dnf", label: "DNF" },
  { value: "loved", label: "Loved It" },
  { value: "liked", label: "Liked It" },
  { value: "meh", label: "Meh" },
];

type OLDoc = {
  key: string;
  title: string;
  author_name?: string[];
  cover_i?: number;
  cover_edition_key?: string;
  edition_key?: string[];
  first_publish_year?: number;
  number_of_pages_median?: number;
};

type Enrichment = {
  publication_year: number | null;
  publisher: string | null;
  isbn: string | null;
  description: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing?: { book: Book; userBook: UserBook | null } | null;
};

// Palette extraction lives in src/lib/palette.ts.

export default function AddBookModal({ open, onOpenChange, editing }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [format, setFormat] = useState<BookFormat>("print");
  const [color, setColor] = useState(PALETTE[0]);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [secondary, setSecondary] = useState<string | null>(null);
  const [bookmark, setBookmark] = useState<string | null>(null);
  const [shelf, setShelf] = useState<BookStatus>("want");
  const [busy, setBusy] = useState(false);
  const [totalPages, setTotalPages] = useState<number | null>(null);
  const [totalSeconds, setTotalSeconds] = useState<number | null>(null);
  const [enrichment, setEnrichment] = useState<Enrichment>({
    publication_year: null, publisher: null, isbn: null, description: null,
  });

  // Search state
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<OLDoc[]>([]);
  const [searching, setSearching] = useState(false);
  const searchSeq = useRef(0);

  useEffect(() => {
    if (editing) {
      setTitle(editing.book.title);
      setAuthor(editing.book.author ?? "");
      setFormat(editing.book.format);
      setColor(PALETTE.find(p => p.color === editing.book.cover_color) ?? { color: editing.book.cover_color, text: editing.book.cover_text_color, name: "Custom" });
      setShelf(editing.userBook?.status ?? "want");
      setCoverUrl(editing.book.cover_url ?? null);
      setSecondary(editing.book.cover_secondary_color ?? null);
      setBookmark(editing.book.bookmark_color ?? null);
      setTotalPages(editing.userBook?.total_pages ?? null);
      setTotalSeconds(editing.userBook?.total_seconds ?? null);
      setEnrichment({
        publication_year: editing.book.publication_year ?? null,
        publisher: editing.book.publisher ?? null,
        isbn: editing.book.isbn ?? null,
        description: editing.book.description ?? null,
      });
      setSearch(""); setResults([]);
    } else if (open) {
      setTitle(""); setAuthor(""); setFormat("print"); setColor(PALETTE[0]); setShelf("want");
      setCoverUrl(null); setSecondary(null); setBookmark(null);
      setSearch(""); setResults([]); setTotalPages(null); setTotalSeconds(null);
      setEnrichment({ publication_year: null, publisher: null, isbn: null, description: null });
    }
  }, [editing, open]);


  // Debounced Open Library search
  useEffect(() => {
    if (editing) return;
    const q = search.trim();
    if (q.length < 3) { setResults([]); return; }
    const seq = ++searchSeq.current;
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=8&fields=key,title,author_name,cover_i,first_publish_year,number_of_pages_median`
        );
        const json = await res.json();
        if (seq === searchSeq.current) setResults(json.docs ?? []);
      } catch {
        if (seq === searchSeq.current) setResults([]);
      } finally {
        if (seq === searchSeq.current) setSearching(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [search, editing]);

  const pickResult = async (doc: OLDoc) => {
    setTitle(doc.title);
    setAuthor(doc.author_name?.[0] ?? "");
    setTotalPages(doc.number_of_pages_median ?? null);
    setResults([]);
    setSearch("");
    // Seed enrichment from search doc; refined by detail fetch below.
    setEnrichment({
      publication_year: doc.first_publish_year ?? null,
      publisher: null,
      isbn: null,
      description: null,
    });
    if (doc.cover_i) {
      const url = `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
      setCoverUrl(url);
      const pal = await extractCoverPalette(url);
      if (pal) {
        setColor({ color: pal.dominant, text: pal.text, name: "From cover" });
        setSecondary(pal.secondary);
        setBookmark(pal.bookmark);
      }
    } else {
      setCoverUrl(null);
    }
    // Best-effort detail fetch for publisher/ISBN/description. Never blocks add.
    const editionKey = doc.cover_edition_key ?? doc.edition_key?.[0];
    if (editionKey) {
      try {
        const res = await fetch(
          `https://openlibrary.org/api/books?bibkeys=OLID:${encodeURIComponent(editionKey)}&format=json&jscmd=data`
        );
        if (res.ok) {
          const json = await res.json();
          const entry = json[`OLID:${editionKey}`];
          if (entry) {
            const yearMatch = typeof entry.publish_date === "string" ? entry.publish_date.match(/\b(\d{4})\b/) : null;
            const year = yearMatch ? parseInt(yearMatch[1], 10) : null;
            const desc =
              (typeof entry.excerpts?.[0]?.text === "string" && entry.excerpts[0].text) ||
              (typeof entry.notes === "string" ? entry.notes : entry.notes?.value) ||
              null;
            setEnrichment((prev) => ({
              publication_year: year ?? prev.publication_year,
              publisher: entry.publishers?.[0]?.name ?? prev.publisher,
              isbn: entry.identifiers?.isbn_13?.[0] ?? entry.identifiers?.isbn_10?.[0] ?? prev.isbn,
              description: desc ?? prev.description,
            }));
          }
        }
      } catch { /* swallow */ }
    }
  };

  const save = async () => {
    if (!user || !title.trim()) return;
    setBusy(true);
    try {
      const finalBookmark =
        bookmark ?? (color.color === "#D17648" ? "#1F5266" : "#D17648");
      const basePayload = {
        title, author, format,
        cover_color: color.color,
        cover_text_color: color.text,
        bookmark_color: finalBookmark,
        cover_secondary_color: secondary,
        cover_url: coverUrl,
        cover_generic: !coverUrl,
      };
      // Only include enrichment fields when present — never overwrite with null.
      const enrichPayload: Record<string, unknown> = {};
      if (enrichment.publication_year) enrichPayload.publication_year = enrichment.publication_year;
      if (enrichment.publisher) enrichPayload.publisher = enrichment.publisher;
      if (enrichment.isbn) enrichPayload.isbn = enrichment.isbn;
      if (enrichment.description) enrichPayload.description = enrichment.description;
      const payload = { ...basePayload, ...enrichPayload };

      if (editing) {
        const { error: bookErr } = await supabase.from("books").update(payload).eq("id", editing.book.id);
        if (bookErr) throw bookErr;
        const ubPatch: Record<string, unknown> = { status: shelf };
        if (format === "audiobook") {
          const newTotalSec = totalSeconds ?? null;
          ubPatch.total_seconds = newTotalSec;
          const currentSec = editing.userBook?.current_seconds ?? 0;
          ubPatch.progress_pct = newTotalSec && newTotalSec > 0
            ? Math.min(100, Math.round((currentSec / newTotalSec) * 100))
            : (editing.userBook?.progress_pct ?? 0);
        } else {
          const newTotalPages = totalPages ?? null;
          ubPatch.total_pages = newTotalPages;
          const currentPage = editing.userBook?.current_page ?? 0;
          ubPatch.progress_pct = newTotalPages && newTotalPages > 0
            ? Math.min(100, Math.round((currentPage / newTotalPages) * 100))
            : (editing.userBook?.progress_pct ?? 0);
        }
        const { error: ubErr } = await supabase
          .from("user_books")
          .upsert(
            { user_id: user.id, book_id: editing.book.id, ...ubPatch },
            { onConflict: "user_id,book_id" }
          );
        if (ubErr) throw ubErr;
      } else {
        const { data: book, error: bookErr } = await supabase.from("books").insert({
          user_id: user.id, ...payload,
        }).select().single();
        if (bookErr) throw bookErr;
        await supabase.from("user_books").insert({
          user_id: user.id, book_id: book.id, status: shelf,
          total_pages: totalPages ?? undefined,
        });
      }
      if (!editing) track("book_added");
      qc.invalidateQueries({ queryKey: ["library"] });
      qc.invalidateQueries({ queryKey: ["book"] });
      if (editing) qc.invalidateQueries({ queryKey: ["book", editing.book.id] });
      toast.success(editing ? "Book updated" : "Book added");
      onOpenChange(false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl max-w-lg bg-card max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{editing ? "Edit book" : "Add a book"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {!editing && (
            <div>
              <Label htmlFor="search">Search Open Library</Label>
              <Input
                id="search"
                placeholder="Title, author, ISBN…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {(searching || results.length > 0) && (
                <div className="mt-2 max-h-64 overflow-y-auto rounded-xl border border-border bg-paper">
                  {searching && results.length === 0 && (
                    <div className="p-3 text-sm text-muted-foreground italic">Searching…</div>
                  )}
                  {results.map((doc) => (
                    <button
                      key={doc.key}
                      type="button"
                      onClick={() => pickResult(doc)}
                      className="w-full flex gap-3 items-start p-2 text-left hover:bg-muted transition border-b border-border last:border-b-0"
                    >
                      {doc.cover_i ? (
                        <img
                          src={`https://covers.openlibrary.org/b/id/${doc.cover_i}-S.jpg`}
                          alt=""
                          className="w-10 h-14 object-cover rounded shrink-0"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-10 h-14 rounded bg-muted shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">{doc.title}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {doc.author_name?.[0] ?? "Unknown"}
                          {doc.first_publish_year ? ` · ${doc.first_publish_year}` : ""}
                          {doc.number_of_pages_median ? ` · ${doc.number_of_pages_median}p` : ""}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-4">
            <div
              className="relative w-24 h-32 rounded-lg shadow-paper overflow-hidden font-display shrink-0"
              style={{
                background: secondary
                  ? `linear-gradient(135deg, ${color.color} 0%, ${color.color} 60%, ${secondary} 100%)`
                  : color.color,
                color: color.text,
              }}
            >
              {coverUrl ? (
                <img src={coverUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 flex flex-col justify-between p-2">
                  <div className="text-[0.55rem] uppercase tracking-widest opacity-60">Unshelved</div>
                  <div className="text-xs leading-tight font-semibold line-clamp-3">{title || "Untitled"}</div>
                </div>
              )}
              {bookmark && (
                <div className="absolute top-0 right-2 w-2 h-6 rounded-b" style={{ background: bookmark }} />
              )}
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="author">Author</Label>
                <Input id="author" value={author} onChange={(e) => setAuthor(e.target.value)} />
              </div>
            </div>
          </div>

          <div>
            <Label>Format</Label>
            <div className="mt-1 grid grid-cols-3 gap-2">
              {(["print", "ebook", "audiobook"] as BookFormat[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFormat(f)}
                  className={`rounded-full px-3 py-2 text-sm capitalize border transition ${format === f ? "bg-primary text-primary-foreground border-primary" : "bg-paper border-border hover:bg-muted"}`}
                >{f}</button>
              ))}
            </div>
          </div>

          {editing && (
            format === "audiobook" ? (
              <div>
                <Label>Total duration</Label>
                <div className="mt-1 flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={99}
                    className="w-20"
                    value={totalSeconds != null ? Math.floor(totalSeconds / 3600) : ""}
                    onChange={(e) => {
                      const h = Math.max(0, Math.min(99, parseInt(e.target.value || "0", 10) || 0));
                      const m = totalSeconds != null ? Math.floor((totalSeconds % 3600) / 60) : 0;
                      setTotalSeconds(h * 3600 + m * 60);
                    }}
                  />
                  <span className="text-sm text-muted-foreground">hr</span>
                  <Input
                    type="number"
                    min={0}
                    max={59}
                    className="w-20"
                    value={totalSeconds != null ? Math.floor((totalSeconds % 3600) / 60) : ""}
                    onChange={(e) => {
                      const m = Math.max(0, Math.min(59, parseInt(e.target.value || "0", 10) || 0));
                      const h = totalSeconds != null ? Math.floor(totalSeconds / 3600) : 0;
                      setTotalSeconds(h * 3600 + m * 60);
                    }}
                  />
                  <span className="text-sm text-muted-foreground">min</span>
                </div>
              </div>
            ) : (
              <div>
                <Label htmlFor="totalPages">Total pages</Label>
                <Input
                  id="totalPages"
                  type="number"
                  min={0}
                  className="mt-1 w-32"
                  value={totalPages ?? ""}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    setTotalPages(Number.isFinite(v) && v > 0 ? v : null);
                  }}
                />
              </div>
            )
          )}

          <div>
            <Label>Cover color</Label>
            <div className="mt-1 flex flex-wrap gap-2 items-center">
              {PALETTE.map((p) => (
                <button
                  key={p.color}
                  type="button"
                  onClick={() => setColor(p)}
                  aria-label={p.name}
                  className={`w-8 h-8 rounded-full border-2 transition ${color.color === p.color ? "border-ink scale-110" : "border-border"}`}
                  style={{ background: p.color }}
                />
              ))}
              {!PALETTE.some(p => p.color === color.color) && (
                <div
                  className="w-8 h-8 rounded-full border-2 border-ink scale-110"
                  style={{ background: color.color }}
                  title={`From cover ${color.color}`}
                />
              )}
            </div>
          </div>

          <div>
            <Label>Shelf</Label>
            <Select value={shelf} onValueChange={(v) => setShelf(v as BookStatus)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SHELVES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-full">Cancel</Button>
            <Button onClick={save} disabled={busy || !title.trim()} className="rounded-full">{busy ? "Saving…" : editing ? "Save changes" : "Add to shelf"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
