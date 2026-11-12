import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { format, isYesterday } from "date-fns";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import GeneratedCover from "@/components/GeneratedCover";
import { cn } from "@/lib/utils";
import { track } from "@/lib/analytics";
import { MOODS, useSaveSession, type MoodKey } from "@/lib/sessions";
import { buildSessionLog, isLocalToday } from "@/lib/session-log";
import type { Book, UserBook } from "@/lib/queries";

export type LogBook = Book & { user_books: UserBook[] };
export type LogEntryPoint = "home" | "book" | "sessions_tab";

function fmtHM(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function SessionLogDialog({
  open,
  onOpenChange,
  books,
  userId,
  entryPoint,
  initialDurationMinutes,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** First entry is preselected. One entry = fixed book (no book row). */
  books: LogBook[];
  userId: string;
  entryPoint: LogEntryPoint;
  initialDurationMinutes?: number | null;
}) {
  const navigate = useNavigate();
  const save = useSaveSession();
  const showBookRow = entryPoint === "home";
  const [bookId, setBookId] = useState<string | null>(books[0]?.id ?? null);
  const [switching, setSwitching] = useState(false);
  const [page, setPage] = useState("");
  const [hours, setHours] = useState("");
  const [mins, setMins] = useState("");
  const [day, setDay] = useState<Date>(new Date());
  const [whenOpen, setWhenOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [duration, setDuration] = useState("");
  const [mood, setMood] = useState<MoodKey | "">("");
  const [note, setNote] = useState("");
  const [place, setPlace] = useState("");
  const [confirmCorrect, setConfirmCorrect] = useState(false);
  const openedAt = useRef(0);

  const book = books.find((b) => b.id === bookId) ?? books[0];
  const ub = book?.user_books[0];
  const isAudio = book?.format === "audiobook";
  const isEbook = book?.format === "ebook";

  const seed = (b: LogBook | undefined) => {
    const u = b?.user_books[0];
    setPage(String(u?.current_page ?? 0));
    const sec = u?.current_seconds ?? 0;
    setHours(String(Math.floor(sec / 3600)));
    setMins(String(Math.floor((sec % 3600) / 60)));
    setConfirmCorrect(false);
  };

  useEffect(() => {
    if (!open) return;
    openedAt.current = Date.now();
    track("session_log_opened", { entry_point: entryPoint });
    const first = books[0];
    setBookId(first?.id ?? null);
    seed(first);
    setSwitching(false);
    setDay(new Date());
    setDuration(initialDurationMinutes ? String(initialDurationMinutes) : "");
    setMoreOpen(!!initialDurationMinutes);
    setMood(""); setNote(""); setPlace("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!book || !ub) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-card">
          <DialogHeader><DialogTitle className="font-display text-2xl">Log a session</DialogTitle></DialogHeader>
          <p className="py-6 text-center text-muted-foreground italic">No books currently in progress.</p>
        </DialogContent>
      </Dialog>
    );
  }

  const fromLabel = isAudio ? `from ${fmtHM(ub.current_seconds ?? 0)}` : `from p. ${ub.current_page ?? 0}`;
  const newPosition = isAudio ? (Number(hours) || 0) * 3600 + (Number(mins) || 0) * 60 : Number(page) || 0;
  const usedMore = !!(duration || mood || note.trim() || place.trim());
  const whenLabel = isLocalToday(day) ? "Today" : isYesterday(day) ? "Yesterday" : format(day, "MMM d");

  const done = () => onOpenChange(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const r = buildSessionLog({
      bookId: book.id, userId, format: book.format, userBook: ub,
      newPosition, day, durationMinutes: Number(duration) || null,
      mood: mood || null, note, location: place,
    });
    if (r.kind === "no_progress") { toast("No progress to log."); return; }
    if (r.kind === "regressed") {
      if (!confirmCorrect) { setConfirmCorrect(true); return; }
      save.mutate(
        { book_id: book.id, user_id: userId, userBookId: ub.id, patchUserBook: r.correction, skipSession: true },
        { onSuccess: () => { toast.success("Position corrected"); done(); } },
      );
      return;
    }
    save.mutate(
      { ...r.row, userBookId: ub.id, patchUserBook: r.patch },
      {
        onSuccess: () => {
          track("session_logged", {
            entry_point: entryPoint,
            duration_ms: Date.now() - openedAt.current,
            backdated: !isLocalToday(day),
            used_more: usedMore,
          });
          toast.success("Session logged");
          const total = isAudio ? ub.total_seconds : ub.total_pages;
          if (total && newPosition >= total) toast("You finished the book — mark the shelf?", { duration: 6000 });
          done();
        },
        onError: () => toast.error("Couldn't save the session"),
      },
    );
  };

  const startTimer = () => {
    done();
    // Always the book currently selected in the dialog (incl. after "switch").
    navigate({ to: "/books/$bookId", params: { bookId: book.id }, search: { tab: "sessions", timer: "1" } });
  };

  const others = books.filter((b) => b.id !== book.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl bg-card">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Log a session</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5">
          {showBookRow && (
            <div>
              <div className="flex items-center gap-3">
                <GeneratedCover book={book} className="h-14 w-10 rounded shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{book.title}</div>
                  <div className="text-xs text-muted-foreground truncate">{book.author}</div>
                </div>
                {others.length > 0 && (
                  <button type="button" onClick={() => setSwitching((v) => !v)} className="text-xs text-muted-foreground hover:text-ink inline-flex items-center gap-1">
                    switch <ChevronDown className={cn("h-3 w-3 transition", switching && "rotate-180")} />
                  </button>
                )}
              </div>
              {switching && (
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                  {others.map((b) => (
                    <button key={b.id} type="button" title={b.title}
                      onClick={() => { setBookId(b.id); seed(b); setSwitching(false); }}
                      className="shrink-0 rounded hover:ring-2 hover:ring-terra transition">
                      <GeneratedCover book={b} className="h-16 w-11 rounded" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div>
            <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {isAudio ? "Time elapsed" : "Current page"}
            </label>
            {isAudio ? (
              <div className="mt-1 flex items-center gap-2">
                <Input autoFocus value={hours} onChange={(e) => { setHours(e.target.value); setConfirmCorrect(false); }} inputMode="numeric" className="w-20 font-mono" aria-label="Hours" />
                <span className="text-sm text-muted-foreground">h</span>
                <Input value={mins} onChange={(e) => { setMins(e.target.value); setConfirmCorrect(false); }} inputMode="numeric" className="w-20 font-mono" aria-label="Minutes" />
                <span className="text-sm text-muted-foreground">m</span>
              </div>
            ) : (
              <Input autoFocus value={page} onChange={(e) => { setPage(e.target.value); setConfirmCorrect(false); }} inputMode="numeric" className="mt-1" />
            )}
            <p className="mt-1 text-xs text-muted-foreground italic">{fromLabel}</p>
            {isEbook && <p className="mt-1 font-mono text-xs text-muted-foreground">Page-based tracking. Location tracking coming soon.</p>}
          </div>

          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">When</span>
            <Popover open={whenOpen} onOpenChange={setWhenOpen}>
              <PopoverTrigger asChild>
                <button type="button" className="inline-flex items-center gap-1 rounded-full bg-mist px-3 py-1 hover:bg-muted">
                  {whenLabel} <ChevronDown className="h-3 w-3" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2" align="start">
                <div className="flex gap-1 mb-2">
                  <Button type="button" size="sm" variant="ghost" onClick={() => { setDay(new Date()); setWhenOpen(false); }}>Today</Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => { const d = new Date(); d.setDate(d.getDate() - 1); setDay(d); setWhenOpen(false); }}>Yesterday</Button>
                </div>
                <Calendar mode="single" selected={day} onSelect={(d) => { if (d) { setDay(d); setWhenOpen(false); } }} disabled={(d) => d > new Date()} className="p-1 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <button type="button" onClick={() => setMoreOpen((v) => !v)} className="text-xs text-muted-foreground hover:text-ink inline-flex items-center gap-1">
              More <ChevronDown className={cn("h-3 w-3 transition", moreOpen && "rotate-180")} />
            </button>
            {moreOpen && (
              <div className="mt-3 space-y-3">
                <div>
                  <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Duration (minutes)</label>
                  <Input value={duration} onChange={(e) => setDuration(e.target.value)} inputMode="numeric" className="mt-1 w-28" />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {MOODS.map((m) => (
                    <button key={m.key} type="button" onClick={() => setMood(mood === m.key ? "" : m.key)}
                      className={cn("rounded-full px-3 py-1 text-xs transition border", mood === m.key ? "border-transparent text-paper" : "border-border hover:bg-mist")}
                      style={mood === m.key ? { background: m.color } : undefined}>
                      <span className="inline-block h-2 w-2 rounded-full mr-1.5 align-middle" style={{ background: m.color }} />
                      {m.label}
                    </button>
                  ))}
                </div>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Any thoughts?" rows={2}
                  className="w-full bg-transparent border-0 border-b border-mist text-sm placeholder:text-muted-foreground/40 resize-none focus:outline-none focus:border-terra py-1" />
                <Input value={place} onChange={(e) => setPlace(e.target.value)} placeholder="Where?" />
              </div>
            )}
          </div>

          {confirmCorrect && (
            <p className="text-sm text-muted-foreground">
              That's behind where you were. Correct position instead? No session will be logged.
            </p>
          )}

          <div className="flex items-center justify-between gap-3">
            <button type="button" onClick={startTimer} className="text-xs text-muted-foreground hover:text-ink transition">
              Reading now — start timer →
            </button>
            <Button type="submit" className="rounded-full" disabled={save.isPending}>
              {save.isPending ? "Saving…" : confirmCorrect ? "Correct position" : "Log session"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
