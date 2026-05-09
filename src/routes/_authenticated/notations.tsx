import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import FilterBar from "@/components/notations/FilterBar";
import DisplayToggle from "@/components/notations/DisplayToggle";
import GroupingToolbar from "@/components/notations/GroupingToolbar";
import { useNotations, type Grouping, type Display } from "@/lib/notations";

export const Route = createFileRoute("/_authenticated/notations")({
  validateSearch: (search: Record<string, unknown>) => search,
  component: NotationsLayout,
});

function NotationsLayout() {
  const { data } = useNotations();
  const location = useLocation();
  const path = location.pathname;
  const isCommonplace =
    path.endsWith("/commonplace") || path === "/notations" || path === "/notations/";
  const defaultDisplay: Display = isCommonplace ? "scroll" : "stream";
  const defaultGrouping: Grouping = isCommonplace ? "book" : "newest";

  return (
    <div className="max-w-5xl mx-auto px-6">
      <header className="mb-6">
        <div className="flex items-baseline justify-between gap-4 flex-wrap">
          <h1 className="font-display text-4xl">Notations</h1>
          <DisplayToggle defaultDisplay={defaultDisplay} />
        </div>
        <p className="text-sm text-muted-foreground mt-1 max-w-prose">
          Every mark you’ve left on a book — notes, quotes, and the commonplace
          weaving them together. Slice by book, author, series, tag, mood.
        </p>
      </header>

      <nav className="flex items-center gap-1 mb-5">
        <SubLink to="/notations/notes">Notes</SubLink>
        <SubLink to="/notations/quotes">Quotes</SubLink>
        <SubLink to="/notations/commonplace">Commonplace</SubLink>
      </nav>

      <FilterBar data={data} showKind={isCommonplace} />

      <div className="mt-4">
        <GroupingToolbar defaultGrouping={defaultGrouping} />
      </div>

      <div className="mt-6 pb-24">
        <Outlet />
      </div>
    </div>
  );
}

function SubLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      activeProps={{ className: "bg-forest text-paper border-forest" }}
      inactiveProps={{ className: "bg-card text-ink border-border hover:bg-muted" }}
      className="rounded-full border px-4 py-1.5 text-sm transition"
    >
      {children}
    </Link>
  );
}
