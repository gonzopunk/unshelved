import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { undoImport } from "@/lib/import/commit";
import { toast } from "sonner";
import { ChevronLeft, RotateCcw, Upload } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import ImportWizard from "@/components/import/ImportWizard";

export const Route = createFileRoute("/_authenticated/settings/imports")({
  component: ImportsPage,
});

const SOURCE_LABEL: Record<string, string> = {
  goodreads: "Goodreads CSV",
  storygraph: "StoryGraph CSV",
  generic: "Generic CSV",
  paste: "Pasted list",
};

function ImportsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [wizardOpen, setWizardOpen] = useState(false);

  const { data: batches = [] } = useQuery({
    queryKey: ["import-batches", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("import_batches")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const undo = useMutation({
    mutationFn: (id: string) => undoImport(id),
    onSuccess: () => {
      toast.success("Import undone");
      qc.invalidateQueries({ queryKey: ["import-batches"] });
      qc.invalidateQueries({ queryKey: ["library"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const recent = (created_at: string) =>
    Date.now() - new Date(created_at).getTime() < 24 * 60 * 60 * 1000;

  return (
    <main className="max-w-3xl mx-auto px-6">
      <Link to="/settings" className="inline-flex items-center text-xs uppercase tracking-widest font-mono text-muted-foreground hover:text-ink mb-6">
        <ChevronLeft className="h-3 w-3 mr-1" /> Settings
      </Link>
      <header className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl md:text-5xl">Imports</h1>
          <p className="text-muted-foreground mt-2">A record of every library you've poured in. Undo any one in one click.</p>
        </div>
        <Button onClick={() => setWizardOpen(true)} className="rounded-full gap-1.5">
          <Upload className="h-4 w-4" /> New import
        </Button>
      </header>

      <section className="rounded-2xl bg-card shadow-paper overflow-hidden">
        {batches.length === 0 && (
          <div className="p-10 text-center text-muted-foreground italic">No imports yet.</div>
        )}
        {batches.map((b) => (
          <div key={b.id} className="flex items-center justify-between gap-4 p-4 border-b border-border last:border-b-0">
            <div className="min-w-0">
              <div className="font-medium">{SOURCE_LABEL[b.source] ?? b.source}</div>
              <div className="text-xs text-muted-foreground font-mono uppercase tracking-widest mt-0.5">
                {new Date(b.created_at).toLocaleString()} · {b.row_count} book{b.row_count === 1 ? "" : "s"}
              </div>
            </div>
            {recent(b.created_at) ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => undo.mutate(b.id)}
                disabled={undo.isPending}
                className="rounded-full"
              >
                <RotateCcw className="h-3 w-3 mr-1" /> Undo
              </Button>
            ) : (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="rounded-full">
                    <RotateCcw className="h-3 w-3 mr-1" /> Undo
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Undo this import?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This deletes the {b.row_count} book{b.row_count === 1 ? "" : "s"} added by this import along with any progress, ratings, and notes you've added to them since. This can't be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep them</AlertDialogCancel>
                    <AlertDialogAction onClick={() => undo.mutate(b.id)}>Undo import</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        ))}
      </section>

      <ImportWizard open={wizardOpen} onOpenChange={setWizardOpen} />
    </main>
  );
}
