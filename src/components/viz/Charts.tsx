import { useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  ResponsiveContainer,
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LabelList,
  AreaChart, Area,
  Treemap,
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
} from "recharts";
import ChartCard, { ChartEmpty } from "./ChartCard";
import {
  statusMix, formatSplit, finishedByMonth, ratingHistogram,
  topAuthors, tagFrequency, axisAggregates, paceHeatmap,
} from "@/lib/viz-data";
import type { BookWithShelf, BookStatus } from "@/lib/queries";
import type { Database } from "@/integrations/supabase/types";

type Session = Database["public"]["Tables"]["reading_sessions"]["Row"];

const FOREST = "var(--forest)";
const TERRA = "var(--terra)";
const SAGE = "var(--sage)";
const SKY = "#5DA8D5";
const SAND = "#C5A572";
const MIST = "var(--mist)";

// Cycle through tokens + cover-derived accents.
function palette(seedColors: string[], n: number): string[] {
  const base = [FOREST, TERRA, SAGE, SKY, SAND, "#8B7355"];
  const all = [...seedColors.filter(Boolean), ...base];
  const out: string[] = [];
  for (let i = 0; i < n; i++) out.push(all[i % all.length]);
  return out;
}

const STATUS_COLORS: Record<BookStatus, string> = {
  reading: TERRA,
  want: SKY,
  later: SAND,
  loved: "#B65A2E",
  liked: SAGE,
  meh: MIST,
  dnf: "#9CA3AF",
};

