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

function Endpoint({ e }: { e: EndpointInfo }) {
  const inner = (
    <div className="min-w-0">
      <div className="font-display text-base truncate">{e.title}</div>
      {e.author && <div className="text-xs text-muted-foreground italic truncate">{e.author}{e.isReference ? " · reference" : ""}</div>}
      {e.snippet && <div className="text-xs italic text-muted-foreground line-clamp-2 mt-1">"{e.snippet}"</div>}
    </div>
  );
  if (e.kind === "book") {
    return <Link to="/books/$bookId" params={{ bookId: e.id }} className="block hover:text-primary transition-colors">{inner}</Link>;
  }
  if ((e.kind === "highlight" || e.kind === "note") && e.bookId) {
    return <Link to="/books/$bookId" params={{ bookId: e.bookId }} className="block hover:text-primary transition-colors">{inner}</Link>;
  }
  return inner;
}

export default function ConnectionCard({
  connection, source, target, onEdit,
}: { connection: Connection; source: EndpointInfo; target: EndpointInfo; onEdit?: (c: Connection) => void }) {
  const del = useDeleteConnection();
  return (
    <div className="rounded-2xl bg-card shadow-paper p-4">
      <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
        <Endpoint e={source} />
        <div className="text-muted-foreground font-mono text-xs">↔</div>
        <Endpoint e={target} />
      </div>
      {connection.why && (
        <p className="mt-3 text-sm leading-relaxed text-ink">{connection.why}</p>
      )}
      <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex flex-wrap gap-1">
          {connection.tags.map(t => (
            <span key={t} className="font-mono text-[0.6rem] uppercase tracking-widest px-2 py-0.5 rounded-full bg-mist text-muted-foreground">{t}</span>
          ))}
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
