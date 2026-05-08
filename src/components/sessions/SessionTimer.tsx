import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, Square, Timer } from "lucide-react";

const KEY = (bookId: string) => `unshelved.timer.${bookId}`;

type TimerState = { startedAt: number; accumulated: number; running: boolean };

function load(bookId: string): TimerState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY(bookId));
    return raw ? (JSON.parse(raw) as TimerState) : null;
  } catch { return null; }
}

function save(bookId: string, s: TimerState | null) {
  if (typeof window === "undefined") return;
  try {
    if (s) localStorage.setItem(KEY(bookId), JSON.stringify(s));
    else localStorage.removeItem(KEY(bookId));
  } catch {}
}

function fmt(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export default function SessionTimer({
  bookId,
  onStop,
}: {
  bookId: string;
  onStop: (elapsedSeconds: number, startedAt: Date) => void;
}) {
  const [state, setState] = useState<TimerState | null>(null);
  const [now, setNow] = useState(Date.now());
  const tick = useRef<number | null>(null);

  // hydrate
  useEffect(() => {
    setState(load(bookId));
  }, [bookId]);

  // tick
  useEffect(() => {
    if (state?.running) {
      tick.current = window.setInterval(() => setNow(Date.now()), 500);
      return () => { if (tick.current) window.clearInterval(tick.current); };
    }
  }, [state?.running]);

  const elapsed = state
    ? Math.floor((state.accumulated + (state.running ? now - state.startedAt : 0)) / 1000)
    : 0;

  const start = () => {
    const s: TimerState = { startedAt: Date.now(), accumulated: 0, running: true };
    save(bookId, s); setState(s);
  };
  const pause = () => {
    if (!state?.running) return;
    const s: TimerState = {
      startedAt: Date.now(),
      accumulated: state.accumulated + (Date.now() - state.startedAt),
      running: false,
    };
    save(bookId, s); setState(s);
  };
  const resume = () => {
    if (!state || state.running) return;
    const s: TimerState = { ...state, startedAt: Date.now(), running: true };
    save(bookId, s); setState(s);
  };
  const stop = () => {
    if (!state) return;
    const total = elapsed;
    const startedAt = new Date(Date.now() - total * 1000);
    save(bookId, null); setState(null);
    onStop(total, startedAt);
  };

  if (!state) {
    return (
      <Button type="button" onClick={start} className="rounded-full gap-2 bg-forest text-paper hover:bg-forest/90">
        <Play className="h-4 w-4" /> Start reading
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-full bg-card shadow-paper px-3 py-2">
      <div className="flex items-center gap-2 px-2">
        <Timer className={"h-4 w-4 " + (state.running ? "text-terra animate-pulse" : "text-muted-foreground")} />
        <span className="font-mono text-base tabular-nums">{fmt(elapsed)}</span>
      </div>
      {state.running ? (
        <Button type="button" variant="outline" size="sm" className="rounded-full gap-1" onClick={pause}>
          <Pause className="h-3.5 w-3.5" /> Pause
        </Button>
      ) : (
        <Button type="button" variant="outline" size="sm" className="rounded-full gap-1" onClick={resume}>
          <Play className="h-3.5 w-3.5" /> Resume
        </Button>
      )}
      <Button type="button" size="sm" className="rounded-full gap-1" onClick={stop}>
        <Square className="h-3.5 w-3.5" /> Stop & log
      </Button>
    </div>
  );
}
