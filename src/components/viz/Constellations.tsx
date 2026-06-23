import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useLibrary } from "@/lib/queries";
import { useAllSessions } from "@/lib/sessions";
import { useAllConnections } from "@/lib/weave";
import { format } from "date-fns";

const CENTER_OPTIONS = [
  { id: "recency",     label: "Recency" },
  { id: "rating",      label: "Rating" },
  { id: "time",        label: "Reading Time" },
  { id: "connections", label: "Connections" },
] as const;
type CenterMode = typeof CENTER_OPTIONS[number]["id"];

const CENTER_DESCRIPTIONS: Record<CenterMode, string> = {
  recency:     "Recently finished books pull toward the center; older or unread books drift outward.",
  rating:      "Your highest-rated books pull toward the center; lower-rated or unrated books drift outward.",
  time:        "Books you've spent the most reading time with pull toward the center.",
  connections: "Your most-connected books pull toward the center.",
};

type Node = {
  id: string;
  name: string;
  author: string | null;
  color: string;
};

export default function Constellations() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<unknown>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [Graph, setGraph] = useState<React.ComponentType<Record<string, unknown>> | null>(null);
  const [center, setCenter] = useState<CenterMode>("recency");
  const [selectedNode, setSelectedNode] = useState<(Node & { x?: number; y?: number }) | null>(null);

  const { data: library = [] } = useLibrary();
  const { data: sessions = [] } = useAllSessions(365);
  const { data: connections = [] } = useAllConnections();

  useEffect(() => {
    let m = true;
    import("react-force-graph-2d").then((mod) => {
      if (m) setGraph(() => mod.default as unknown as React.ComponentType<Record<string, unknown>>);
    });
    return () => { m = false; };
  }, []);

  // Use a callback ref so the ResizeObserver attaches when the container
  // mounts — not on first render, which may be before the library loads
  // and the container is gated behind an early return.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect;
      setSize({
        w: width,
        h: Math.max(440, Math.min(720, window.innerHeight - 240)),
      });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [library.length === 0]);

  const strengthMap = useMemo<Map<string, number>>(() => {
    const map = new Map<string, number>();
    if (center === "recency") {
      const now = Date.now();
      let maxRecency = 1;
      const raw = new Map<string, number>();
      for (const b of library) {
        const fin = (b as { finished_at?: string | null }).finished_at;
        if (!fin) continue;
        const days = (now - new Date(fin).getTime()) / 86400000;
        const recency = Math.max(0, 1 - days / 365);
        raw.set(b.id, recency);
        if (recency > maxRecency) maxRecency = recency;
      }
      for (const [id, v] of raw) map.set(id, v / maxRecency);
    } else if (center === "rating") {
      for (const b of library) {
        const r = (b as { rating?: number | null }).rating ?? 0;
        map.set(b.id, r / 5);
      }
    } else if (center === "time") {
      const mins = new Map<string, number>();
      for (const s of sessions as { book_id: string | null; minutes: number | null }[]) {
        if (!s.book_id) continue;
        mins.set(s.book_id, (mins.get(s.book_id) ?? 0) + (s.minutes ?? 0));
      }
      const max = Math.max(1, ...mins.values());
      for (const [id, v] of mins) map.set(id, v / max);
    } else if (center === "connections") {
      const counts = new Map<string, number>();
      for (const c of connections) {
        if (c.source_kind === "book") counts.set(c.source_id, (counts.get(c.source_id) ?? 0) + 1);
        if (c.target_kind === "book") counts.set(c.target_id, (counts.get(c.target_id) ?? 0) + 1);
      }
      const max = Math.max(1, ...counts.values());
      for (const [id, v] of counts) map.set(id, v / max);
    }
    return map;
  }, [center, library, sessions, connections]);

  const nodes = useMemo<Node[]>(() =>
    library.map((b) => ({
      id: b.id,
      name: b.title,
      author: b.author,
      color: b.cover_color || "#1F5266",
    })),
  [library]);

  const selectedNodeInfo = useMemo<string | null>(() => {
    if (!selectedNode) return null;
    const id = selectedNode.id;
    if (center === "recency") {
      const book = library.find((b) => b.id === id);
      const fin = (book as any)?.user_books?.[0]?.finished_at ?? null;
      if (!fin) return "Not yet finished";
      return `Finished ${format(new Date(fin), "MMM d, yyyy")}`;
    }
    if (center === "rating") {
      const book = library.find((b) => b.id === id);
      const r = (book as any)?.user_books?.[0]?.rating ?? null;
      if (!r) return "Unrated";
      return `${r}\u00a0★`;
    }
    if (center === "time") {
      const mins = (sessions as { book_id: string | null; minutes: number | null }[])
        .filter((s) => s.book_id === id)
        .reduce((sum, s) => sum + (s.minutes ?? 0), 0);
      if (mins === 0) return "No sessions logged";
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return h > 0
        ? `${h}\u00a0hr${m > 0 ? ` ${m}\u00a0min` : ""} reading time`
        : `${m}\u00a0min reading time`;
    }
    if (center === "connections") {
      const count = (connections as { source_kind: string; source_id: string; target_kind: string; target_id: string }[])
        .filter((c) =>
          (c.source_kind === "book" && c.source_id === id) ||
          (c.target_kind === "book" && c.target_id === id)
        ).length;
      if (count === 0) return "No connections yet";
      return count === 1 ? "1 connection" : `${count} connections`;
    }
    return null;
  }, [selectedNode?.id, center, library, sessions, connections]);

  const handleOpenSelected = useCallback(() => {
    if (!selectedNode) return;
    navigate({ to: "/books/$bookId", params: { bookId: selectedNode.id } });
  }, [selectedNode, navigate]);

  const handleDismiss = useCallback(() => setSelectedNode(null), []);

  const handleNodeClick = useCallback((n: unknown) => {
    setSelectedNode(n as Node & { x?: number; y?: number });
  }, []);

  const handleBackgroundClick = useCallback(() => setSelectedNode(null), []);

  useEffect(() => {
    const g = graphRef.current as {
      d3Force: (name: string, force?: unknown) => unknown;
      d3ReheatSimulation: () => void;
    } | null;
    if (!g || !Graph || nodes.length === 0 || !size) return;
    g.d3Force("link", null);
    g.d3Force("center", null);
    const charge = g.d3Force("charge") as { strength: (v: number) => unknown; distanceMax: (v: number) => unknown } | null;
    if (charge) { charge.strength(-50); charge.distanceMax(250); }
    // Both radial and boundary use the initialize pattern to get real sim nodes
    let _rNodes: Array<Node & { x?: number; y?: number; vx?: number; vy?: number }> = [];
    const radialForce = Object.assign(
      function (alpha: number) {
        for (const n of _rNodes) {
          const pull = (strengthMap.get(n.id) ?? 0) * alpha * 0.35;
          if (n.x != null) n.vx = (n.vx ?? 0) - n.x * pull;
          if (n.y != null) n.vy = (n.vy ?? 0) - n.y * pull;
        }
      },
      {
        initialize(nodes: unknown[]) {
          _rNodes = nodes as Array<Node & { x?: number; y?: number; vx?: number; vy?: number }>;
        },
      }
    );
    g.d3Force("radial", radialForce);

    const MARGIN = 50;
    const sizeW = size.w;
    const sizeH = size.h;
    let _bNodes: Array<{ x?: number; y?: number; vx?: number; vy?: number }> = [];
    const boundaryForce = Object.assign(
      function () {
        const hw = sizeW / 2 - MARGIN;
        const hh = sizeH / 2 - MARGIN;
        for (const n of _bNodes) {
          if (n.x == null || n.y == null) continue;
          if (n.x < -hw) { n.x = -hw; n.vx = Math.max(0, n.vx ?? 0); }
          if (n.x > hw)  { n.x = hw;  n.vx = Math.min(0, n.vx ?? 0); }
          if (n.y < -hh) { n.y = -hh; n.vy = Math.max(0, n.vy ?? 0); }
          if (n.y > hh)  { n.y = hh;  n.vy = Math.min(0, n.vy ?? 0); }
        }
      },
      {
        initialize(nodes: unknown[]) {
          _bNodes = nodes as Array<{ x?: number; y?: number; vx?: number; vy?: number }>;
        },
      }
    );
    g.d3Force("boundary", boundaryForce);
    g.d3ReheatSimulation();
  }, [center, strengthMap, nodes, Graph, size?.w, size?.h]);

  if (library.length === 0) {
    return (
      <div className="rounded-2xl bg-card shadow-paper p-12 text-center text-muted-foreground italic">
        Add a few books to see your cloud bloom.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground font-mono uppercase tracking-widest">
          Center by
        </span>
        {CENTER_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            onClick={() => setCenter(opt.id)}
            className={`rounded-full px-3 py-1 text-xs transition ${
              center === opt.id
                ? "bg-terra text-paper"
                : "bg-mist text-muted-foreground hover:bg-muted"
            }`}
          >
            {opt.label}
          </button>
        ))}
        <p className="text-xs text-muted-foreground italic w-full mt-0.5">
          {CENTER_DESCRIPTIONS[center]}
        </p>
      </div>
      <div
        ref={containerRef}
        className="rounded-2xl bg-card shadow-paper overflow-hidden relative"
      >
        {Graph && size ? (
          <Graph
            ref={graphRef as React.Ref<unknown>}
            graphData={{ nodes, links: [] }}
            width={size.w}
            height={size.h}
            nodeColor={(n: unknown) => (n as Node).color}
            nodeVal={() => 1}
            nodeRelSize={8}
            d3AlphaDecay={0.015}
            d3VelocityDecay={0.3}
            backgroundColor="transparent"
            onNodeClick={handleNodeClick}
            onBackgroundClick={handleBackgroundClick}
            onNodeHover={(n: unknown) => {
              if (containerRef.current) {
                containerRef.current.style.cursor = n ? "pointer" : "default";
              }
            }}
            nodeCanvasObjectMode={() => "after"}
            nodeCanvasObject={(n: unknown, ctx: CanvasRenderingContext2D, globalScale: number) => {
              const node = n as Node & { x?: number; y?: number };
              if (node.x == null || node.y == null) return;
              const r = 8; // matches nodeRelSize

              // Always draw a subtle definition ring — fixes light-colored nodes
              // disappearing into the paper background (e.g. Klara and the Sun)
              ctx.beginPath();
              ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
              ctx.strokeStyle = "rgba(31, 38, 48, 0.2)";
              ctx.lineWidth = 1 / globalScale;
              ctx.stroke();

              // Selected node: terra highlight ring
              if (selectedNode?.id === node.id) {
                ctx.beginPath();
                ctx.arc(node.x, node.y, r + 4 / globalScale, 0, Math.PI * 2);
                ctx.strokeStyle = "#d17648";
                ctx.lineWidth = 2 / globalScale;
                ctx.stroke();
              }

              // Always draw label — scaled so screen size stays constant regardless of zoom
              const fontSize = 11 / globalScale;
              ctx.font = `${fontSize}px 'Newsreader', serif`;
              ctx.textAlign = "center";
              ctx.textBaseline = "top";
              ctx.fillStyle = "rgba(31, 38, 48, 0.85)";
              const lbl = node.name.length > 22 ? node.name.slice(0, 20) + "…" : node.name;
              ctx.fillText(lbl, node.x, node.y + r + 4 / globalScale);
            }}
          />
        ) : (
          <div className="h-[480px] flex items-center justify-center text-muted-foreground italic">
            Drawing the constellation…
          </div>
        )}
      </div>
      {selectedNode && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-mist text-sm">
          <div className="flex-1 min-w-0">
            <div className="font-display font-medium text-ink leading-snug line-clamp-1">
              {selectedNode.name}
            </div>
            {selectedNode.author && (
              <div className="text-xs text-muted-foreground mt-0.5">{selectedNode.author}</div>
            )}
            {selectedNodeInfo && (
              <div className="mt-1 font-mono text-xs text-forest">{selectedNodeInfo}</div>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0 pt-0.5">
            <button
              onClick={handleOpenSelected}
              className="text-xs text-forest font-semibold hover:underline"
            >
              Open →
            </button>
            <button
              onClick={handleDismiss}
              aria-label="Dismiss"
              className="text-xs text-muted-foreground hover:text-ink"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
