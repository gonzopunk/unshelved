import type { Database } from "@/integrations/supabase/types";

type UB = Database["public"]["Tables"]["user_books"]["Row"];
type SessionInsert = Database["public"]["Tables"]["reading_sessions"]["Insert"];
type UBPatch = Partial<Database["public"]["Tables"]["user_books"]["Update"]>;

/** Same calendar day in the user's local timezone (never UTC). */
export function isLocalToday(d: Date, now: Date = new Date()): boolean {
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

/** Today → now; any other day → local noon of that day (avoids timezone day-shift). */
export function sessionStart(day: Date, now: Date = new Date()): Date {
  if (isLocalToday(day, now)) return now;
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), 12, 0, 0, 0);
}

export type LogInput = {
  bookId: string;
  userId: string;
  format: string;
  userBook: Pick<UB, "id" | "current_page" | "current_seconds" | "total_pages" | "total_seconds">;
  /** pages (print/ebook) or seconds (audiobook) */
  newPosition: number;
  /** last known position, defaults to the stored one */
  lastPosition?: number;
  day: Date;
  /** minutes; null/0 = no duration */
  durationMinutes?: number | null;
  mood?: string | null;
  note?: string | null;
  location?: string | null;
  now?: Date;
};

export type LogResult =
  | { kind: "no_progress" }
  | { kind: "regressed"; correction: UBPatch }
  | { kind: "ok"; row: SessionInsert; patch: UBPatch };

function pctPatch(isAudio: boolean, pos: number, ub: LogInput["userBook"]): UBPatch {
  const total = isAudio ? ub.total_seconds : ub.total_pages;
  const p: UBPatch = isAudio ? { current_seconds: pos } : { current_page: pos };
  if (total && total > 0) p.progress_pct = Math.min(100, Math.round((pos / total) * 100));
  return p;
}

export function buildSessionLog(i: LogInput): LogResult {
  const now = i.now ?? new Date();
  const isAudio = i.format === "audiobook";
  const stored = (isAudio ? i.userBook.current_seconds : i.userBook.current_page) ?? 0;
  const last = i.lastPosition ?? stored;
  const pos = Math.max(0, Math.round(i.newPosition));
  const read = pos - last;
  if (read === 0) return { kind: "no_progress" };
  if (read < 0) return { kind: "regressed", correction: pctPatch(isAudio, pos, i.userBook) };

  const startedAt = sessionStart(i.day, now);
  const dur = i.durationMinutes && i.durationMinutes > 0 ? Math.round(i.durationMinutes) : null;
  const row: SessionInsert = {
    book_id: i.bookId,
    user_id: i.userId,
    started_at: startedAt.toISOString(),
    ended_at: dur ? new Date(startedAt.getTime() + dur * 60_000).toISOString() : null,
    minutes: dur,
    mood: i.mood || null,
    session_note: i.note?.trim() || null,
    location: i.location?.trim() || null,
  };
  if (isAudio) {
    row.start_seconds = last;
    row.end_seconds = pos;
  } else {
    row.start_page = last;
    row.end_page = pos;
    row.pages_read = read;
  }
  // Only move stored progress when logging today, or when moving beyond it.
  const patch = isLocalToday(i.day, now) || pos > stored ? pctPatch(isAudio, pos, i.userBook) : {};
  return { kind: "ok", row, patch };
}
