import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useLibrary } from "@/lib/queries";
import { useAllSessions } from "@/lib/sessions";
import { useAllConnections } from "@/lib/weave";

const CENTER_OPTIONS = [
  { id: "recency",     label: "Recency" },
  { id: "rating",      label: "Rating" },
  { id: "time",        label: "Reading Time" },
  { id: "connections", label: "Connections" },
] as const;
type CenterMode = typeof CENTER_OPTIONS[number]["id"];

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

  useEffect(() => {
    const el = containerRef.current;
    console.log("[Cons] mount effect, el=", el);
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect;
      console.log("[Cons] RO fired width=", width);
      setSize({
        w: width,
        h: Math.max(440, Math.min(720, window.innerHeight - 240)),
      });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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
        <span className="text-xs text-muted-foreground italic ml-1">
          · color: cover · click to open
        </span>
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
            nodeLabel={(n: unknown) => {
              const node = n as Node;
              return `${node.name}${node.author ? " — " + node.author : ""}`;
            }}
            nodeColor={(n: unknown) => (n as Node).color}
            nodeVal={() => 1}
            nodeRelSize={8}
            d3AlphaDecay={0.015}
            d3VelocityDecay={0.3}
            backgroundColor="transparent"
            onNodeClick={(n: unknown) =>
              navigate({ to: "/books/$bookId", params: { bookId: (n as Node).id } })
            }
            onNodeHover={(n: unknown) => {
              if (containerRef.current) {
                containerRef.current.style.cursor = n ? "pointer" : "default";
              }
            }}
            nodeCanvasObjectMode={() => "after"}
            nodeCanvasObject={(n: unknown, ctx: CanvasRenderingContext2D, scale: number) => {
              const node = n as Node & { x?: number; y?: number };
              if (node.x == null || node.y == null || scale < 1.5) return;
              const fontSize = Math.min(11, 10 / scale + 5);
              ctx.font = `${fontSize}px serif`;
              ctx.textAlign = "center";
              ctx.textBaseline = "top";
              ctx.fillStyle = "#1F2630";
              const lbl = node.name.length > 26 ? node.name.slice(0, 24) + "…" : node.name;
              ctx.fillText(lbl, node.x, node.y + 10);
            }}
          />
        ) : (
          <div className="h-[480px] flex items-center justify-center text-muted-foreground italic">
            Drawing the constellation…
          </div>
        )}
      </div>
    </div>
  );
}
