import { useMemo } from "react";
import { MOODS, type Session } from "@/lib/sessions";
import { timeOfDayCounts } from "@/lib/session-math";

const PARTS = ["morning", "afternoon", "evening", "night"] as const;

export default function RhythmStrip({ sessions }: { sessions: Session[] }) {
  const { byPart, byMood, total } = useMemo(() => {
    const byPart = timeOfDayCounts(sessions);
    const byMood: Record<string, number> = {};
    for (const s of sessions) {
      if (s.mood) byMood[s.mood] = (byMood[s.mood] ?? 0) + 1;
    }
    return { byPart, byMood, total: sessions.length };
  }, [sessions]);

  if (total === 0) return null;
  const peak = Math.max(...Object.values(byPart), 1);

  return (
    <div className="rounded-2xl bg-card shadow-paper p-4 grid md:grid-cols-2 gap-6">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-3">
          Time of day
        </div>
        <div className="flex items-end justify-between h-20 gap-2">
          {PARTS.map((p) => (
            <div key={p} className="flex-1 flex flex-col items-center gap-1.5">
              <div
                className="w-full rounded-t-md bg-gradient-to-t from-forest to-sage"
                style={{ height: `${(byPart[p] / peak) * 100}%`, minHeight: byPart[p] > 0 ? "4px" : "0" }}
                title={`${byPart[p]} sessions`}
              />
              <div className="font-mono text-[10px] text-muted-foreground capitalize">{p}</div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-3">
          Mood mix
        </div>
        <div className="flex flex-wrap gap-2">
          {MOODS.map((m) => {
            const n = byMood[m.key] ?? 0;
            if (n === 0) return null;
            return (
              <div key={m.key} className="inline-flex items-center gap-1.5 rounded-full bg-mist px-3 py-1 text-xs">
                <span className="h-2 w-2 rounded-full" style={{ background: m.color }} />
                {m.label} <span className="font-mono text-muted-foreground">{n}</span>
              </div>
            );
          })}
          {Object.keys(byMood).length === 0 && (
            <p className="text-xs text-muted-foreground italic">No moods logged yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
