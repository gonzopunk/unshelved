import { useEffect, useRef, useState, useCallback } from "react";

type Node = { id: string; name: string; kind: "book" | "reference_book"; color: string; x?: number; y?: number };
type Link = { source: string; target: string; count?: number };

type Props = {
  nodes: Node[];
  links: Link[];
  highlightedId?: string | null;
  onNodeClick?: (id: string, shiftKey: boolean) => void;
  onLinkClick?: (sourceId: string, targetId: string) => void;
  onConnectDrag?: (sourceId: string, targetId: string) => void;
  /** When true, plain taps act like shift-clicks — for touch users (no shift key). */
  connectMode?: boolean;
};

type GraphRef = {
  screen2GraphCoords: (x: number, y: number) => { x: number; y: number };
  graph2ScreenCoords: (x: number, y: number) => { x: number; y: number };
  pauseAnimation: () => void;
  resumeAnimation: () => void;
};

type DragState = {
  sourceId: string;
  sourceX: number; // graph coords
  sourceY: number;
  pointerX: number; // screen coords (relative to container)
  pointerY: number;
  hoverTargetId: string | null;
};

const HIT_RADIUS = 14; // px on screen, for picking nearest node

export default function WebGraph({
  nodes, links, highlightedId, onNodeClick, onLinkClick, onConnectDrag, connectMode = false,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<GraphRef | null>(null);
  const [size, setSize] = useState({ w: 600, h: 500 });
  const [Graph, setGraph] = useState<React.ComponentType<Record<string, unknown>> | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  dragRef.current = drag;

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

  // Find nearest node within HIT_RADIUS pixels of a screen point.
  const pickNode = useCallback((screenX: number, screenY: number): Node | null => {
    if (!graphRef.current) return null;
    let best: Node | null = null;
    let bestD = HIT_RADIUS * HIT_RADIUS;
    for (const n of nodes) {
      if (n.x == null || n.y == null) continue;
      const sc = graphRef.current.graph2ScreenCoords(n.x, n.y);
      const dx = sc.x - screenX;
      const dy = sc.y - screenY;
      const d = dx * dx + dy * dy;
      if (d < bestD) { bestD = d; best = n; }
    }
    return best;
  }, [nodes]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Activate drag-to-connect on shift (desktop) or when in connect mode (touch).
    const useDragConnect = e.shiftKey || connectMode;
    if (!useDragConnect) return;
    if (!containerRef.current || !graphRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const node = pickNode(sx, sy);
    if (!node || node.x == null || node.y == null) return;
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopPropagation();
    if (typeof e.nativeEvent.stopImmediatePropagation === "function") {
      e.nativeEvent.stopImmediatePropagation();
    }
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    graphRef.current.pauseAnimation();
    setDrag({
      sourceId: node.id,
      sourceX: node.x,
      sourceY: node.y,
      pointerX: sx,
      pointerY: sy,
      hoverTargetId: null,
    });
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const hit = pickNode(sx, sy);
    setDrag({
      ...dragRef.current,
      pointerX: sx,
      pointerY: sy,
      hoverTargetId: hit && hit.id !== dragRef.current.sourceId ? hit.id : null,
    });
  };

  const finishDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d || !containerRef.current) return;
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* noop */ }
    const rect = containerRef.current.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const hit = pickNode(sx, sy);
    setDrag(null);
    if (hit && hit.id !== d.sourceId) {
      onConnectDrag?.(d.sourceId, hit.id);
    }
  };

  // Compute rubber-band endpoints in screen coords for the SVG overlay.
  const sourceScreen = drag && graphRef.current
    ? graphRef.current.graph2ScreenCoords(drag.sourceX, drag.sourceY)
    : null;

  return (
    <div
      ref={containerRef}
      className="rounded-2xl bg-card shadow-paper overflow-hidden relative"
      onPointerDownCapture={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={finishDrag}
      onPointerCancel={finishDrag}
      style={{ touchAction: connectMode ? "none" : "auto" }}
    >
      {Graph ? (
        <Graph
          ref={graphRef as unknown as React.Ref<unknown>}
          graphData={{ nodes, links }}
          width={size.w}
          height={size.h}
          nodeLabel={(n: unknown) => (n as Node).name}
          nodeColor={(n: unknown) => (n as Node).color}
          nodeRelSize={6}
          enableNodeDrag={false}
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
            if (containerRef.current && !drag) {
              containerRef.current.style.cursor = n ? "pointer" : "default";
            }
          }}
          onLinkClick={(l: unknown) => {
            const link = l as { source: { id: string } | string; target: { id: string } | string };
            const s = typeof link.source === "string" ? link.source : link.source.id;
            const t = typeof link.target === "string" ? link.target : link.target.id;
            onLinkClick?.(s, t);
          }}
          onLinkHover={(l: unknown) => {
            if (containerRef.current && !drag) {
              containerRef.current.style.cursor = l ? "pointer" : "default";
            }
          }}
          nodeCanvasObjectMode={() => "after"}
          nodeCanvasObject={(node: unknown, ctx: CanvasRenderingContext2D, globalScale: number) => {
            const n = node as Node & { x?: number; y?: number };
            if (n.x == null || n.y == null) return;
            const isHighlighted = highlightedId && n.id === highlightedId;
            const isDragSource = drag?.sourceId === n.id;
            const isDragTarget = drag?.hoverTargetId === n.id;
            if (isHighlighted || isDragSource || isDragTarget) {
              ctx.beginPath();
              ctx.arc(n.x, n.y, isDragTarget ? 12 : 10, 0, Math.PI * 2);
              ctx.strokeStyle = isDragTarget ? "#6FB37A" : "#D17648";
              ctx.lineWidth = (isDragTarget ? 2.5 : 2) / globalScale;
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
      {drag && sourceScreen && (
        <svg
          className="absolute inset-0 pointer-events-none"
          width={size.w}
          height={size.h}
        >
          <line
            x1={sourceScreen.x}
            y1={sourceScreen.y}
            x2={drag.pointerX}
            y2={drag.pointerY}
            stroke={drag.hoverTargetId ? "#6FB37A" : "#D17648"}
            strokeWidth={drag.hoverTargetId ? 2.5 : 2}
            strokeDasharray={drag.hoverTargetId ? "0" : "5 4"}
            strokeLinecap="round"
            opacity={0.85}
          />
          <circle
            cx={drag.pointerX}
            cy={drag.pointerY}
            r={drag.hoverTargetId ? 5 : 3.5}
            fill={drag.hoverTargetId ? "#6FB37A" : "#D17648"}
            opacity={0.9}
          />
        </svg>
      )}
    </div>
  );
}
