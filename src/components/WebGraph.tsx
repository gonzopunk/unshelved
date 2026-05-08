import { useEffect, useRef, useState } from "react";
import type { Connection } from "@/lib/weave";

type Node = { id: string; name: string; kind: "book" | "reference_book"; color: string };

type Props = {
  nodes: Node[];
  links: { source: string; target: string }[];
  onNodeClick?: (id: string) => void;
};

export default function WebGraph({ nodes, links, onNodeClick }: Props) {
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
          linkColor={() => "rgba(31, 38, 48, 0.25)"}
          linkWidth={1.5}
          backgroundColor="transparent"
          onNodeClick={(n: unknown) => onNodeClick?.((n as Node).id)}
          nodeCanvasObjectMode={() => "after"}
          nodeCanvasObject={(node: unknown, ctx: CanvasRenderingContext2D, globalScale: number) => {
            const n = node as Node & { x?: number; y?: number };
            if (n.x == null || n.y == null) return;
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
