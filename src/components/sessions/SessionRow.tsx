import { useState } from "react";
import { format } from "date-fns";
import { Trash2, BookOpen, MapPin } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { moodInfo, useDeleteSession, type Session } from "@/lib/sessions";

export default function SessionRow({
  session,
  bookId,
  userId,
  format: fmt,
}: {
  session: Session;
  bookId: string;
  userId: string;
  format: string;
}) {
  const [open, setOpen] = useState(false);
  const del = useDeleteSession();
  const qc = useQueryClient();
  const m = moodInfo(session.mood);

  const isAudio = fmt === "audiobook";
  const startedAt = new Date(session.started_at);

  const units = (() => {
    if (isAudio) {
      if (session.start_seconds != null && session.end_seconds != null) {
        return `${Math.round((session.end_seconds - session.start_seconds) / 60)} min listened`;
      }
      return session.minutes ? `${session.minutes} min` : "—";
    }
    if (session.start_page != null && session.end_page != null) {
      return `p. ${session.start_page} → ${session.end_page}`;
    }
    if (session.start_pct != null && session.end_pct != null) {
      return `${Math.round(Number(session.start_pct))}% → ${Math.round(Number(session.end_pct))}%`;
    }
    return session.pages_read ? `${session.pages_read} pages` : "—";
  })();

  const promote = async () => {
    if (!session.session_note) return;
    await supabase.from("notes").insert({
      book_id: bookId,
      user_id: userId,
      content: session.session_note,
    });
    qc.invalidateQueries({ queryKey: ["book"] });
    toast.success("Promoted to notes");
  };

  return (
    <div className="px-4 py-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span
            className="h-2.5 w-2.5 rounded-full shrink-0"
            style={{ background: m?.color ?? "var(--mist)" }}
            title={m?.label ?? "no mood"}
          />
          <span className="font-mono text-sm">{format(startedAt, "MMM d")}</span>
          <span className="text-xs text-muted-foreground">{format(startedAt, "h:mma").toLowerCase()}</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>{units}</span>
          {session.minutes ? <span className="font-mono text-xs">{session.minutes}m</span> : null}
        </div>
      </button>

      {open && (
        <div className="mt-3 pl-6 space-y-2 border-l-2 border-mist">
          {m && (
            <div className="text-xs text-muted-foreground">
              Mood: <span style={{ color: m.color }}>{m.label}</span>
            </div>
          )}
          {session.location && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" /> {session.location}
            </div>
          )}
          {session.session_note && (
            <div>
              <p className="italic text-sm text-ink/80 whitespace-pre-wrap">"{session.session_note}"</p>
              <button
                onClick={promote}
                className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary"
              >
                <BookOpen className="h-3 w-3" /> Promote to note
              </button>
            </div>
          )}
          <button
            onClick={() => {
              if (!confirm("Delete this session?")) return;
              del.mutate(session.id, { onSuccess: () => toast.success("Deleted") });
            }}
            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-3 w-3" /> Delete
          </button>
        </div>
      )}
    </div>
  );
}
