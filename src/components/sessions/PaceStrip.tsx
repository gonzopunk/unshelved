import { useMemo } from "react";
import { format } from "date-fns";
import { computeStats, fmtMinutes, type Session } from "@/lib/sessions";

export default function PaceStrip({
  sessions,
  format: fmt,
  remainingUnits,
  accent,
}: {
  sessions: Session[];
  format: string;
  remainingUnits: number | null;
  accent: string;
}) {
  const stats = useMemo(() => computeStats(sessions, fmt, remainingUnits), [sessions, fmt, remainingUnits]);

  // sparkline data: last 14 sessions in oldest→newest order, mapped to units read per session
  const points = useMemo(() => {
    const last = sessions.slice(0, 14).reverse();
    const isAudio = fmt === "audiobook";
    return last.map((s) => {
      if (isAudio) {
        if (s.start_seconds != null && s.end_seconds != null) return Math.max(0, s.end_seconds - s.start_seconds) / 60;
        return s.minutes ?? 0;
      }
      if (s.start_page != null && s.end_page != null) return Math.max(0, s.end_page - s.start_page);
      return s.pages_read ?? 0;
    });
  }, [sessions, fmt]);

  return (
    <div className="rounded-2xl bg-card shadow-paper p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
      <Stat
        label={fmt === "audiobook" ? "Listen rate" : "Pace"}
        value={
          stats.pacePerHour
            ? fmt === "audiobook"
              ? `${stats.pacePerHour.toFixed(2)}×`
              : `${Math.round(stats.pacePerHour)} pages/h`
            : "—"
        }
        sub={stats.count > 0 ? `from ${Math.min(8, stats.count)} sessions` : "no data yet"}
      />
      <Stat
        label="Time left"
        value={stats.etaMinutes ? fmtMinutes(stats.etaMinutes) : "—"}
        sub={stats.etaDate ? `≈ finish ${format(stats.etaDate, "MMM d")}` : "needs more sessions"}
      />
      <Stat
        label="Sessions"
        value={String(stats.count)}
        sub={`${stats.thisWeek} this week`}
      />
      <Stat
        label="Longest stretch"
        value={stats.longestMinutes > 0 ? fmtMinutes(stats.longestMinutes) : "—"}
        sub={stats.totalMinutes > 0 ? `${fmtMinutes(stats.totalMinutes)} total` : "—"}
      />

      {points.length > 1 && (
        <div className="col-span-2 md:col-span-4 mt-1">
          <Sparkline values={points} color={accent} />
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="font-display text-2xl mt-1">{value}</div>
      <div className="font-mono text-[11px] text-muted-foreground mt-0.5">{sub}</div>
    </div>
  );
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(...values, 1);
  const w = 100;
  const h = 24;
  const step = w / Math.max(1, values.length - 1);
  const pts = values.map((v, i) => `${(i * step).toFixed(2)},${(h - (v / max) * h).toFixed(2)}`).join(" ");
  const area = `0,${h} ${pts} ${w},${h}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="w-full h-8">
      <polygon points={area} fill={color} fillOpacity={0.15} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
