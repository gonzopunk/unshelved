import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useLibrary } from "@/lib/queries";
import { useAllConnections, useReferenceBooks } from "@/lib/weave";
import { BookOpen, Quote, StickyNote, Network, LayoutGrid, Settings as SettingsIcon, Upload, NotebookPen, Library as LibraryIcon, BarChart3 } from "lucide-react";
import { Kbd, useIsMac } from "@/components/Kbd";

export default function CommandPalette({ open, onOpenChange, onImport }: { open: boolean; onOpenChange: (v: boolean) => void; onImport?: () => void }) {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const isMac = useIsMac();
  const { user } = useAuth();
  const { data: library } = useLibrary();
  const { data: connections } = useAllConnections();
  const { data: refBooks } = useReferenceBooks();

  const { data: highlights } = useQuery({
    queryKey: ["search-highlights", user?.id],
    enabled: !!user && open,
    queryFn: async () => {
      const { data, error } = await supabase.from("highlights").select("id, quote_text, book_id").limit(2000);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: notes } = useQuery({
    queryKey: ["search-notes", user?.id],
    enabled: !!user && open,
    queryFn: async () => {
      const { data, error } = await supabase.from("notes").select("id, content, book_id").limit(2000);
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const bookById = useMemo(() => {
    const m = new Map<string, { title: string; author: string | null }>();
    (library ?? []).forEach((b) => m.set(b.id, { title: b.title, author: b.author }));
    return m;
  }, [library]);

  const q = query.trim().toLowerCase();
  const match = (s?: string | null) => !!s && s.toLowerCase().includes(q);

  const bookResults = useMemo(() => {
    if (!q) return (library ?? []).slice(0, 6);
    return (library ?? []).filter((b) => match(b.title) || match(b.author)).slice(0, 8);
  }, [library, q]);

  const highlightResults = useMemo(() => {
    if (!q) return [];
    return (highlights ?? []).filter((h) => match(h.quote_text)).slice(0, 8);
  }, [highlights, q]);

  const noteResults = useMemo(() => {
    if (!q) return [];
    return (notes ?? []).filter((n) => match(n.content)).slice(0, 8);
  }, [notes, q]);

  const connectionResults = useMemo(() => {
    if (!q) return [];
    return (connections ?? []).filter((c) => match(c.why) || c.tags.some((t) => match(t))).slice(0, 6);
  }, [connections, q]);

  const go = (to: string, params?: Record<string, string>) => {
    onOpenChange(false);
    navigate({ to, params } as never);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput value={query} onValueChange={setQuery} placeholder="Search books, highlights, notes, connections…" />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>

        {!q && (
          <CommandGroup heading="Jump to">
            <CommandItem onSelect={() => go("/library")}><LibraryIcon className="mr-2 h-4 w-4" /> Library</CommandItem>
            <CommandItem onSelect={() => go("/library?view=board")}><LayoutGrid className="mr-2 h-4 w-4" /> Board</CommandItem>
            <CommandItem onSelect={() => go("/weave")}><Network className="mr-2 h-4 w-4" /> Connections</CommandItem>
            <CommandItem onSelect={() => go("/notations")}><NotebookPen className="mr-2 h-4 w-4" /> Notations</CommandItem>
            <CommandItem onSelect={() => go("/visualizations")}><BarChart3 className="mr-2 h-4 w-4" /> Visualizations</CommandItem>
            <CommandItem onSelect={() => go("/settings")}><SettingsIcon className="mr-2 h-4 w-4" /> Settings</CommandItem>
            {onImport && (
              <CommandItem onSelect={() => { onOpenChange(false); onImport(); }}>
                <Upload className="mr-2 h-4 w-4" /> Import library…
              </CommandItem>
            )}
          </CommandGroup>
        )}

        {bookResults.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Books">
              {bookResults.map((b) => (
                <CommandItem key={b.id} value={`book-${b.id}-${b.title}`} onSelect={() => go("/books/$bookId", { bookId: b.id })}>
                  <BookOpen className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{b.title}</span>
                  {b.author && <span className="ml-2 text-xs text-muted-foreground truncate">{b.author}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {highlightResults.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Highlights">
              {highlightResults.map((h) => {
                const b = h.book_id ? bookById.get(h.book_id) : null;
                return (
                  <CommandItem key={h.id} value={`hl-${h.id}-${h.quote_text}`} onSelect={() => h.book_id && go("/books/$bookId", { bookId: h.book_id })}>
                    <Quote className="mr-2 h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="truncate italic">"{h.quote_text}"</span>
                    {b && <span className="ml-2 text-xs text-muted-foreground truncate">— {b.title}</span>}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </>
        )}

        {noteResults.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Notes">
              {noteResults.map((n) => {
                const b = n.book_id ? bookById.get(n.book_id) : null;
                return (
                  <CommandItem key={n.id} value={`note-${n.id}-${n.content}`} onSelect={() => n.book_id && go("/books/$bookId", { bookId: n.book_id })}>
                    <StickyNote className="mr-2 h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{n.content}</span>
                    {b && <span className="ml-2 text-xs text-muted-foreground truncate">— {b.title}</span>}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </>
        )}

        {connectionResults.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Connections">
              {connectionResults.map((c) => (
                <CommandItem key={c.id} value={`conn-${c.id}-${c.why ?? ""}-${c.tags.join(",")}`} onSelect={() => go("/weave")}>
                  <Network className="mr-2 h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="truncate">{c.why || c.tags.join(", ") || "Connection"}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
      <div className="hidden md:flex items-center justify-end gap-3 border-t border-border px-3 py-2 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1"><Kbd>↵</Kbd> open</span>
        <span className="flex items-center gap-1"><Kbd>esc</Kbd> close</span>
        <span className="flex items-center gap-1"><Kbd>{isMac ? "⌘K" : "Ctrl K"}</Kbd> toggle anywhere</span>
      </div>
    </CommandDialog>
  );
}
