import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useLibrary } from "@/lib/queries";
import { useReferenceBooks, useAllConnections, type Connection, type ConnectionKind } from "@/lib/weave";
import ConnectionCard, { type EndpointInfo } from "@/components/ConnectionCard";
import WebGraph from "@/components/WebGraph";
import AddConnectionModal from "@/components/AddConnectionModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { List, Network } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/weave")({
  component: WeavePage,
});

type Highlight = { id: string; book_id: string; quote_text: string };
type Note = { id: string; book_id: string; content: string };

function WeavePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: library = [] } = useLibrary();
  const { data: refBooks = [] } = useReferenceBooks();
  const { data: connections = [], isLoading } = useAllConnections();
  const [view, setView] = useState<"list" | "web">("web");
  const [filter, setFilter] = useState("");
  const [pendingSource, setPendingSource] = useState<{ kind: ConnectionKind; id: string; label: string } | null>(null);
  const [pendingTarget, setPendingTarget] = useState<{ kind: ConnectionKind; id: string; title: string; author: string | null; isReference: boolean } | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [edgePair, setEdgePair] = useState<{ a: string; b: string } | null>(null);

  const { data: marginalia } = useQuery({
    queryKey: ["marginalia", "all", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [h, n] = await Promise.all([
        supabase.from("highlights").select("id, book_id, quote_text"),
        supabase.from("notes").select("id, book_id, content"),
      ]);
      return {
        highlights: (h.data ?? []) as Highlight[],
        notes: (n.data ?? []) as Note[],
      };
    },
  });

  const lookup = useMemo(() => {
    const m = new Map<string, EndpointInfo>();
    for (const b of library) m.set(b.id, { kind: "book", id: b.id, title: b.title, author: b.author });
    for (const r of refBooks) m.set(r.id, { kind: "reference_book", id: r.id, title: r.title, author: r.author, isReference: true });
    for (const h of marginalia?.highlights ?? []) {
      const owner = library.find(b => b.id === h.book_id);
      m.set(h.id, { kind: "highlight", id: h.id, title: owner ? `Quote from ${owner.title}` : "Quote", bookId: h.book_id, snippet: h.quote_text });
    }
    for (const n of marginalia?.notes ?? []) {
      const owner = library.find(b => b.id === n.book_id);
      m.set(n.id, { kind: "note", id: n.id, title: owner ? `Note on ${owner.title}` : "Note", bookId: n.book_id, snippet: n.content });
    }
    return m;
  }, [library, refBooks, marginalia]);

  const resolve = (kind: ConnectionKind, id: string): EndpointInfo => {
    return lookup.get(id) ?? { kind, id, title: "Unknown" };
  };

  const filteredConnections = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return connections;
    return connections.filter((c: Connection) => {
      const s = resolve(c.source_kind, c.source_id);
      const t = resolve(c.target_kind, c.target_id);
      return s.title.toLowerCase().includes(q) ||
        t.title.toLowerCase().includes(q) ||
        (c.why ?? "").toLowerCase().includes(q) ||
        c.tags.some(tag => tag.toLowerCase().includes(q));
    });
  }, [connections, filter, lookup]);

  // Graph data: only book↔book endpoints. Bundle parallel links and store count.
  const graph = useMemo(() => {
    const bookOf = (kind: ConnectionKind, id: string): { id: string; isRef: boolean } | null => {
      if (kind === "book") return { id, isRef: false };
      if (kind === "reference_book") return { id, isRef: true };
      const ep = lookup.get(id);
      if (ep?.bookId) return { id: ep.bookId, isRef: false };
      return null;
    };
    const nodeIds = new Set<string>();
    const counts = new Map<string, number>();
    const pairs = new Map<string, { source: string; target: string }>();
    for (const c of connections) {
      const s = bookOf(c.source_kind, c.source_id);
      const t = bookOf(c.target_kind, c.target_id);
      if (!s || !t || s.id === t.id) continue;
      nodeIds.add(s.id); nodeIds.add(t.id);
      const key = [s.id, t.id].sort().join("::");
      counts.set(key, (counts.get(key) ?? 0) + 1);
      if (!pairs.has(key)) pairs.set(key, { source: s.id, target: t.id });
    }
    const links = Array.from(pairs.entries()).map(([key, p]) => ({
      ...p,
      count: counts.get(key) ?? 1,
    }));
    const nodes = Array.from(nodeIds).map(id => {
      const ep = lookup.get(id);
      const isRef = ep?.kind === "reference_book";
      return {
        id,
        name: ep?.title ?? "Unknown",
        kind: (isRef ? "reference_book" : "book") as "book" | "reference_book",
        color: isRef ? "#5DA8D5" : "#1F5266",
      };
    });
    return { nodes, links };
  }, [connections, lookup]);

  const handleNodeClick = (id: string, shiftKey: boolean) => {
    const ep = lookup.get(id);
    if (!ep) return;
    if (shiftKey) {
      // Two-step: first shift-click sets source; second shift-click on a different node prefills target and opens modal.
      if (!pendingSource) {
        setPendingSource({ kind: ep.kind as ConnectionKind, id: ep.id, label: ep.title });
        toast(`Connecting from “${ep.title}” — shift-click another book to link them.`);
        return;
      }
      if (pendingSource.id === id) {
        setPendingSource(null);
        toast("Cleared.");
        return;
      }
      setPendingTarget({
        kind: ep.kind as ConnectionKind,
        id: ep.id,
        title: ep.title,
        author: ep.author ?? null,
        isReference: ep.kind === "reference_book",
      });
      setModalOpen(true);
      return;
    }
    // Plain click → navigate to book page (only for owned books)
    if (ep.kind === "book") {
      navigate({ to: "/books/$bookId", params: { bookId: id } });
    }
  };

  const handleLinkClick = (a: string, b: string) => {
    setEdgePair({ a, b });
  };

  const edgeConnections = useMemo(() => {
    if (!edgePair) return [];
    const bookOf = (kind: ConnectionKind, id: string): string | null => {
      if (kind === "book" || kind === "reference_book") return id;
      const ep = lookup.get(id);
      return ep?.bookId ?? null;
    };
    const key = [edgePair.a, edgePair.b].sort().join("::");
    return connections.filter(c => {
      const s = bookOf(c.source_kind, c.source_id);
      const t = bookOf(c.target_kind, c.target_id);
      if (!s || !t) return false;
      return [s, t].sort().join("::") === key;
    });
  }, [edgePair, connections, lookup]);

  const edgeTitle = useMemo(() => {
    if (!edgePair) return "";
    const a = lookup.get(edgePair.a)?.title ?? "Unknown";
    const b = lookup.get(edgePair.b)?.title ?? "Unknown";
    return `${a} ↔ ${b}`;
  }, [edgePair, lookup]);

  return (
    <main className="max-w-5xl mx-auto px-6">
      <header className="mb-8">
        <h1 className="font-display text-4xl md:text-5xl">Connections</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">
          Connections between books — and the quotes and notes inside them. Every link grows your private web of how texts speak to each other.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="inline-flex rounded-full bg-card shadow-paper p-1">
          <button onClick={() => setView("list")} className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm transition ${view === "list" ? "bg-forest text-paper" : "text-ink hover:bg-muted"}`}>
            <List className="h-4 w-4" /> List
          </button>
          <button onClick={() => setView("web")} className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm transition ${view === "web" ? "bg-forest text-paper" : "text-ink hover:bg-muted"}`}>
            <Network className="h-4 w-4" /> Web
          </button>
        </div>
        {view === "list" && (
          <Input placeholder="Filter by title, tag, or word…" value={filter} onChange={(e) => setFilter(e.target.value)} className="max-w-xs rounded-full bg-card" />
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-20 text-muted-foreground">Loading…</div>
      ) : connections.length === 0 ? (
        <div className="rounded-2xl bg-card shadow-paper p-10 text-center text-muted-foreground italic">
          Nothing woven yet. Connect a book or a quote to start your web.
        </div>
      ) : view === "list" ? (
        <div className="space-y-3">
          {filteredConnections.map(c => (
            <ConnectionCard
              key={c.id}
              connection={c}
              source={resolve(c.source_kind, c.source_id)}
              target={resolve(c.target_kind, c.target_id)}
            />
          ))}
          {filteredConnections.length === 0 && (
            <div className="text-center py-10 text-muted-foreground italic">No connections match that filter.</div>
          )}
        </div>
      ) : (
        <>
          <WebGraph
            nodes={graph.nodes}
            links={graph.links}
            highlightedId={pendingSource?.id ?? null}
            onNodeClick={handleNodeClick}
            onLinkClick={handleLinkClick}
          />
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground font-mono uppercase tracking-widest">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: "#1F5266" }} /> Your books</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: "#5DA8D5" }} /> References</span>
            <span className="normal-case tracking-normal font-sans italic">
              Click a dot to open a book · Click a line to view that connection · Shift-click two books to connect them
            </span>
            {pendingSource && (
              <button
                onClick={() => setPendingSource(null)}
                className="normal-case tracking-normal font-sans rounded-full bg-terra/10 text-terra px-2 py-0.5 hover:bg-terra/20"
              >
                Cancel — connecting from “{pendingSource.label}”
              </button>
            )}
          </div>
        </>
      )}

      <Button variant="outline" className="mt-8 rounded-full" asChild>
        <a href="/">Back to library</a>
      </Button>

      {pendingSource && (
        <AddConnectionModal
          open={modalOpen}
          onOpenChange={(o) => {
            setModalOpen(o);
            if (!o) { setPendingSource(null); setPendingTarget(null); }
          }}
          source={pendingSource}
          initialTarget={pendingTarget}
        />
      )}

      <Dialog open={!!edgePair} onOpenChange={(o) => { if (!o) setEdgePair(null); }}>
        <DialogContent className="rounded-3xl max-w-2xl bg-card max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">{edgeTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {edgeConnections.map(c => (
              <ConnectionCard
                key={c.id}
                connection={c}
                source={resolve(c.source_kind, c.source_id)}
                target={resolve(c.target_kind, c.target_id)}
              />
            ))}
            {edgeConnections.length === 0 && (
              <div className="text-center py-6 text-muted-foreground italic">No connections found.</div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
