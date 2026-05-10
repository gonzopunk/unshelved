// Pure aggregators for the Visualizations page. Read directly from
// useLibrary results + reading_sessions + tag/axis maps.
import type { BookWithShelf, BookStatus, BookFormat } from "@/lib/queries";
import type { Database } from "@/integrations/supabase/types";

type Session = Database["public"]["Tables"]["reading_sessions"]["Row"];

export type BarPoint<K extends string = string> = { key: K; label: string; value: number };

export function statusMix(library: BookWithShelf[]): BarPoint<BookStatus>[] {
  const counts = new Map<BookStatus, number>();
  for (const b of library) {
    const ub = b.user_books[0];
    if (!ub) continue;
    counts.set(ub.status, (counts.get(ub.status) ?? 0) + 1);
  }
  const labels: Record<BookStatus, string> = {
    want: "Want", reading: "Reading", later: "Later", dnf: "DNF",
    loved: "Loved", liked: "Liked", meh: "Meh",
  };
  return [...counts.entries()]
    .map(([key, value]) => ({ key, label: labels[key] ?? key, value }))
    .sort((a, b) => b.value - a.value);
}

export type FormatStatusRow = { format: BookFormat; label: string } & Partial<Record<BookStatus, number>>;
export function formatSplit(library: BookWithShelf[]): FormatStatusRow[] {
  const formats: BookFormat[] = ["print", "ebook", "audiobook"];
  const labels: Record<BookFormat, string> = { print: "Print", ebook: "Ebook", audiobook: "Audiobook" };
  const out = formats.map((f) => ({ format: f, label: labels[f] } as FormatStatusRow));
  for (const b of library) {
    const ub = b.user_books[0];
    if (!ub) continue;
    const row = out.find((r) => r.format === b.format);
    if (!row) continue;
    row[ub.status] = ((row[ub.status] as number) ?? 0) + 1;
  }
  return out;
}

export function finishedByMonth(library: BookWithShelf[], months = 12): { month: string; label: string; count: number }[] {
  const now = new Date();
  const buckets: { month: string; label: string; count: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    buckets.push({ month, label: d.toLocaleString(undefined, { month: "short" }), count: 0 });
  }
  const idx = new Map(buckets.map((b, i) => [b.month, i]));
  for (const b of library) {
    const fin = b.user_books[0]?.finished_at;
    if (!fin) continue;
    const month = fin.slice(0, 7);
    const i = idx.get(month);
    if (i != null) buckets[i].count++;
  }
  return buckets;
}

export function ratingHistogram(library: BookWithShelf[]): { rating: number; count: number }[] {
  const out = [1, 2, 3, 4, 5].map((rating) => ({ rating, count: 0 }));
  for (const b of library) {
    const r = b.user_books[0]?.rating;
    if (r && r >= 1 && r <= 5) out[r - 1].count++;
  }
  return out;
}

export function topAuthors(library: BookWithShelf[], limit = 10): { author: string; count: number }[] {
  const m = new Map<string, number>();
  for (const b of library) {
    if (!b.author) continue;
    m.set(b.author, (m.get(b.author) ?? 0) + 1);
  }
  return [...m.entries()]
    .map(([author, count]) => ({ author, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function tagFrequency(
  bookTags: Record<string, string[]>,
  limit = 30,
): { tag: string; count: number }[] {
  const m = new Map<string, number>();
  for (const tags of Object.values(bookTags)) {
    for (const t of tags) m.set(t, (m.get(t) ?? 0) + 1);
  }
  return [...m.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export type AxisAggregate = { key: string; topValue: string; topCount: number; total: number };
export function axisAggregates(
  bookAxes: Record<string, { key: string; value: string }[]>,
): AxisAggregate[] {
  // For each axis key, count value frequencies; expose mode + total.
  const byKey = new Map<string, Map<string, number>>();
  for (const rows of Object.values(bookAxes)) {
    for (const r of rows) {
      let inner = byKey.get(r.key);
      if (!inner) byKey.set(r.key, (inner = new Map()));
      inner.set(r.value, (inner.get(r.value) ?? 0) + 1);
    }
  }
  const out: AxisAggregate[] = [];
  for (const [key, inner] of byKey.entries()) {
    let topValue = "", topCount = 0, total = 0;
    for (const [v, c] of inner.entries()) {
      total += c;
      if (c > topCount) { topCount = c; topValue = v; }
    }
    out.push({ key, topValue, topCount, total });
  }
  return out.sort((a, b) => b.total - a.total).slice(0, 8);
}

export function paceHeatmap(sessions: Session[], days = 365): { date: string; minutes: number }[] {
  const now = new Date();
  const out: { date: string; minutes: number }[] = [];
  const idx = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    idx.set(key, out.length);
    out.push({ date: key, minutes: 0 });
  }
  for (const s of sessions) {
    const k = (s.started_at ?? "").slice(0, 10);
    const i = idx.get(k);
    if (i != null) out[i].minutes += s.minutes ?? 0;
  }
  return out;
}
