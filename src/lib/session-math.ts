import type { Database } from "@/integrations/supabase/types";

type Session = Database["public"]["Tables"]["reading_sessions"]["Row"];

/* ---------- math ---------- */

/** Effective units read in a session. Prefer end-start over the legacy fields. */
function unitsRead(s: Session, fmt: string): number {
  if (fmt === "audiobook") {
    if (s.start_seconds != null && s.end_seconds != null) return Math.max(0, s.end_seconds - s.start_seconds);
    // Legacy: minutes only — convert to seconds for consistency
    return (s.minutes ?? 0) * 60;
  }
  if (s.start_page != null && s.end_page != null) return Math.max(0, s.end_page - s.start_page);
  if (s.start_pct != null && s.end_pct != null) return Math.max(0, Number(s.end_pct) - Number(s.start_pct));
  return s.pages_read ?? 0;
}

/** Real-time duration. Convention: minutes null OR 0 both mean "no duration". */
export function sessionMinutes(s: Pick<Session, "minutes" | "ended_at" | "started_at">): number {
  if (s.minutes && s.minutes > 0) return s.minutes;
  if (s.minutes == null && s.ended_at) return Math.max(1, (new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 60_000);
  return 0;
}

export type SessionStats = {
  count: number;
  thisWeek: number;
  totalMinutes: number;
  longestMinutes: number;
  pacePerHour: number | null; // pages/h, %/h, or s/h depending on format
  unitLabel: string;
  etaMinutes: number | null;
  etaDate: Date | null;
};

const HALF_LIFE = 3; // EWMA half-life in sessions

export function computeStats(
  sessions: Session[],
  fmt: string,
  remainingUnits: number | null,
): SessionStats {
  const unitLabel = fmt === "audiobook" ? "× speed" : "pages/h";
  if (sessions.length === 0) {
    return { count: 0, thisWeek: 0, totalMinutes: 0, longestMinutes: 0, pacePerHour: null, unitLabel, etaMinutes: null, etaDate: null };
  }

  const weekAgo = Date.now() - 7 * 86_400_000;
  let thisWeek = 0;
  let totalMinutes = 0;
  let longestMinutes = 0;
  for (const s of sessions) {
    const m = sessionMinutes(s);
    totalMinutes += m;
    if (m > longestMinutes) longestMinutes = m;
    if (new Date(s.started_at).getTime() >= weekAgo) thisWeek++;
  }

  // EWMA pace over last 8 sessions (newest first)
  const recent = sessions.slice(0, 8);
  const decay = Math.pow(0.5, 1 / HALF_LIFE);
  let wSum = 0;
  let pSum = 0;
  let mSum = 0;
  let w = 1;
  for (const s of recent) {
    const m = sessionMinutes(s);
    if (m <= 0) { w *= decay; continue; }
    const u = unitsRead(s, fmt);
    if (u <= 0) { w *= decay; continue; }
    pSum += w * u;
    mSum += w * m;
    wSum += w;
    w *= decay;
  }

  let pacePerHour: number | null = null;
  let etaMinutes: number | null = null;
  let etaDate: Date | null = null;
  const hasRemaining = remainingUnits != null && remainingUnits > 0;
  if (wSum > 0 && mSum > 0) {
    const perMin = pSum / mSum; // units per real-minute
    pacePerHour = fmt === "audiobook" ? perMin / 60 : perMin * 60; // sec/min → ×; pages/min → /h
    if (hasRemaining && perMin > 0) etaMinutes = remainingUnits! / perMin;
  }

  // Finish date: date-based (units per calendar day) only with >= 3 distinct
  // local session days; else pace-based; else none.
  if (hasRemaining) {
    const days = new Map<string, number>();
    let unitsSum = 0;
    for (const s of sessions) {
      const u = unitsRead(s, fmt);
      if (u <= 0) continue;
      const d = new Date(s.started_at);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      days.set(key, new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime());
      unitsSum += u;
    }
    if (days.size >= 3) {
      const ts = [...days.values()];
      const spanDays = Math.round((Math.max(...ts) - Math.min(...ts)) / 86_400_000) + 1;
      const perDay = unitsSum / spanDays;
      if (perDay > 0) etaDate = new Date(Date.now() + (remainingUnits! / perDay) * 86_400_000);
    } else if (etaMinutes != null) {
      etaDate = new Date(Date.now() + etaMinutes * 60_000);
    }
  }

  return { count: sessions.length, thisWeek, totalMinutes, longestMinutes, pacePerHour, unitLabel, etaMinutes, etaDate };
}

export function fmtMinutes(m: number): string {
  if (!isFinite(m) || m <= 0) return "—"; // never render "0m"
  const h = Math.floor(m / 60);
  const mm = Math.round(m % 60);
  return h > 0 ? `${h}h ${mm}m` : `${mm}m`;
}
