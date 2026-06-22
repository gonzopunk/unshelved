import { Link } from "@tanstack/react-router";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDeleteConnection, type Connection, type ConnectionKind } from "@/lib/weave";

export type EndpointInfo = {
  kind: ConnectionKind;
  id: string;
  title: string;
  author?: string | null;
  isReference?: boolean;
  bookId?: string; // for highlight/note → owning book
  snippet?: string; // for highlight/note text
};

const STRENGTH_CFG = {
  1: { gap: 82, lineH: 1,   lineOpacity: 0.15, dotSize: 16 },
  2: { gap: 68, lineH: 1.5, lineOpacity: 0.26, dotSize: 18 },
  3: { gap: 52, lineH: 2.5, lineOpacity: 0.40, dotSize: 20 },
  4: { gap: 36, lineH: 3.5, lineOpacity: 0.58, dotSize: 22 },
  5: { gap: 20, lineH: 5,   lineOpacity: 0.76, dotSize: 24 },
} as const;

function dotColor(kind: ConnectionKind): string {
  return kind === 'reference_book' ? 'var(--honey)' : 'var(--forest)';
}

function EndpointInner({ e }: { e: EndpointInfo }) {
  return (
    <>
      <div className="font-display text-sm font-medium leading-tight line-clamp-2 overflow-hidden">
        {e.title}
      </div>
      {e.author && (
        <div className="text-[11px] text-muted-foreground italic mt-0.5 truncate">{e.author}</div>
      )}
      {e.isReference && (
        <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground mt-0.5">reference</div>
      )}
      {e.snippet && (
        <div className="text-xs italic text-muted-foreground line-clamp-2 mt-1">"{e.snippet}"</div>
      )}
    </>
  );
}

function endpointHref(e: EndpointInfo): { to: string; params: { bookId: string } } | null {
  if (e.kind === "book") return { to: "/books/$bookId", params: { bookId: e.id } };
  if ((e.kind === "highlight" || e.kind === "note") && e.bookId) {
    return { to: "/books/$bookId", params: { bookId: e.bookId } };
  }
  return null;
}

export default function ConnectionCard({
  connection, source, target, onEdit,
}: { connection: Connection; source: EndpointInfo; target: EndpointInfo; onEdit?: (c: Connection) => void }) {
  const del = useDeleteConnection();
  const s = (connection.strength ?? 3) as 1 | 2 | 3 | 4 | 5;
  const cfg = STRENGTH_CFG[s];
  const sourceHref = endpointHref(source);
  const targetHref = endpointHref(target);

  return (
    <div
      className="rounded-2xl bg-card shadow-paper p-4"
      style={{ borderLeft: '5px solid var(--forest)' }}
    >
      <div className="flex items-stretch gap-0">
        {/* Left endpoint cell */}
        <div
          className="flex-1 min-w-0 rounded-[10px] px-3 py-2.5 relative overflow-visible"
          style={{ background: 'rgba(221,229,223,0.42)' }}
        >
          {sourceHref ? (
            <Link to={sourceHref.to} params={sourceHref.params} className="block hover:text-primary transition-colors">
              <EndpointInner e={source} />
            </Link>
          ) : (
            <EndpointInner e={source} />
          )}
          <div
            className="absolute rounded-full"
            style={{
              right: 0,
              top: '50%',
              transform: 'translate(50%, -50%)',
              width: `${cfg.dotSize}px`,
              height: `${cfg.dotSize}px`,
              background: dotColor(source.kind),
              border: '1.5px solid var(--card)',
            }}
          />
        </div>

        {/* Connector */}
        <div className="flex-none relative" style={{ width: `${cfg.gap}px` }}>
          <div
            className="absolute inset-x-0"
            style={{
              top: '50%',
              transform: 'translateY(-50%)',
              height: `${cfg.lineH}px`,
              background: `rgba(31, 82, 102, ${cfg.lineOpacity})`,
            }}
          />
        </div>

        {/* Right endpoint cell */}
        <div
          className="flex-1 min-w-0 rounded-[10px] px-3 py-2.5 relative overflow-visible"
          style={{ background: 'rgba(221,229,223,0.42)' }}
        >
          <div
            className="absolute rounded-full"
            style={{
              left: 0,
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: `${cfg.dotSize}px`,
              height: `${cfg.dotSize}px`,
              background: dotColor(target.kind),
              border: '1.5px solid var(--card)',
            }}
          />
          {targetHref ? (
            <Link to={targetHref.to} params={targetHref.params} className="block hover:text-primary transition-colors">
              <EndpointInner e={target} />
            </Link>
          ) : (
            <EndpointInner e={target} />
          )}
        </div>
      </div>

      {connection.why && (
        <p className="mt-3 text-sm leading-relaxed text-ink">{connection.why}</p>
      )}

      <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex flex-wrap gap-1 items-center">
          {connection.tags.map(t => (
            <span key={t} className="font-mono text-[0.6rem] uppercase tracking-widest px-2 py-0.5 rounded-full bg-mist text-muted-foreground">
              {t}
            </span>
          ))}
          <span
            className="font-mono text-[0.6rem] uppercase tracking-widest px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(31,82,102,0.10)', color: 'var(--forest)' }}
          >
            strength: {connection.strength ?? 3}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {onEdit && (
            <Button variant="ghost" size="sm" className="rounded-full text-muted-foreground hover:text-primary" onClick={() => onEdit(connection)} aria-label="Edit connection">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button variant="ghost" size="sm" className="rounded-full text-muted-foreground hover:text-destructive" onClick={() => {
            if (confirm("Remove this connection?")) del.mutate(connection.id);
          }} aria-label="Delete connection">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
