import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { BarChart3, Orbit } from "lucide-react";
import { useLibrary, useBookTagsMap, useBookAxisMap, useLibraryPalette } from "@/lib/queries";
import { useAllSessions } from "@/lib/sessions";
import {
  StatusMix, FormatSplit, FinishedByMonth, RatingHistogram,
  TopAuthors, TagCloud, AxisProfile, PaceHeatmap,
} from "@/components/viz/Charts";
import Constellations from "@/components/viz/Constellations";

type Tab = "charts" | "constellations";

export const Route = createFileRoute("/_authenticated/visualizations")({
  validateSearch: (search: Record<string, unknown>): { tab: Tab } => {
    const t = search.tab;
    return { tab: t === "constellations" ? "constellations" : "charts" };
  },
  head: () => ({ meta: [{ title: "Visualizations — Unshelved" }] }),
  component: VisualizationsPage,
});

function VisualizationsPage() {
  const navigate = useNavigate();
  const { tab } = useSearch({ from: "/_authenticated/visualizations" });

  const { data: library = [], isLoading } = useLibrary();
  const { data: bookTags = {} } = useBookTagsMap();
  const { data: bookAxes = {} } = useBookAxisMap();
  const { data: sessions = [] } = useAllSessions(365);
  const seedColors = useLibraryPalette(8);

  const setTab = (t: Tab) => {
    try { localStorage.setItem("visualizations-tab", t); } catch { /* noop */ }
    navigate({
      to: ".",
      search: (prev: Record<string, unknown>) => ({ ...prev, tab: t }),
      replace: true,
    } as never);
  };

  return (
    <div className="max-w-7xl mx-auto px-6">
      <header className="mb-6">
        <h1 className="font-display text-4xl">Visualizations</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-prose">
          Charts that drill into the books behind them. A constellation of your library, rearranged by whatever matters most to you.
        </p>
      </header>

      <div className="mb-6 relative z-10">
        <div className="inline-flex rounded-full bg-card shadow-paper p-1">
          <TabButton active={tab === "charts"} onClick={() => setTab("charts")} icon={<BarChart3 className="h-4 w-4" />} label="Charts" />
          <TabButton active={tab === "constellations"} onClick={() => setTab("constellations")} icon={<Orbit className="h-4 w-4" />} label="Constellations" />
        </div>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : tab === "constellations" ? (
        <Constellations />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pb-24">
          <FinishedByMonth library={library} />
          <StatusMix library={library} />
          <RatingHistogram library={library} />
          <FormatSplit library={library} />
          <TopAuthors library={library} />
          <TagCloud bookTags={bookTags} seedColors={seedColors} />
          <AxisProfile bookAxes={bookAxes} />
          <PaceHeatmap sessions={sessions} />
        </div>
      )}
    </div>
  );
}

function TabButton({
  active, onClick, icon, label,
}: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm transition ${
        active ? "bg-forest text-paper" : "text-ink hover:bg-muted"
      }`}
    >
      {icon} {label}
    </button>
  );
}
