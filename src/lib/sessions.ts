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
  /** Only patch user_books (position correction); insert no session row. */
  skipSession?: boolean;
};

export function useSaveSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userBookId, patchUserBook, skipSession, ...row }: SaveArgs) => {
      if (!skipSession) {
        const { error } = await supabase.from("reading_sessions").insert(row);
        if (error) throw error;
      }
      if (userBookId && patchUserBook && Object.keys(patchUserBook).length) {
        const { error } = await supabase.from("user_books").update(patchUserBook).eq("id", userBookId);
        if (error) throw error;
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

export { computeStats, sessionMinutes, fmtMinutes, type SessionStats } from "./session-math";

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

export { partOfDay } from "./session-math";

