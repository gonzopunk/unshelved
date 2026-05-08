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
  first_publish_year?: number;
  number_of_pages_median?: number;
};

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing?: { book: Book; userBook: UserBook | null } | null;
};

// Compute dominant color from an image URL using canvas + simple bucket histogram.
async function dominantColorFromUrl(url: string): Promise<{ color: string; text: string } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const w = 50, h = 75;
        const cv = document.createElement("canvas");
        cv.width = w; cv.height = h;
        const ctx = cv.getContext("2d");
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0, w, h);
        const { data } = ctx.getImageData(0, 0, w, h);
        const buckets = new Map<string, { r: number; g: number; b: number; n: number }>();
        for (let i = 0; i < data.length; i += 4) {
          const a = data[i + 3];
          if (a < 200) continue;
          const r = data[i], g = data[i + 1], b = data[i + 2];
          // Skip near-white / near-black
          const max = Math.max(r, g, b), min = Math.min(r, g, b);
          if (max > 240 && min > 240) continue;
          if (max < 25) continue;
          const key = `${r >> 5}-${g >> 5}-${b >> 5}`;
          const cur = buckets.get(key) ?? { r: 0, g: 0, b: 0, n: 0 };
          cur.r += r; cur.g += g; cur.b += b; cur.n += 1;
          buckets.set(key, cur);
        }
        let best: { r: number; g: number; b: number; n: number } | null = null;
        for (const v of buckets.values()) if (!best || v.n > best.n) best = v;
        if (!best) return resolve(null);
        const r = Math.round(best.r / best.n);
        const g = Math.round(best.g / best.n);
        const b = Math.round(best.b / best.n);
        const hex = "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("").toUpperCase();
        // Relative luminance
        const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        const text = lum > 0.6 ? "#1F2630" : "#FAFBF3";
        resolve({ color: hex, text });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export default function AddBookModal({ open, onOpenChange, editing }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [format, setFormat] = useState<BookFormat>("print");
  const [color, setColor] = useState(PALETTE[0]);
  const [shelf, setShelf] = useState<BookStatus>("want");
  const [busy, setBusy] = useState(false);
  const [totalPages, setTotalPages] = useState<number | null>(null);

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
      setSearch(""); setResults([]); setTotalPages(null);
    } else if (open) {
      setTitle(""); setAuthor(""); setFormat("print"); setColor(PALETTE[0]); setShelf("want");
      setSearch(""); setResults([]); setTotalPages(null);
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
    if (doc.cover_i) {
      const url = `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`;
      const dom = await dominantColorFromUrl(url);
      if (dom) setColor({ color: dom.color, text: dom.text, name: "From cover" });
    }
  };

  const save = async () => {
    if (!user || !title.trim()) return;
    setBusy(true);
    try {
      const bookmark = color.color === "#D17648" ? "#1F5266" : "#D17648";
      if (editing) {
        const { error: bookErr } = await supabase.from("books").update({
          title, author, format,
          cover_color: color.color, cover_text_color: color.text, bookmark_color: bookmark,
        }).eq("id", editing.book.id);
        if (bookErr) throw bookErr;
        if (editing.userBook) {
          await supabase.from("user_books").update({ status: shelf }).eq("id", editing.userBook.id);
        } else {
          await supabase.from("user_books").insert({ user_id: user.id, book_id: editing.book.id, status: shelf });
        }
      } else {
        const { data: book, error: bookErr } = await supabase.from("books").insert({
          user_id: user.id, title, author, format,
          cover_color: color.color, cover_text_color: color.text, bookmark_color: bookmark,
        }).select().single();
        if (bookErr) throw bookErr;
        await supabase.from("user_books").insert({
          user_id: user.id, book_id: book.id, status: shelf,
          total_pages: totalPages ?? undefined,
        });
      }
      qc.invalidateQueries({ queryKey: ["library"] });
      qc.invalidateQueries({ queryKey: ["book"] });
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
            <div className="w-24 h-32 rounded-lg shadow-paper flex flex-col justify-between p-2 font-display shrink-0" style={{ background: color.color, color: color.text }}>
              <div className="text-[0.55rem] uppercase tracking-widest opacity-60">Unshelved</div>
              <div className="text-xs leading-tight font-semibold line-clamp-3">{title || "Untitled"}</div>
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
