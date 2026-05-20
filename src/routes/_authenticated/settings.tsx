import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useProfile } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Sparkles, Upload, ChevronRight, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <main className="max-w-3xl mx-auto px-6">
      <header className="mb-8">
        <h1 className="font-display text-4xl md:text-5xl">Settings</h1>
        <p className="text-muted-foreground mt-2">Tune your library and your account.</p>
      </header>

      <div className="space-y-6">
        <ProfileCard />
        <ImportsCard />
        <SampleLibraryCard />
        <ResetLibraryCard />
      </div>
    </main>
  );
}

function ResetLibraryCard() {
  const qc = useQueryClient();
  const navigate = useNavigate();

  const reset = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("reset_to_sample_library");
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Library reset");
      await qc.invalidateQueries();
      navigate({ to: "/" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-destructive/10 p-2 mt-0.5">
          <AlertTriangle className="h-4 w-4 text-destructive" />
        </div>
        <div className="flex-1">
          <h2 className="font-display text-2xl mb-1 text-destructive">Reset library</h2>
          <p className="text-sm text-muted-foreground">
            Wipe your entire library and start fresh with the original sample set. This permanently deletes every book, note, quote, session, tag, custom axis, and connection — including the ones you've added yourself. Your display name and yearly goal stay the same. This can't be undone.
          </p>
          <div className="mt-5">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={reset.isPending}>
                  {reset.isPending ? "Resetting…" : "Reset library"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset everything?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will delete every book, user book, reading session, note, quote, tag, custom axis, import, and connection in your account — even ones you added yourself — and replace them with the original sample library. Your profile (display name, yearly goal) won't change. There is no undo.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep my library</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => reset.mutate()}
                    disabled={reset.isPending}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {reset.isPending ? "Resetting…" : "Reset library"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </section>
  );
}

function ImportsCard() {
  return (
    <Link
      to="/settings/imports"
      className="block rounded-2xl bg-card shadow-paper p-6 hover:bg-paper transition group"
    >
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-muted p-2 mt-0.5">
          <Upload className="h-4 w-4 text-ink/70" />
        </div>
        <div className="flex-1">
          <h2 className="font-display text-2xl mb-1">Imports</h2>
          <p className="text-sm text-muted-foreground">
            Bring in your Goodreads, StoryGraph, or any CSV. See past imports and undo any one of them.
          </p>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground self-center group-hover:translate-x-1 transition-transform" />
      </div>
    </Link>
  );
}

function ProfileCard() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const [displayName, setDisplayName] = useState("");
  const [yearlyGoal, setYearlyGoal] = useState<number | "">("");

  // Hydrate when profile loads
  if (profile && displayName === "" && yearlyGoal === "") {
    if (profile.display_name) setDisplayName(profile.display_name);
    if (profile.yearly_goal != null) setYearlyGoal(profile.yearly_goal);
  }

  const save = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: displayName || null,
          yearly_goal: typeof yearlyGoal === "number" ? yearlyGoal : 12,
        })
        .eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Profile saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section className="rounded-2xl bg-card shadow-paper p-6">
      <h2 className="font-display text-2xl mb-1">Profile</h2>
      <p className="text-sm text-muted-foreground mb-5">How you appear in your own library.</p>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="display_name">Display name</Label>
          <Input id="display_name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="yearly_goal">Yearly reading goal</Label>
          <Input
            id="yearly_goal"
            type="number"
            min={0}
            value={yearlyGoal}
            onChange={(e) => setYearlyGoal(e.target.value === "" ? "" : Number(e.target.value))}
            className="mt-1.5"
          />
        </div>
      </div>
      <div className="mt-5">
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? "Saving…" : "Save"}
        </Button>
      </div>
    </section>
  );
}

function SampleLibraryCard() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: counts } = useQuery({
    queryKey: ["sample-counts", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [b, r, h, c] = await Promise.all([
        supabase.from("books").select("id", { count: "exact", head: true }).eq("is_sample", true),
        supabase.from("reference_books").select("id", { count: "exact", head: true }).eq("is_sample", true),
        supabase.from("highlights").select("id", { count: "exact", head: true }).eq("is_sample", true),
        supabase.from("connections").select("id", { count: "exact", head: true }).eq("is_sample", true),
      ]);
      return {
        books: b.count ?? 0,
        refs: r.count ?? 0,
        highlights: h.count ?? 0,
        connections: c.count ?? 0,
      };
    },
  });

  const total = (counts?.books ?? 0) + (counts?.refs ?? 0) + (counts?.highlights ?? 0) + (counts?.connections ?? 0);

  const clearSamples = useMutation({
    mutationFn: async () => {
      // Delete in order: connections first (they reference highlights/books), then highlights, then books, then reference_books.
      const steps = [
        supabase.from("connections").delete().eq("is_sample", true),
        supabase.from("highlights").delete().eq("is_sample", true),
        supabase.from("books").delete().eq("is_sample", true),
        supabase.from("reference_books").delete().eq("is_sample", true),
      ];
      for (const step of steps) {
        const { error } = await step;
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Sample library cleared");
      qc.invalidateQueries({ queryKey: ["sample-counts"] });
      qc.invalidateQueries({ queryKey: ["library"] });
      qc.invalidateQueries({ queryKey: ["reference_books"] });
      qc.invalidateQueries({ queryKey: ["connections"] });
      qc.invalidateQueries({ queryKey: ["marginalia"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (counts && total === 0) return null;

  return (
    <section className="rounded-2xl bg-card shadow-paper p-6">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-muted p-2 mt-0.5">
          <Sparkles className="h-4 w-4 text-ink/70" />
        </div>
        <div className="flex-1">
          <h2 className="font-display text-2xl mb-1">Sample library</h2>
          <p className="text-sm text-muted-foreground">
            Your account was started with a small set of books, quotes, and example connections so the app feels alive on day one. Clear them whenever you're ready — your real books, notes, sessions, and tags will remain safe.
          </p>

          {counts && (
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs font-mono uppercase tracking-widest text-muted-foreground">
              <span>{counts.books} books</span>
              <span>{counts.refs} references</span>
              <span>{counts.highlights} quotes</span>
              <span>{counts.connections} connections</span>
            </div>
          )}

          <div className="mt-5">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline">Clear sample library</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear the sample library?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This deletes the {counts?.books ?? 0} starter books along with their notes, sessions, tags, quotes, and example connections. Your own books and entries are not affected. This can't be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep them</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => clearSamples.mutate()}
                    disabled={clearSamples.isPending}
                  >
                    {clearSamples.isPending ? "Clearing…" : "Clear samples"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </section>
  );
}
