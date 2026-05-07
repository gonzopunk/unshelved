import { createFileRoute, Link } from "@tanstack/react-router";
import { useLibrary, useProfile } from "@/lib/queries";
import BookCard from "@/components/BookCard";
import BookSpine from "@/components/BookSpine";
import StarRating from "@/components/StarRating";
import { format } from "date-fns";
import { Quote } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({ meta: [{ title: "Margins — Home" }] }),
  component: Home,
});

function Home() {
  const { data: library = [] } = useLibrary();
  const { data: profile } = useProfile();
  const { user } = useAuth();
  const { data: highlights = [] } = useQuery({
    queryKey: ["highlights-all", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("highlights").select("*, books(title, author)").order("created_at", { ascending: false }).limit(20);
      return data ?? [];
    },
  });

  const reading = library.filter((b) => b.user_books[0]?.status === "reading");
  const want = library.filter((b) => b.user_books[0]?.status === "want");
  const recent = library
    .filter((b) => ["loved", "liked", "meh"].includes(b.user_books[0]?.status ?? ""))
    .sort((a, b) => (b.user_books[0]?.finished_at ?? "").localeCompare(a.user_books[0]?.finished_at ?? ""))
    .slice(0, 5);

  const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString();
  const finishedThisYear = library.filter((b) => (b.user_books[0]?.finished_at ?? "") >= yearStart).length;
  const goal = profile?.yearly_goal ?? 12;

  const quote = highlights[Math.floor(Math.random() * Math.max(1, highlights.length))];
  const greeting = greetingFor();

  return (
    <main className="max-w-6xl mx-auto px-6">
      <header className="mb-10">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">{format(new Date(), "EEEE, MMMM d")}</p>
        <h1 className="font-display text-5xl md:text-6xl mt-2">
          {greeting}, <span className="text-primary">{profile?.display_name ?? "reader"}</span>.
        </h1>
        <div className="mt-6 flex flex-wrap gap-3">
          <Stat label="Reading" value={String(reading.length)} />
          <Stat label={`${finishedThisYear} of ${goal}`} value={`${Math.round((finishedThisYear / goal) * 100)}%`} hint="this year" />
          <Stat label="On the shelf" value={String(want.length)} />
        </div>
      </header>

      <Section title="Currently Reading" subtitle={`${reading.length} in progress`}>
        {reading.length === 0 ? (
          <Empty>Nothing in progress. Pick something from your shelf.</Empty>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reading.map((b) => <BookCard key={b.id} book={b} userBook={b.user_books[0]} />)}
          </div>
        )}
      </Section>

      <Section title="Up Next" subtitle="Waiting on the shelf">
        {want.length === 0 ? (
          <Empty>No books queued up. Add something you've been meaning to read.</Empty>
        ) : (
          <div className="rounded-3xl bg-card shadow-paper p-6 overflow-x-auto">
            <div className="flex items-end gap-3 min-h-60 pb-2 border-b-4 border-double border-mist">
              {want.map((b) => <BookSpine key={b.id} book={b} />)}
            </div>
          </div>
        )}
      </Section>

      <Section title="Recently Finished">
        {recent.length === 0 ? (
          <Empty>Your finished shelf is empty — for now.</Empty>
        ) : (
          <div className="rounded-3xl bg-card shadow-paper divide-y divide-border">
            {recent.map((b) => (
              <Link key={b.id} to="/books/$bookId" params={{ bookId: b.id }} className="flex items-center gap-4 p-4 hover:bg-muted/50 transition">
                <div className="w-10 h-14 rounded shadow-paper shrink-0" style={{ background: b.cover_color }} />
                <div className="flex-1 min-w-0">
                  <div className="font-display text-lg truncate">{b.title}</div>
                  <div className="text-xs text-muted-foreground truncate">{b.author}</div>
                </div>
                <StarRating value={b.user_books[0]?.rating} />
                <div className="font-mono text-xs text-muted-foreground hidden sm:block">
                  {b.user_books[0]?.finished_at ? format(new Date(b.user_books[0].finished_at), "MMM d") : ""}
                </div>
              </Link>
            ))}
          </div>
        )}
      </Section>

      {quote && (
        <Section title="Quote of the Day">
          <blockquote className="rounded-3xl bg-card shadow-paper p-8 relative">
            <Quote className="absolute top-6 left-6 text-mist h-10 w-10" />
            <p className="font-display text-2xl leading-snug pl-12 italic">"{quote.quote_text}"</p>
            <footer className="mt-4 pl-12 font-mono text-xs uppercase tracking-widest text-muted-foreground">
              — {(quote as { books?: { title: string; author: string } }).books?.title} · {(quote as { books?: { title: string; author: string } }).books?.author}
            </footer>
          </blockquote>
        </Section>
      )}
    </main>
  );
}

function greetingFor() {
  const h = new Date().getHours();
  if (h < 5) return "Still up";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl bg-card shadow-paper px-5 py-3">
      <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="font-display text-3xl mt-1 text-primary">{value}</div>
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="mt-12">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="font-display text-3xl">{title}</h2>
        {subtitle && <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">{subtitle}</span>}
      </div>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-3xl bg-card shadow-paper p-8 text-center text-muted-foreground italic">{children}</div>;
}
