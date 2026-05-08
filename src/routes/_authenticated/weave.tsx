import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useLibrary } from "@/lib/queries";
import { useReferenceBooks, useAllConnections, type Connection, type ConnectionKind } from "@/lib/weave";
import ConnectionCard, { type EndpointInfo } from "@/components/ConnectionCard";
import WebGraph from "@/components/WebGraph";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { List, Network } from "lucide-react";

export const Route = createFileRoute("/_authenticated/weave")({
  component: WeavePage,
});

type Highlight = { id: string; book_id: string; quote_text: string };
type Note = { id: string; book_id: string; content: string };

function WeavePage() {
  const { user } = useAuth();
  const { data: library = [] } = useLibrary();
  const { data: refBooks = [] } = useReferenceBooks();
  const { data: connections = [], isLoading } = useAllConnections();
  const [view, setView] = useState<"list" | "web">("list");
  const [filter, setFilter] = useState("");

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

  // Graph data: only book↔book endpoints (books and reference books). Quote/note connections collapse to their owning book.
  const graph = useMemo(() => {
    const bookOf = (kind: ConnectionKind, id: string): { id: string; isRef: boolean } | null => {
      if (kind === "book") return { id, isRef: false };
      if (kind === "reference_book") return { id, isRef: true };
      const ep = lookup.get(id);
      if (ep?.bookId) return { id: ep.bookId, isRef: false };
      return null;
    };
    const nodeIds = new Set<string>();
    const links: { source: string; target: string }[] = [];
    for (const c of connections) {
      const s = bookOf(c.source_kind, c.source_id);
      const t = bookOf(c.target_kind, c.target_id);
      if (!s || !t || s.id === t.id) continue;
      nodeIds.add(s.id); nodeIds.add(t.id);
      links.push({ source: s.id, target: t.id });
    }
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

  return (
    <main className="max-w-5xl mx-auto px-6">
      <header className="mb-8">
        <h1 className="font-display text-4xl md:text-5xl">Weave</h1>
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
          <WebGraph nodes={graph.nodes} links={graph.links} />
          <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground font-mono uppercase tracking-widest">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: "#1F5266" }} /> Your books</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: "#5DA8D5" }} /> References</span>
          </div>
        </>
      )}

      <Button variant="outline" className="mt-8 rounded-full" asChild>
        <a href="/">Back to library</a>
      </Button>
    </main>
  );
}
