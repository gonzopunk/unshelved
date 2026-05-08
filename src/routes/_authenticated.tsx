import { createFileRoute, Outlet, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { Home, LayoutGrid, Plus, LogOut, Network, Settings as SettingsIcon, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import AddBookModal from "@/components/AddBookModal";
import CommandPalette from "@/components/CommandPalette";

export const Route = createFileRoute("/_authenticated")({
  component: AuthLayout,
});

function AuthLayout() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [addOpen, setAddOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  }
  if (!session) {
    if (typeof window !== "undefined") navigate({ to: "/login" });
    return null;
  }

  return (
    <div className="min-h-screen pb-24">
      <PillNav onAdd={() => setAddOpen(true)} onSearch={() => setPaletteOpen(true)} onLogout={async () => { await supabase.auth.signOut(); navigate({ to: "/login" }); }} />
      <div className="pt-28">
        <Outlet />
      </div>
      <AddBookModal open={addOpen} onOpenChange={setAddOpen} />
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}

function PillNav({ onAdd, onSearch, onLogout }: { onAdd: () => void; onSearch: () => void; onLogout: () => void }) {
  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-40">
      <nav className="flex items-center gap-1 rounded-full bg-paper/80 backdrop-blur-md shadow-lift px-2 py-2 border border-border">
        <Link to="/" className="font-display text-xl px-4 text-primary">Unshelved</Link>
        <span className="h-6 w-px bg-border mx-1" />
        <NavItem to="/" icon={<Home className="h-4 w-4" />} label="Home" />
        <NavItem to="/board" icon={<LayoutGrid className="h-4 w-4" />} label="Board" />
        <NavItem to="/weave" icon={<Network className="h-4 w-4" />} label="Connections" />
        <button
          onClick={onSearch}
          aria-label="Search"
          className="ml-1 flex items-center gap-2 rounded-full border border-border bg-muted/40 hover:bg-muted text-muted-foreground transition-colors px-3 py-1.5 sm:min-w-[180px]"
        >
          <Search className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline text-sm flex-1 text-left">Search…</span>
          <Kbd className="hidden sm:inline-flex">{isMac ? "⌘K" : "Ctrl K"}</Kbd>
        </button>
        <Button size="sm" onClick={onAdd} className="rounded-full ml-1 gap-1.5">
          <Plus className="h-4 w-4" /> Add book
        </Button>
        <span className="h-6 w-px bg-border mx-2" />
        <Link to="/settings" aria-label="Settings" activeProps={{ className: "bg-forest text-paper" }} inactiveProps={{ className: "text-muted-foreground hover:bg-muted" }} className="p-2 rounded-full transition-colors">
          <SettingsIcon className="h-4 w-4" />
        </Link>
        <button onClick={onLogout} aria-label="Sign out" className="ml-1 p-2 rounded-full hover:bg-muted text-muted-foreground">
          <LogOut className="h-4 w-4" />
        </button>
      </nav>
    </div>
  );
}

function NavItem({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      to={to}
      activeOptions={{ exact: true }}
      activeProps={{ className: "bg-forest text-paper" }}
      inactiveProps={{ className: "text-ink hover:bg-muted" }}
      className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors"
    >
      {icon} {label}
    </Link>
  );
}
