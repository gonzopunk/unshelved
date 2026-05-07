import { useState, useEffect } from "react";
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

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing?: { book: Book; userBook: UserBook | null } | null;
};

export default function AddBookModal({ open, onOpenChange, editing }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [format, setFormat] = useState<BookFormat>("print");
  const [color, setColor] = useState(PALETTE[0]);
  const [shelf, setShelf] = useState<BookStatus>("want");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (editing) {
      setTitle(editing.book.title);
      setAuthor(editing.book.author ?? "");
      setFormat(editing.book.format);
      setColor(PALETTE.find(p => p.color === editing.book.cover_color) ?? { color: editing.book.cover_color, text: editing.book.cover_text_color, name: "Custom" });
      setShelf(editing.userBook?.status ?? "want");
    } else if (open) {
      setTitle(""); setAuthor(""); setFormat("print"); setColor(PALETTE[0]); setShelf("want");
    }
  }, [editing, open]);

  const save = async () => {
    if (!user || !title.trim()) return;
    setBusy(true);
    try {
      if (editing) {
        const { error: bookErr } = await supabase.from("books").update({
          title, author, format,
          cover_color: color.color, cover_text_color: color.text, bookmark_color: color.color === "#D17648" ? "#1F5266" : "#D17648",
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
          cover_color: color.color, cover_text_color: color.text, bookmark_color: color.color === "#D17648" ? "#1F5266" : "#D17648",
        }).select().single();
        if (bookErr) throw bookErr;
        await supabase.from("user_books").insert({ user_id: user.id, book_id: book.id, status: shelf });
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
      <DialogContent className="rounded-3xl max-w-lg bg-card">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{editing ? "Edit book" : "Add a book"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="w-24 h-32 rounded-lg shadow-paper flex flex-col justify-between p-2 font-display shrink-0" style={{ background: color.color, color: color.text }}>
              <div className="text-[0.55rem] uppercase tracking-widest opacity-60">Margins</div>
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
            <div className="mt-1 flex flex-wrap gap-2">
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
