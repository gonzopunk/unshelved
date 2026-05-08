import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useLibrary } from "@/lib/queries";
import { useReferenceBooks, useCreateConnection, useCreateReferenceBook, type ConnectionKind } from "@/lib/weave";
import { toast } from "sonner";

type Source = { kind: ConnectionKind; id: string; label: string };

type Candidate = { kind: ConnectionKind; id: string; title: string; author: string | null; isReference: boolean };

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  source: Source;
  initialTarget?: Candidate | null;
};

export default function AddConnectionModal({ open, onOpenChange, source, initialTarget = null }: Props) {
  const { data: library = [] } = useLibrary();
  const { data: refBooks = [] } = useReferenceBooks();
  const createConn = useCreateConnection();
  const createRef = useCreateReferenceBook();
  const [search, setSearch] = useState("");
  const [target, setTarget] = useState<Candidate | null>(null);
  const [why, setWhy] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) { setSearch(""); setTarget(null); setWhy(""); setTagsInput(""); }
  }, [open]);

  const candidates: Candidate[] = useMemo(() => {
    const fromLib: Candidate[] = library
      .filter(b => !(source.kind === "book" && b.id === source.id))
      .map(b => ({ kind: "book" as const, id: b.id, title: b.title, author: b.author, isReference: false }));
    const fromRef: Candidate[] = refBooks.map(r => ({ kind: "reference_book" as const, id: r.id, title: r.title, author: r.author, isReference: true }));
    const all = [...fromLib, ...fromRef];
    const q = search.trim().toLowerCase();
    if (!q) return all.slice(0, 30);
    return all.filter(c => c.title.toLowerCase().includes(q) || (c.author ?? "").toLowerCase().includes(q));
  }, [library, refBooks, search, source]);

  const showAddRef = search.trim().length > 1 && !candidates.some(c => c.title.toLowerCase() === search.trim().toLowerCase());

  const addReference = async () => {
    const title = search.trim();
    if (!title) return;
    const ref = await createRef.mutateAsync({ title });
    setTarget({ kind: "reference_book", id: ref.id, title: ref.title, author: ref.author, isReference: true });
    setSearch("");
  };

  const save = async () => {
    if (!target) return;
    setBusy(true);
    try {
      const tags = tagsInput.split(",").map(t => t.trim()).filter(Boolean);
      await createConn.mutateAsync({
        source_kind: source.kind, source_id: source.id,
        target_kind: target.kind, target_id: target.id,
        why: why.trim() || null,
        tags,
      });
      toast.success("Woven");
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl max-w-lg bg-card max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Weave a connection</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-xl bg-mist p-3">
            <div className="font-mono text-[0.65rem] uppercase tracking-widest text-muted-foreground">From</div>
            <div className="font-display text-base mt-0.5">{source.label}</div>
          </div>

          <div>
            <Label>To</Label>
            {target ? (
              <div className="mt-1 flex items-center justify-between rounded-xl bg-paper border border-border p-3">
                <div>
                  <div className="font-display text-base">{target.title}</div>
                  {target.author && <div className="text-xs text-muted-foreground italic">{target.author}{target.isReference ? " · reference" : ""}</div>}
                </div>
                <Button variant="ghost" size="sm" className="rounded-full" onClick={() => setTarget(null)}>Change</Button>
              </div>
            ) : (
              <>
                <Input
                  className="mt-1"
                  placeholder="Search your library or add a reference…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <div className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-border bg-paper">
                  {candidates.map(c => (
                    <button
                      key={`${c.kind}-${c.id}`}
                      type="button"
                      onClick={() => setTarget(c)}
                      className="w-full flex items-center justify-between p-2 text-left hover:bg-muted transition border-b border-border last:border-b-0"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{c.title}</div>
                        {c.author && <div className="text-xs text-muted-foreground truncate italic">{c.author}</div>}
                      </div>
                      {c.isReference && <span className="font-mono text-[0.6rem] uppercase tracking-widest text-muted-foreground ml-2">ref</span>}
                    </button>
                  ))}
                  {showAddRef && (
                    <button
                      type="button"
                      onClick={addReference}
                      className="w-full p-2 text-left text-sm hover:bg-muted transition italic text-primary"
                    >+ Add "{search.trim()}" as a reference book</button>
                  )}
                  {candidates.length === 0 && !showAddRef && (
                    <div className="p-3 text-sm text-muted-foreground italic">No matches.</div>
                  )}
                </div>
              </>
            )}
          </div>

          <div>
            <Label htmlFor="why">Why (optional)</Label>
            <Textarea id="why" value={why} onChange={(e) => setWhy(e.target.value)} placeholder="What ties them together?" className="mt-1 min-h-20" />
          </div>

          <div>
            <Label htmlFor="tags">Tags (comma separated)</Label>
            <Input id="tags" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="nature, family, voice" className="mt-1" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-full">Cancel</Button>
            <Button onClick={save} disabled={busy || !target} className="rounded-full">{busy ? "Weaving…" : "Weave"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
