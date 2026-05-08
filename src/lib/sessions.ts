import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import type { Database } from "@/integrations/supabase/types";

export type Session = Database["public"]["Tables"]["reading_sessions"]["Row"];
export type SessionInsert = Database["public"]["Tables"]["reading_sessions"]["Insert"];

export const MOODS = [
  { key: "flowing", label: "flowing", color: "#6FB37A" },
  { key: "couldnt_stop", label: "couldn't stop", color: "#D17648" },
  { key: "steady", label: "steady", color: "#5DA8D5" },
  { key: "slogging", label: "slogging", color: "#8B7355" },
  { key: "tired", label: "tired", color: "#9CA3AF" },
  { key: "distracted", label: "distracted", color: "#C5A572" },
] as const;

export type MoodKey = (typeof MOODS)[number]["key"];

export function moodInfo(key: string | null | undefined) {
  return MOODS.find((m) => m.key === key);
}

/* ---------- queries ---------- */

export function useBookSessions(bookId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["book-sessions", bookId, user?.id],
    enabled: !!user && !!bookId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reading_sessions")
        .select("*")
        .eq("book_id", bookId)
        .order("started_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Session[];
    },
  });
}

export function useAllSessions(daysBack = 30) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["all-sessions", user?.id, daysBack],
    enabled: !!user,
    queryFn: async () => {
      const since = new Date(Date.now() - daysBack * 86_400_000).toISOString();
      const { data, error } = await supabase
        .from("reading_sessions")
        .select("*, books(title, cover_color)")
        .gte("started_at", since)
        .order("started_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/* ---------- mutations ---------- */

type SaveArgs = SessionInsert & {
  // Optional auto-progress patch for the linked user_books row
  userBookId?: string;
  patchUserBook?: Partial<Database["public"]["Tables"]["user_books"]["Update"]>;
};

export function useSaveSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userBookId, patchUserBook, ...row }: SaveArgs) => {
      const { error } = await supabase.from("reading_sessions").insert(row);
      if (error) throw error;
      if (userBookId && patchUserBook && Object.keys(patchUserBook).length) {
        await supabase.from("user_books").update(patchUserBook).eq("id", userBookId);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["book-sessions"] });
      qc.invalidateQueries({ queryKey: ["all-sessions"] });
      qc.invalidateQueries({ queryKey: ["book"] });
      qc.invalidateQueries({ queryKey: ["library"] });
    },
  });
}

export function useDeleteSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reading_sessions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["book-sessions"] });
      qc.invalidateQueries({ queryKey: ["all-sessions"] });
    },
  });
}

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

function sessionMinutes(s: Session): number {
  if (s.minutes && s.minutes > 0) return s.minutes;
  if (s.ended_at) return Math.max(1, (new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 60_000);
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
  if (wSum > 0 && mSum > 0) {
    const perMin = pSum / mSum; // units per real-minute
    pacePerHour = fmt === "audiobook" ? perMin / 60 : perMin * 60; // sec/min → ×; pages/min → /h
    if (remainingUnits != null && remainingUnits > 0 && perMin > 0) {
      etaMinutes = remainingUnits / perMin;
      etaDate = new Date(Date.now() + etaMinutes * 60_000);
    }
  }

  return { count: sessions.length, thisWeek, totalMinutes, longestMinutes, pacePerHour, unitLabel, etaMinutes, etaDate };
}

/** Daily streak from a list of sessions (any books). */
export function computeStreak(sessions: { started_at: string }[]): number {
  if (sessions.length === 0) return 0;
  const days = new Set<string>();
  for (const s of sessions) {
    const d = new Date(s.started_at);
    days.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
  }
  let streak = 0;
  const cur = new Date();
  // Allow today OR yesterday as the anchor (a streak shouldn't reset until you've missed a full day)
  const todayKey = `${cur.getFullYear()}-${cur.getMonth()}-${cur.getDate()}`;
  if (!days.has(todayKey)) {
    cur.setDate(cur.getDate() - 1);
  }
  while (true) {
    const k = `${cur.getFullYear()}-${cur.getMonth()}-${cur.getDate()}`;
    if (days.has(k)) {
      streak++;
      cur.setDate(cur.getDate() - 1);
    } else break;
  }
  return streak;
}

export function partOfDay(date: Date): "morning" | "afternoon" | "evening" | "night" {
  const h = date.getHours();
  if (h < 5) return "night";
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  if (h < 22) return "evening";
  return "night";
}

export function fmtMinutes(m: number): string {
  if (!isFinite(m) || m <= 0) return "0m";
  const h = Math.floor(m / 60);
  const mm = Math.round(m % 60);
  return h > 0 ? `${h}h ${mm}m` : `${mm}m`;
}
