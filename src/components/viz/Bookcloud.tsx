import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useLibrary } from "@/lib/queries";
import { useAllSessions } from "@/lib/sessions";
import { useAllConnections } from "@/lib/weave";

type Node = {
  id: string;
  name: string;
  author: string | null;
  size: number;       // raw minutes
  radius: number;     // clamped node radius
  color: string;
};
type Link = { source: string; target: string };

export default function Bookcloud() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<unknown>(null);
  const [size, setSize] = useState({ w: 800, h: 560 });
  const [Graph, setGraph] = useState<React.ComponentType<Record<string, unknown>> | null>(null);
  const [showEdges, setShowEdges] = useState(true);

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
    const update = () => {
      if (containerRef.current) {
        setSize({
          w: containerRef.current.clientWidth,
          h: Math.max(440, Math.min(720, window.innerHeight - 240)),
        });
      }
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const { nodes, links } = useMemo(() => {
    // Sum minutes per book.
    const minutes = new Map<string, number>();
    for (const s of sessions as { book_id: string | null; minutes: number | null }[]) {
      if (!s.book_id) continue;
      minutes.set(s.book_id, (minutes.get(s.book_id) ?? 0) + (s.minutes ?? 0));
    }
    const nodes: Node[] = library.map((b) => {
      const raw = minutes.get(b.id) ?? 0;
      // clamp size: floor 4, ceiling 18
      const radius = Math.max(4, Math.min(18, 4 + Math.sqrt(raw) * 0.45));
      return {
        id: b.id,
        name: b.title,
        author: b.author,
        size: raw,
        radius,
        color: b.cover_color || "#1F5266",
      };
    });
    const idSet = new Set(nodes.map((n) => n.id));
    const seen = new Set<string>();
    const links: Link[] = [];
    for (const c of connections) {
      if (c.source_kind !== "book" || c.target_kind !== "book") continue;
      if (!idSet.has(c.source_id) || !idSet.has(c.target_id)) continue;
      const key = [c.source_id, c.target_id].sort().join("::");
      if (seen.has(key)) continue;
      seen.add(key);
      links.push({ source: c.source_id, target: c.target_id });
    }
    return { nodes, links };
  }, [library, sessions, connections]);

  if (library.length === 0) {
    return (
      <div className="rounded-2xl bg-card shadow-paper p-12 text-center text-muted-foreground italic">
        Add a few books to see your cloud bloom.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <button
          onClick={() => setShowEdges((v) => !v)}
          className={`rounded-full px-3 py-1 transition ${showEdges ? "bg-forest text-paper" : "bg-mist hover:bg-muted"}`}
        >
          {showEdges ? "Edges on" : "Edges off"}
        </button>
        <span className="italic">Node size: total reading minutes · color: cover · click a book to open it.</span>
      </div>
      <div
        ref={containerRef}
        className="rounded-2xl bg-card shadow-paper overflow-hidden relative"
      >
        {Graph ? (
          <Graph
            ref={graphRef as React.Ref<unknown>}
            graphData={{ nodes, links: showEdges ? links : [] }}
            width={size.w}
            height={size.h}
            nodeLabel={(n: unknown) => {
              const node = n as Node;
              return `${node.name}${node.author ? " — " + node.author : ""}${node.size ? ` · ${node.size} min` : ""}`;
            }}
            nodeColor={(n: unknown) => (n as Node).color}
            nodeVal={(n: unknown) => (n as Node).radius}
            nodeRelSize={4}
            linkColor={() => "rgba(31, 38, 48, 0.18)"}
            linkWidth={() => 1}
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
              if (node.x == null || node.y == null) return;
              if (scale < 1.5) return; // hide labels when zoomed out
              const fontSize = Math.min(11, 10 / scale + 5);
              ctx.font = `${fontSize}px serif`;
              ctx.textAlign = "center";
              ctx.textBaseline = "top";
              ctx.fillStyle = "#1F2630";
              const lbl = node.name.length > 26 ? node.name.slice(0, 24) + "…" : node.name;
              ctx.fillText(lbl, node.x, node.y + node.radius + 2);
            }}
          />
        ) : (
          <div className="h-[480px] flex items-center justify-center text-muted-foreground italic">
            Drawing the cloud…
          </div>
        )}
      </div>
    </div>
  );
}
