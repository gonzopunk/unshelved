import { useMemo, useState } from "react";
import { Shuffle } from "lucide-react";
import EntryShell from "./EntryShell";
import type { NotationEntry } from "@/lib/notations";
import { useAuth } from "@/lib/auth";

function hash(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const STORAGE_KEY = "unshelved.resurfaced.last";

export default function ResurfacedHero({ entries }: { entries: NotationEntry[] }) {
  const { user } = useAuth();
  const [bump, setBump] = useState(0);

  const pick = useMemo(() => {
    if (!entries.length) return null;
    const today = new Date().toISOString().slice(0, 10);
    const seed = `${today}:${user?.id ?? "anon"}`;
    let idx = hash(seed) % entries.length;
    if (typeof window !== "undefined") {
      const last = window.localStorage.getItem(STORAGE_KEY);
      if (last && last === entries[idx]?.id && entries.length > 1) {
        idx = (idx + 1) % entries.length;
      }
    }
    idx = (idx + bump) % entries.length;
    const e = entries[idx];
    if (typeof window !== "undefined" && bump === 0 && e) {
      window.localStorage.setItem(STORAGE_KEY, e.id);
    }
    return e;
  }, [entries, user?.id, bump]);

  if (!pick) return null;

  return (
    <section data-no-print className="mb-6 border-y border-border py-5">
      <div className="flex items-center justify-between mb-3">
        <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          Today · resurfaced
        </div>
        <button
          onClick={() => setBump((b) => b + 1)}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-ink transition"
          title="Shuffle"
        >
          <Shuffle className="h-3 w-3" /> Shuffle
        </button>
      </div>
      <EntryShell entry={pick} />
    </section>
  );
}
