import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Clock, Zap, History } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { track } from "@/lib/analytics";
import { MOODS, useSaveSession, type MoodKey, type SessionInsert } from "@/lib/sessions";
import SessionTimer from "./SessionTimer";
import type { Database } from "@/integrations/supabase/types";

type UserBook = Database["public"]["Tables"]["user_books"]["Row"];

type Mode = "now" | "quick" | "backfill";

export default function NewSessionCard({
  bookId,
  userId,
  format: fmt,
  userBook,
}: {
  bookId: string;
  userId: string;
  format: string;
  userBook: UserBook;
}) {
  const [mode, setMode] = useState<Mode>("quick");
  const [pages, setPages] = useState("");
  const [endPage, setEndPage] = useState("");
  const [minutes, setMinutes] = useState("");
  const [pct, setPct] = useState("");
  const [seconds, setSeconds] = useState("");
  const [date, setDate] = useState<Date>(new Date());
  const [time, setTime] = useState(format(new Date(), "HH:mm"));
  const [mood, setMood] = useState<MoodKey | "">("");
  const [note, setNote] = useState("");
  const [location, setLocation] = useState("");
  const save = useSaveSession();

  const isAudio = fmt === "audiobook";
  const isEbook = fmt === "ebook";

  const reset = () => {
    setPages(""); setEndPage(""); setMinutes(""); setPct(""); setSeconds("");
    setDate(new Date()); setTime(format(new Date(), "HH:mm"));
    setMood(""); setNote(""); setLocation("");
  };

  /** Build the session insert + the corresponding user_books patch. */
  const buildSave = (overrides?: Partial<{ minutes: number; startedAt: Date; endedAt: Date | null }>) => {
    const startedAt = overrides?.startedAt ?? buildDateTime(date, time);
    const min = overrides?.minutes ?? (minutes ? Number(minutes) : 0);
    const endedAt = overrides?.endedAt ?? (min > 0 ? new Date(startedAt.getTime() + min * 60_000) : null);

    const row: SessionInsert = {
      book_id: bookId,
      user_id: userId,
      started_at: startedAt.toISOString(),
      ended_at: endedAt ? endedAt.toISOString() : null,
      minutes: min || null,
      mood: mood || null,
      session_note: note.trim() || null,
      location: location.trim() || null,
    };

    const patch: Partial<Database["public"]["Tables"]["user_books"]["Update"]> = {};

    if (isAudio) {
      const sec = seconds ? Number(seconds) : (min ? min * 60 : 0);
      if (sec > 0) {
        const startSec = userBook.current_seconds ?? 0;
        const endSec = startSec + sec;
        row.start_seconds = startSec;
        row.end_seconds = endSec;
        patch.current_seconds = endSec;
        if (userBook.total_seconds && userBook.total_seconds > 0) {
          patch.progress_pct = Math.min(100, Math.round((endSec / userBook.total_seconds) * 100));
        }
      }
    } else if (isEbook && pct) {
      const startPct = Number(userBook.progress_pct ?? 0);
      const endPct = Number(pct);
      row.start_pct = startPct;
      row.end_pct = endPct;
      patch.progress_pct = endPct;
    } else {
      const p = pages ? Number(pages) : 0;
      const ep = endPage ? Number(endPage) : 0;
      let startPg: number | null = null;
      let endPg: number | null = null;
      let read = 0;
      if (ep > 0) {
        endPg = ep;
        startPg = (userBook.current_page ?? 0);
        read = Math.max(0, ep - startPg);
      } else if (p > 0) {
        startPg = userBook.current_page ?? 0;
        endPg = startPg + p;
        read = p;
      }
      if (read > 0 && startPg != null && endPg != null) {
        row.start_page = startPg;
        row.end_page = endPg;
        row.pages_read = read;
        patch.current_page = endPg;
        if (userBook.total_pages && userBook.total_pages > 0) {
          patch.progress_pct = Math.min(100, Math.round((endPg / userBook.total_pages) * 100));
        }
      }
    }

    return { row, patch };
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const { row, patch } = buildSave();
    if (!row.minutes && !row.pages_read && !row.end_seconds && !row.end_pct) {
      toast.error("Add at least time or progress");
      return;
    }
    save.mutate(
      { ...row, userBookId: userBook.id, patchUserBook: patch },
      {
        onSuccess: () => {
          track("session_logged");
          toast.success("Session logged");
          reset();
          // finish prompt
          const totalUnits = isAudio ? userBook.total_seconds : userBook.total_pages;
          const newPos = isAudio ? patch.current_seconds : patch.current_page;
          if (totalUnits && newPos && newPos >= totalUnits) {
            toast("You finished the book — mark the shelf?", { duration: 6000 });
          }
        },
      },
    );
  };

  const handleTimerStop = (elapsedSeconds: number, startedAt: Date) => {
    const min = Math.max(1, Math.round(elapsedSeconds / 60));
    setMinutes(String(min));
    setMode("quick");
    toast(`Logged ${min}m — add pages and save`);
  };

  return (
    <div className="rounded-2xl bg-card shadow-paper p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="inline-flex items-center gap-1 rounded-full bg-mist p-1">
          <ModeChip on={mode === "now"} icon={<Zap className="h-3.5 w-3.5" />} label="Read now" onClick={() => setMode("now")} />
          <ModeChip on={mode === "quick"} icon={<Clock className="h-3.5 w-3.5" />} label="Quick log" onClick={() => setMode("quick")} />
          <ModeChip on={mode === "backfill"} icon={<History className="h-3.5 w-3.5" />} label="Backfill" onClick={() => setMode("backfill")} />
        </div>
        {mode === "now" && (
          <SessionTimer bookId={bookId} onStop={handleTimerStop} />
        )}
      </div>

      {mode === "now" && (
        <p className="text-sm text-muted-foreground italic">
          Start the timer when you sit down. When you stop, we'll fill in the minutes — you just add pages and save.
        </p>
      )}

      {(mode === "quick" || mode === "backfill" || minutes) && (
        <form onSubmit={submit} className="space-y-3">
          {mode === "backfill" && (
            <div className="flex flex-wrap gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" className={cn("rounded-full gap-2 font-normal", !date && "text-muted-foreground")}>
                    <CalendarIcon className="h-4 w-4" />
                    {format(date, "MMM d, yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} initialFocus className={cn("p-3 pointer-events-auto")} disabled={(d) => d > new Date()} />
                </PopoverContent>
              </Popover>
              <Input value={time} onChange={(e) => setTime(e.target.value)} type="time" className="w-32 rounded-full" />
            </div>
          )}

          <div className="flex flex-wrap gap-3 items-end">
            {!isAudio && !isEbook && (
              <>
                <Field label="Pages read">
                  <Input value={pages} onChange={(e) => { setPages(e.target.value); setEndPage(""); }} inputMode="numeric" placeholder={`from p. ${userBook.current_page ?? 0}`} />
                </Field>
                <Field label="…or end on page">
                  <Input value={endPage} onChange={(e) => { setEndPage(e.target.value); setPages(""); }} inputMode="numeric" placeholder="end p." />
                </Field>
              </>
            )}
            {isEbook && (
              <Field label="End at %">
                <Input value={pct} onChange={(e) => setPct(e.target.value)} inputMode="decimal" placeholder={`from ${Math.round(Number(userBook.progress_pct ?? 0))}%`} />
              </Field>
            )}
            {isAudio && (
              <Field label="Listened (sec)">
                <Input value={seconds} onChange={(e) => setSeconds(e.target.value)} inputMode="numeric" placeholder="auto from minutes" />
              </Field>
            )}
            <Field label="Minutes">
              <Input value={minutes} onChange={(e) => setMinutes(e.target.value)} inputMode="numeric" />
            </Field>
          </div>

          {!isAudio && !isEbook && mode === "quick" && (
            <div className="flex flex-wrap gap-1.5">
              {[10, 25, 50].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPages(String((Number(pages) || 0) + n))}
                  className="rounded-full bg-mist hover:bg-muted px-3 py-1 font-mono text-xs"
                >
                  +{n} pages
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-1.5">
            {MOODS.map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => setMood(mood === m.key ? "" : m.key)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs transition border",
                  mood === m.key ? "border-transparent text-paper" : "border-border bg-transparent hover:bg-mist",
                )}
                style={mood === m.key ? { background: m.color } : undefined}
              >
                <span className="inline-block h-2 w-2 rounded-full mr-1.5 align-middle" style={{ background: m.color }} />
                {m.label}
              </button>
            ))}
          </div>

          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="How did this stretch feel? (felt tired today, but it pulled me in…)"
            className="min-h-16 bg-transparent border-border resize-none"
          />

          <div className="flex flex-wrap gap-2 items-center justify-between">
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="where? (train, porch, bed)"
              className="w-56 rounded-full bg-transparent"
            />
            <Button type="submit" className="rounded-full" disabled={save.isPending}>
              {save.isPending ? "Saving…" : "Log session"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

function buildDateTime(date: Date, time: string): Date {
  const [h, m] = time.split(":").map(Number);
  const d = new Date(date);
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}

function ModeChip({ on, icon, label, onClick }: { on: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition",
        on ? "bg-forest text-paper" : "text-ink hover:bg-paper/60",
      )}
    >
      {icon} {label}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex-1 min-w-28">
      <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