/* ---------------- 1. Status mix (donut) ---------------- */
export function StatusMix({ library }: { library: BookWithShelf[] }) {
  const navigate = useNavigate();
  const data = useMemo(() => statusMix(library), [library]);
  return (
    <ChartCard title="Status mix" caption="Where your library lives" hint="click a slice to filter Library">
      {data.length === 0 ? (
        <ChartEmpty>Add a few books to see your shelves take shape.</ChartEmpty>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={85}
              paddingAngle={2}
              onClick={(e: { key?: BookStatus }) =>
                e.key && navigate({ to: "/library", search: { status: e.key } as never })
              }
              cursor="pointer"
            >
              {data.map((d) => (
                <Cell key={d.key} fill={STATUS_COLORS[d.key] ?? FOREST} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ borderRadius: 12, fontSize: 12, border: "1px solid var(--border)" }}
              formatter={(v: number, _n: string, p: { payload: { label: string } }) =>
                [`${v} books`, p.payload.label]
              }
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

/* ---------------- 2. Format split ---------------- */
export function FormatSplit({ library }: { library: BookWithShelf[] }) {
  const navigate = useNavigate();
  const data = useMemo(() => formatSplit(library), [library]);
  const statuses: BookStatus[] = ["reading", "loved", "liked", "want", "later", "meh", "dnf"];
  const total = data.reduce((s, r) => s + statuses.reduce((a, k) => a + ((r[k] as number) ?? 0), 0), 0);
  return (
    <ChartCard title="Format split" caption="How you read, by shelf">
      {total === 0 ? (
        <ChartEmpty>No formats logged yet.</ChartEmpty>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="label" tick={{ fontSize: 12 }} width={70} />
            <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
            {statuses.map((s) => (
              <Bar
                key={s}
                dataKey={s}
                stackId="a"
                fill={STATUS_COLORS[s]}
                cursor="pointer"
                onClick={(d: { format?: string }) =>
                  d.format && navigate({ to: "/library", search: { format: d.format, status: s } as never })
                }
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

/* ---------------- 3. Finished by month ---------------- */
export function FinishedByMonth({ library }: { library: BookWithShelf[] }) {
  const navigate = useNavigate();
  const data = useMemo(() => finishedByMonth(library, 12), [library]);
  const total = data.reduce((s, d) => s + d.count, 0);
  return (
    <ChartCard title="Finished, last 12 months" caption="Your year of completions" hint="click a month to see those finishes">
      {total === 0 ? (
        <ChartEmpty>Mark a book as finished to start the line.</ChartEmpty>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
            <defs>
              <linearGradient id="fmf" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={FOREST} stopOpacity={0.55} />
                <stop offset="100%" stopColor={FOREST} stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} width={28} />
            <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
            <Area
              type="monotone"
              dataKey="count"
              stroke={FOREST}
              strokeWidth={2}
              fill="url(#fmf)"
              dot={{ r: 3, fill: FOREST, cursor: "pointer" }}
              activeDot={{
                r: 5,
                cursor: "pointer",
                onClick: (_: unknown, p: { payload?: { month: string } }) => {
                  const m = p.payload?.month;
                  if (m) navigate({ to: "/library", search: { dateFrom: `${m}-01`, dateTo: `${m}-31` } as never });
                },
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

/* ---------------- 4. Rating histogram ---------------- */
export function RatingHistogram({ library }: { library: BookWithShelf[] }) {
  const navigate = useNavigate();
  const data = useMemo(() => ratingHistogram(library), [library]);
  const total = data.reduce((s, d) => s + d.count, 0);
  return (
    <ChartCard title="Ratings" caption="Your stars, distributed">
      {total === 0 ? (
        <ChartEmpty>No ratings yet.</ChartEmpty>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="rating" tick={{ fontSize: 12 }} tickFormatter={(v) => "★".repeat(v)} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} width={28} />
            <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
            <Bar
              dataKey="count"
              fill={TERRA}
              radius={[6, 6, 0, 0]}
              cursor="pointer"
              onClick={(d: { rating?: number }) =>
                d.rating && navigate({ to: "/library", search: { rating: d.rating } as never })
              }
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

/* ---------------- 5. Top authors ---------------- */
export function TopAuthors({ library }: { library: BookWithShelf[] }) {
  const navigate = useNavigate();
  const data = useMemo(() => topAuthors(library, 10), [library]);
  return (
    <ChartCard title="Top authors" caption="Voices on your shelves" hint="click an author to filter Library">
      {data.length === 0 ? (
        <ChartEmpty>Add authored books to see who you read most.</ChartEmpty>
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(200, data.length * 26)}>
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
            <XAxis type="number" hide allowDecimals={false} />
            <YAxis
              type="category"
              dataKey="author"
              tick={{ fontSize: 11 }}
              width={140}
              interval={0}
            />
            <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
            <Bar
              dataKey="count"
              fill={FOREST}
              radius={[0, 6, 6, 0]}
              cursor="pointer"
              onClick={(d: { author?: string }) =>
                d.author && navigate({ to: "/library", search: { author: d.author } as never })
              }
            >
              <LabelList dataKey="count" position="right" style={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

/* ---------------- 6. Tag cloud (treemap) ---------------- */
export function TagCloud({
  bookTags,
  seedColors,
}: {
  bookTags: Record<string, string[]>;
  seedColors: string[];
}) {
  const navigate = useNavigate();
  const data = useMemo(() => tagFrequency(bookTags, 30), [bookTags]);
  const colors = useMemo(() => palette(seedColors, Math.max(6, data.length)), [seedColors, data.length]);
  return (
    <ChartCard title="Tags, by weight" caption="What words your library reaches for" hint="click a tile to filter Library">
      {data.length === 0 ? (
        <ChartEmpty>Tag a few books to see your cloud.</ChartEmpty>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <Treemap
            data={data.map((d, i) => ({ name: d.tag, size: d.count, fill: colors[i] }))}
            dataKey="size"
            stroke="var(--paper)"
            isAnimationActive={false}
            onClick={(d: { name?: string }) =>
              d.name && navigate({ to: "/library", search: { tags: d.name } as never })
            }
          />
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

/* ---------------- 7. Axis profile (radar) ---------------- */
export function AxisProfile({
  bookAxes,
}: {
  bookAxes: Record<string, { key: string; value: string }[]>;
}) {
  const navigate = useNavigate();
  const data = useMemo(() => axisAggregates(bookAxes), [bookAxes]);
  // hide if too sparse
  const totalBooksWithAxes = Object.keys(bookAxes).length;
  if (totalBooksWithAxes < 3 || data.length < 3) return null;
  return (
    <ChartCard title="Axis profile" caption="The shape of your taste, by axis" hint="click an axis to filter Library">
      <ResponsiveContainer width="100%" height={240}>
        <RadarChart data={data.map((d) => ({ axis: d.key, value: d.total }))}>
          <PolarGrid stroke="var(--border)" />
          <PolarAngleAxis dataKey="axis" tick={{ fontSize: 11 }} />
          <Radar
            name="Books"
            dataKey="value"
            stroke={FOREST}
            fill={FOREST}
            fillOpacity={0.35}
            onClick={(d: { axis?: string }) => {
              const k = d.axis;
              const top = data.find((x) => x.key === k);
              if (k && top)
                navigate({ to: "/library", search: { axis: `${k}:${top.topValue}` } as never });
            }}
            cursor="pointer"
          />
          <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
        </RadarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

/* ---------------- 8. Pace heatmap (calendar) ---------------- */
export function PaceHeatmap({ sessions }: { sessions: Session[] }) {
  const navigate = useNavigate();
  const cells = useMemo(() => paceHeatmap(sessions, 365), [sessions]);
  const max = cells.reduce((m, c) => Math.max(m, c.minutes), 0);
  const total = cells.reduce((s, c) => s + c.minutes, 0);

  // Group into 53 weeks × 7 days. Pad start so rows align to weeks.
  const grid: ({ date: string; minutes: number } | null)[][] = [];
  const first = new Date(cells[0]?.date ?? new Date());
  const padStart = first.getDay(); // 0 = Sun
  let week: ({ date: string; minutes: number } | null)[] = Array(padStart).fill(null);
  for (const c of cells) {
    week.push(c);
    if (week.length === 7) { grid.push(week); week = []; }
  }
  if (week.length) { while (week.length < 7) week.push(null); grid.push(week); }

  return (
    <ChartCard title="Reading pace" caption={`${total.toLocaleString()} minutes over the last year`} hint="click a cell to jump to that month in Connections">
      {total === 0 ? (
        <ChartEmpty>Log a reading session to start the heatmap.</ChartEmpty>
      ) : (
        <div className="overflow-x-auto -mx-2 px-2">
          <div className="flex gap-[3px]">
            {grid.map((col, ci) => (
              <div key={ci} className="flex flex-col gap-[3px]">
                {col.map((cell, ri) => {
                  if (!cell) return <div key={ri} className="w-3 h-3" />;
                  const t = max ? cell.minutes / max : 0;
                  const bg = cell.minutes === 0
                    ? "var(--mist)"
                    : `color-mix(in oklab, var(--forest) ${20 + t * 75}%, var(--paper))`;
                  const month = cell.date.slice(0, 7);
                  return (
                    <button
                      key={ri}
                      title={`${cell.date} — ${cell.minutes} min`}
                      onClick={() => navigate({ to: "/weave", search: { month } as never })}
                      className="w-3 h-3 rounded-[3px] transition hover:ring-2 hover:ring-terra/60"
                      style={{ background: bg }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </ChartCard>
  );
}
