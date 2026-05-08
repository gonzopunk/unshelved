import { useEffect, useRef, useState } from "react";

type Node = { id: string; name: string; kind: "book" | "reference_book"; color: string };
type Link = { source: string; target: string; count?: number };

type Props = {
  nodes: Node[];
  links: Link[];
  highlightedId?: string | null;
  onNodeClick?: (id: string, shiftKey: boolean) => void;
  onLinkClick?: (sourceId: string, targetId: string) => void;
};

export default function WebGraph({ nodes, links, highlightedId, onNodeClick, onLinkClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 600, h: 500 });
  const [Graph, setGraph] = useState<React.ComponentType<Record<string, unknown>> | null>(null);

  useEffect(() => {
    let mounted = true;
    import("react-force-graph-2d").then(mod => {
      if (mounted) setGraph(() => mod.default as unknown as React.ComponentType<Record<string, unknown>>);
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        setSize({ w: containerRef.current.clientWidth, h: Math.max(420, Math.min(700, window.innerHeight - 240)) });
      }
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return (
    <div ref={containerRef} className="rounded-2xl bg-card shadow-paper overflow-hidden">
      {Graph ? (
        <Graph
          graphData={{ nodes, links }}
          width={size.w}
          height={size.h}
          nodeLabel={(n: unknown) => (n as Node).name}
          nodeColor={(n: unknown) => (n as Node).color}
          nodeRelSize={6}
          linkColor={(l: unknown) => {
            const c = (l as Link).count ?? 1;
            const a = Math.min(0.25 + (c - 1) * 0.12, 0.7);
            return `rgba(31, 38, 48, ${a})`;
          }}
          linkWidth={(l: unknown) => {
            const c = (l as Link).count ?? 1;
            return 1 + Math.log2(c) * 1.4;
          }}
          linkLabel={(l: unknown) => {
            const c = (l as Link).count ?? 1;
            return c > 1 ? `${c} connections` : "1 connection";
          }}
          backgroundColor="transparent"
          onNodeClick={(n: unknown, e: MouseEvent) => onNodeClick?.((n as Node).id, !!e?.shiftKey)}
          onNodeHover={(n: unknown) => {
            if (containerRef.current) {
              containerRef.current.style.cursor = n ? "pointer" : "default";
            }
          }}
          nodeCanvasObjectMode={() => "after"}
          nodeCanvasObject={(node: unknown, ctx: CanvasRenderingContext2D, globalScale: number) => {
            const n = node as Node & { x?: number; y?: number };
            if (n.x == null || n.y == null) return;
            if (highlightedId && n.id === highlightedId) {
              ctx.beginPath();
              ctx.arc(n.x, n.y, 10, 0, Math.PI * 2);
              ctx.strokeStyle = "#D17648";
              ctx.lineWidth = 2 / globalScale;
              ctx.stroke();
            }
            const fontSize = 12 / globalScale;
            ctx.font = `${fontSize}px serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "top";
            ctx.fillStyle = "#1F2630";
            const label = n.name.length > 28 ? n.name.slice(0, 26) + "…" : n.name;
            ctx.fillText(label, n.x, n.y + 8);
          }}
        />
      ) : (
        <div className="h-[480px] flex items-center justify-center text-muted-foreground italic">Drawing the web…</div>
      )}
    </div>
  );
}
