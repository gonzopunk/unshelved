import { createFileRoute, Outlet, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { LayoutGrid, Plus, LogOut, Network, Settings as SettingsIcon, Search, BookPlus, Upload, ChevronDown, NotebookPen, Library as LibraryIcon, BarChart3, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import AddBookModal from "@/components/AddBookModal";
import CommandPalette from "@/components/CommandPalette";
import ImportWizard from "@/components/import/ImportWizard";
import { useIsMac } from "@/components/Kbd";

export const Route = createFileRoute("/_authenticated")({
  component: AuthLayout,
});

function AuthLayout() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
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
      <PillNav
        onAdd={() => setAddOpen(true)}
        onImport={() => setImportOpen(true)}
        onSearch={() => setPaletteOpen(true)}
        onLogout={async () => { await supabase.auth.signOut(); navigate({ to: "/login" }); }}
      />
      <div className="pt-28">
        <Outlet />
      </div>
      <AddBookModal open={addOpen} onOpenChange={setAddOpen} />
      <ImportWizard open={importOpen} onOpenChange={setImportOpen} />
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} onImport={() => setImportOpen(true)} />
    </div>
  );
}

function PillNav({ onAdd, onImport, onSearch, onLogout }: { onAdd: () => void; onImport: () => void; onSearch: () => void; onLogout: () => void }) {
  const isMac = useIsMac();
  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-40">
      {/* Mobile */}
      <nav className="md:hidden flex items-center gap-1 rounded-full bg-paper/80 backdrop-blur-md shadow-lift px-2 py-2 border border-border">
        <Link to="/" className="font-display text-xl leading-none font-medium px-2 text-terra mt-0.5 ml-0.5">U</Link>
        <span className="h-6 w-px bg-border mx-1" />
        <MobileNavItem to="/library" icon={<LibraryIcon className="h-4 w-4" />} label="Library" />
        <MobileNavItem to="/board" icon={<LayoutGrid className="h-4 w-4" />} label="Board" />
        <MobileNavItem to="/weave" icon={<Network className="h-4 w-4" />} label="Connections" />
        <MobileNavItem to="/notations" icon={<NotebookPen className="h-4 w-4" />} label="Notations" />
        <MobileNavItem to="/visualizations" icon={<BarChart3 className="h-4 w-4" />} label="Visualizations" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button aria-label="More" className="ml-1 p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-2xl">
            <DropdownMenuItem onClick={onSearch} className="gap-2 rounded-xl">
              <Search className="h-4 w-4" /> Search
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onAdd} className="gap-2 rounded-xl">
              <BookPlus className="h-4 w-4" /> Add a book
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="gap-2 rounded-xl">
              <Link to="/settings"><SettingsIcon className="h-4 w-4" /> Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onLogout} className="gap-2 rounded-xl">
              <LogOut className="h-4 w-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </nav>

      {/* Desktop */}
      <nav className="hidden md:flex items-center gap-1 rounded-full bg-paper/80 backdrop-blur-md shadow-lift px-2 py-2 border border-border">
        <Link to="/" className="font-display text-xl px-4 text-primary">Unshelved</Link>
        <span className="h-6 w-px bg-border mx-1" />
        <NavItem to="/library" icon={<LibraryIcon className="h-4 w-4" />} label="Library" />
        <NavItem to="/board" icon={<LayoutGrid className="h-4 w-4" />} label="Board" />
        <NavItem to="/weave" icon={<Network className="h-4 w-4" />} label="Connections" />
        <NavItem to="/notations" icon={<NotebookPen className="h-4 w-4" />} label="Notations" />
        <NavItem to="/visualizations" icon={<BarChart3 className="h-4 w-4" />} label="Visualizations" />
        <button
          onClick={onSearch}
          aria-label={`Search (${isMac ? "⌘K" : "Ctrl K"})`}
          title={`Search (${isMac ? "⌘K" : "Ctrl K"})`}
          className="ml-1 p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors"
        >
          <Search className="h-4 w-4" />
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" className="rounded-full ml-1 gap-1.5 pr-2">
              <Plus className="h-4 w-4" /> Add <ChevronDown className="h-3 w-3 -ml-0.5 opacity-70" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-2xl">
            <DropdownMenuItem onClick={onAdd} className="gap-2 rounded-xl">
              <BookPlus className="h-4 w-4" /> Add a book
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onImport} className="gap-2 rounded-xl">
              <Upload className="h-4 w-4" /> Import library…
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
      {icon}{label}
    </Link>
  );
}

function MobileNavItem({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      to={to}
      aria-label={label}
      activeOptions={{ exact: true }}
      activeProps={{ className: "bg-forest text-paper" }}
      inactiveProps={{ className: "text-ink hover:bg-muted" }}
      className="flex items-center rounded-full px-2 py-1.5 text-sm transition-colors"
    >
      {icon}
    </Link>
  );
}
