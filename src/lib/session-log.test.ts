import { describe, it, expect } from "vitest";
import { buildSessionLog, historicalStartPosition, isLocalToday, sessionStart } from "./session-log";
import { computeStats, timeOfDayCounts } from "./session-math";
import type { Database } from "@/integrations/supabase/types";
type Session = Database["public"]["Tables"]["reading_sessions"]["Row"];

const ub = { id: "ub", current_page: 110, current_seconds: 0, total_pages: 200, total_seconds: null };
const now = new Date(2026, 10, 12, 21, 30); // 9:30pm local
const base = { bookId: "b", userId: "u", format: "print", userBook: ub, now };

describe("buildSessionLog", () => {
  it("unchanged position → no progress", () => {
    expect(buildSessionLog({ ...base, newPosition: 110, day: now }).kind).toBe("no_progress");
  });
  it("lower position → correction only, no session", () => {
    const r = buildSessionLog({ ...base, newPosition: 90, day: now });
    expect(r).toEqual({ kind: "regressed", correction: { current_page: 90, progress_pct: 45 } });
  });
  it("read = new − last; no duration → minutes and ended_at null", () => {
    const r = buildSessionLog({ ...base, newPosition: 150, day: now });
    if (r.kind !== "ok") throw new Error();
    expect(r.row.pages_read).toBe(40);
    expect(r.row.minutes).toBeNull();
    expect(r.row.ended_at).toBeNull();
    expect(r.patch).toEqual({ current_page: 150, progress_pct: 75 });
  });
  it("duration 0 is treated as no duration", () => {
    const r = buildSessionLog({ ...base, newPosition: 150, day: now, durationMinutes: 0 });
    if (r.kind !== "ok") throw new Error();
    expect(r.row.minutes).toBeNull();
  });
  it("duration sets ended_at = start + duration", () => {
    const y = new Date(2026, 10, 11);
    const r = buildSessionLog({ ...base, newPosition: 150, day: y, durationMinutes: 30 });
    if (r.kind !== "ok") throw new Error();
    if (!r.row.ended_at || !r.row.started_at) throw new Error();
    expect(new Date(r.row.ended_at).getTime() - new Date(r.row.started_at).getTime()).toBe(30 * 60_000);
  });
  it("backfill behind stored position does not regress progress", () => {
    const r = buildSessionLog({ ...base, newPosition: 80, sessions: [sess(1, 0, 50, null)], day: new Date(2026, 10, 1) });
    if (r.kind !== "ok") throw new Error();
    expect(r.patch).toEqual({});
  });
  it("backfill beyond stored position does update progress", () => {
    const r = buildSessionLog({ ...base, newPosition: 120, day: new Date(2026, 10, 1) });
    if (r.kind !== "ok") throw new Error();
    expect(r.patch.current_page).toBe(120);
  });
  it("past lower positions are accepted as history, not corrections", () => {
    const r = buildSessionLog({ ...base, newPosition: 56, day: new Date(2026, 10, 11) });
    if (r.kind !== "ok") throw new Error();
    expect(r.row.start_page).toBe(0);
    expect(r.row.end_page).toBe(56);
    expect(r.row.pages_read).toBe(56);
    expect(r.row.backdated).toBe(true);
    expect(r.patch).toEqual({});
  });
  it("page 56 starts from the latest historical end at 35, without changing later rows", () => {
    const sessions = [sess(12, 56, 110, null), sess(10, 0, 35, null), sess(9, 0, 20, null)];
    const before = structuredClone(sessions);
    const r = buildSessionLog({ ...base, newPosition: 56, day: new Date(2026, 10, 11), sessions });
    if (r.kind !== "ok") throw new Error();
    expect([r.row.start_page, r.row.end_page, r.row.pages_read]).toEqual([35, 56, 21]);
    expect(sessions).toEqual(before);
  });
  it("includes sessions later on the chosen local date and ignores other books", () => {
    const sameDay = { ...sess(11, 0, 35, null), started_at: new Date(2026, 10, 11, 23, 59).toISOString() };
    const otherBook = { ...sess(11, 0, 90, null), book_id: "other" };
    expect(historicalStartPosition([sameDay, otherBook, sess(12, 35, 110, null)], "b", "ebook", new Date(2026, 10, 11))).toBe(35);
  });
  it("audio uses historical end seconds and defaults to zero without history", () => {
    const audio = { ...base, format: "audiobook", userBook: { ...ub, current_seconds: 7200, total_seconds: 14400 } };
    const day = new Date(2026, 10, 11);
    const prior = { ...sess(10, 0, 0, null), end_seconds: 2100 };
    const r = buildSessionLog({ ...audio, newPosition: 3360, day, sessions: [prior] });
    if (r.kind !== "ok") throw new Error();
    expect([r.row.start_seconds, r.row.end_seconds]).toEqual([2100, 3360]);
    expect((Number(r.row.end_seconds) - Number(r.row.start_seconds)) / 60).toBe(21);
    expect(r.patch).toEqual({});
    expect(historicalStartPosition([], "b", "audiobook", day)).toBe(0);
  });
  it("today is not marked date-only", () => {
    const r = buildSessionLog({ ...base, newPosition: 150, day: now });
    if (r.kind !== "ok") throw new Error();
    expect(r.row.backdated).toBe(false);
  });
});

describe("local dates", () => {
  it("late evening local is still today", () => {
    expect(isLocalToday(new Date(2026, 10, 12, 23, 59), now)).toBe(true);
  });
  it("backdated session starts at local noon", () => {
    const s = sessionStart(new Date(2026, 10, 3, 8), now);
    expect([s.getDate(), s.getHours()]).toEqual([3, 12]);
  });
});

function sess(day: number, start: number, end: number, minutes: number | null): Session {
  return { id: String(day + start), user_id: "u", book_id: "b", started_at: new Date(2026, 10, day, 12).toISOString(),
    backdated: false, ended_at: null, minutes, pages_read: end - start, start_page: start, end_page: end,
    start_pct: null, end_pct: null, start_seconds: null, end_seconds: null, mood: null, session_note: null, location: null } as Session;
}

describe("ETA", () => {
  it("no duration and <3 days → no ETA", () => {
    const s = computeStats([sess(11, 20, 40, null), sess(10, 0, 20, null)], "print", 100);
    expect(s.etaDate).toBeNull();
    expect(s.pacePerHour).toBeNull();
  });
  it("≥3 session days → date-based ETA", () => {
    const s = computeStats([sess(12, 40, 60, null), sess(11, 20, 40, null), sess(10, 0, 20, null)], "print", 100);
    expect(s.etaDate).not.toBeNull();
  });
  it("one-day timer sessions use pace, not date span", () => {
    const s = computeStats([sess(12, 30, 60, 30), sess(12, 0, 30, 30)], "print", 60);
    expect(s.pacePerHour).toBe(60);
    if (s.etaMinutes == null) throw new Error();
    expect(Math.round(s.etaMinutes)).toBe(60);
  });
});

describe("time-of-day counts", () => {
  it("excludes date-only noon sessions but retains genuine noon sessions", () => {
    expect(timeOfDayCounts([
      { ...sess(11, 0, 35, null), backdated: true },
      sess(12, 35, 56, 20),
    ])).toEqual({ morning: 0, afternoon: 1, evening: 0, night: 0 });
  });
});
