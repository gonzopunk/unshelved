import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useLibrary, useProfile, useUpdateRating } from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { useMemo, useState } from "react";
import BookCard from "@/components/BookCard";
import GeneratedCover from "@/components/GeneratedCover";
import AddBookModal from "@/components/AddBookModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAllSessions } from "@/lib/sessions";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({ meta: [{ title: "Unshelved — Library" }] }),
  component: Home,
});

function Home() {
  const { data: library = [] } = useLibrary();
  const { data: profile } = useProfile();
  const { user } = useAuth();
  const [addOpen, setAddOpen] = useState(false);
  const [showAllUpNext, setShowAllUpNext] = useState(false);
  const [logSessionOpen, setLogSessionOpen] = useState(false);
  const navigate = useNavigate();
  const updateRating = useUpdateRating();

  const { data: highlights = [] } = useQuery({
    queryKey: ["highlights-all", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("highlights")
        .select("*, books(title, author)")
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  const { data: recentSessions = [] } = useAllSessions(30);
  const weekMinutes = recentSessions
    .filter((s) => new Date(s.started_at).getTime() >= Date.now() - 7 * 86_400_000)
    .reduce((sum, s) => sum + (s.minutes ?? 0), 0);

  const readingAll = library.filter((b) => b.user_books[0]?.status === "reading");
  const allReading = readingAll;
  const reading = [...readingAll]
    .sort((a, b) =>
      (b.user_books[0]?.started_at ?? "").localeCompare(a.user_books[0]?.started_at ?? "")
    )
    .slice(0, 5);
  const inFlight = readingAll.length;
  const upNext = library.filter((b) => b.user_books[0]?.status === "want").slice(0, 20);
  const finished = library
    .filter((b) => ["loved", "liked", "meh"].includes(b.user_books[0]?.status ?? ""))
    .sort((a, b) => (b.user_books[0]?.finished_at ?? "").localeCompare(a.user_books[0]?.finished_at ?? ""))
    .slice(0, 3);

  const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString();
  const finishedThisYear = library.filter((b) => (b.user_books[0]?.finished_at ?? "") >= yearStart).length;
  const goal = profile?.yearly_goal ?? 24;
  const goalPct = Math.min(100, Math.round((finishedThisYear / goal) * 100));

  // Pick focus book by most-recent session; fall back to first reading book.
  const lastSessionByBook = new Map<string, string>();
  for (const s of recentSessions) {
    const prev = lastSessionByBook.get(s.book_id);
    if (!prev || s.started_at > prev) lastSessionByBook.set(s.book_id, s.started_at);
  }
  const focus =
    [...readingAll].sort(
      (a, b) => (lastSessionByBook.get(b.id) ?? "").localeCompare(lastSessionByBook.get(a.id) ?? "")
    )[0] ?? readingAll[0];
  const focusUb = focus?.user_books[0];
  const focusPct = focusUb?.total_pages
    ? Math.round(((focusUb.current_page ?? 0) / focusUb.total_pages) * 100)
    : Math.round(Number(focusUb?.progress_pct ?? 0));
  const showFocusCard = readingAll.length > 0 && !!focus;

  const quote = highlights[0] as
    | { id: string; book_id: string; quote_text: string; page_number: number | null; books?: { title: string; author: string } | null }
    | undefined;

  const { data: quoteConnections = [] } = useQuery({
    queryKey: ["quote-connections", quote?.id],
    enabled: !!quote?.id,
    queryFn: async () => {
      const id = quote!.id;
      const { data } = await supabase
        .from("connections")
        .select("source_kind, source_id, target_kind, target_id")
        .or(`source_id.eq.${id},target_id.eq.${id}`);
      return data ?? [];
    },
  });
  const connectedBooks = useMemo(() => {
    const out: { id: string; title: string }[] = [];
    const seen = new Set<string>();
    for (const c of quoteConnections) {
      const otherIsSource = c.target_id === quote?.id;
      const otherKind = otherIsSource ? c.source_kind : c.target_kind;
      const otherId = otherIsSource ? c.source_id : c.target_id;
      if (otherKind !== "book") continue;
      const b = library.find((bk) => bk.id === otherId);
      if (!b || seen.has(b.id)) continue;
      seen.add(b.id);
      out.push({ id: b.id, title: b.title });
    }
    return out.slice(0, 3);
  }, [quoteConnections, quote?.id, library]);

  const firstName = (profile?.display_name ?? "reader").split(" ")[0];
  const initials = firstName.slice(0, 2).toUpperCase();
  const dayName = format(new Date(), "EEEE");
  const hour = new Date().getHours();
  const partOfDay = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
  const weekMin = weekMinutes;
  const weekFormatted = weekMin < 60
    ? `${weekMin} min`
    : `${Math.floor(weekMin / 60)} hr ${weekMin % 60 > 0 ? (weekMin % 60) + " min" : ""}`.trim();
  const contextualLine =
    focus && focusPct > 5
      ? `You're ${focusPct}% through ${focus.title}.`
      : `Your library is waiting.`;

  return (
    <div className="hp">
      <section className="hero">
        <div className="hero-text">
          <div className="hero-eyebrow">
            <span className="dot" /> {dayName} {partOfDay} · {weekFormatted} this week · {inFlight} in progress
          </div>
          <h1 className="hero-title">
            Welcome back, {firstName}.<br />
            <em>{contextualLine}</em>
          </h1>
          <div className="hero-cta">
            <button type="button" className="btn btn-primary" onClick={() => setLogSessionOpen(true)}>
              Log a session
            </button>
          </div>
        </div>

        <div className="hero-stats">
          <Link to="/board" className="stat stat-link">
            <div className="stat-num">{finishedThisYear}</div>
            <div className="stat-lbl">books this year</div>
            <div className="stat-bar">
              <div className="stat-fill" style={{ width: `${goalPct}%` }} />
            </div>
            <div className="stat-foot">goal {goal} · {goalPct}% there</div>
          </Link>
          {showFocusCard ? (
            <Link to="/books/$bookId" params={{ bookId: focus!.id }} className="stat alt stat-link">
              <div className="stat-num">
                {focusUb?.current_page ?? 0}
                <span className="stat-num-sm">/{focusUb?.total_pages ?? "?"}</span>
              </div>
              <div className="stat-lbl">{focus!.title}</div>
              <div className="stat-bar light">
                <div className="stat-fill terra" style={{ width: `${focusPct}%` }} />
              </div>
              <div className="stat-foot">{focusPct}% complete</div>
            </Link>
          ) : (
            <Link to="/library" className="stat alt stat-link">
              <div className="stat-num">{library.length}</div>
              <div className="stat-lbl">books in your library</div>
              <div className="stat-foot">start reading to track progress →</div>
            </Link>
          )}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Currently unshelved</h2>
          <span className="section-rule" />
          <Link to="/board" className="section-link">All shelves →</Link>
        </div>
        {reading.length === 0 ? (
          <Empty>Nothing in progress. Pick something from your shelf.</Empty>
        ) : (
          <div className="reading-grid">
            {reading.map((b) => (
              <BookCard key={b.id} book={b} userBook={b.user_books[0]} />
            ))}
          </div>
        )}
      </section>

      <div className="two-col">
        <section className="section">
          <div className="section-head">
            <h2>Up next</h2>
            <span className="section-rule" />
            <Link to="/board" className="section-link">Reorder →</Link>
          </div>
          <div className="upnext-row">
            {upNext.slice(0, 5).map((b) => (
              <Link
                key={b.id}
                to="/books/$bookId"
                params={{ bookId: b.id }}
                className="upnext-item"
                title={`${b.title} — ${b.author}`}
              >
                <GeneratedCover book={b} className="upnext-cover" />
                <div className="upnext-title">{b.title}</div>
              </Link>
            ))}
            <button type="button" onClick={() => setAddOpen(true)} className="upnext-add" aria-label="Add a book">
              <div className="add-plus">+</div>
              <div className="add-lbl">add</div>
            </button>
          </div>
          {upNext.length > 5 && (
            <button
              type="button"
              className="upnext-showall"
              onClick={() => setShowAllUpNext((v) => !v)}
            >
              {showAllUpNext ? "Show fewer" : `Show all (${upNext.length})`}
            </button>
          )}
          {showAllUpNext && upNext.length > 5 && (
            <div className="upnext-grid">
              {upNext.map((b) => (
                <Link
                  key={b.id}
                  to="/books/$bookId"
                  params={{ bookId: b.id }}
                  className="upnext-item"
                  title={`${b.title} — ${b.author}`}
                >
                  <GeneratedCover book={b} className="upnext-cover" />
                  <div className="upnext-title">{b.title}</div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="section">
          <div className="section-head">
            <h2>Recently finished</h2>
            <span className="section-rule" />
          </div>
          {finished.length === 0 ? (
            <Empty>Your finished shelf is empty — for now.</Empty>
          ) : (
            <div className="finished-list">
              {finished.map((b) => {
                const ub = b.user_books[0];
                return (
                  <Link key={b.id} to="/books/$bookId" params={{ bookId: b.id }} className="fin-row">
                    <GeneratedCover book={b} className="fin-cover-img" />
                    <div className="fin-info">
                      <div className="fin-title">{b.title}</div>
                      <div className="fin-meta">
                        {b.author} · finished {ub?.finished_at ? format(new Date(ub.finished_at), "MMM d") : "—"}
                      </div>
                    </div>
                    {/* TODO: half-star interactive rating in prompt 2 */}
                    <div className="fin-rating">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          className={"star-btn " + (n <= (ub?.rating ?? 0) ? "on" : "")}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (ub?.id) updateRating.mutate({ id: ub.id, rating: n });
                          }}
                          aria-label={`Rate ${n} star${n !== 1 ? "s" : ""}`}
                        >
                          ●
                        </button>
                      ))}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {quote && (
        <section className="quote">
          <Link to="/books/$bookId" params={{ bookId: quote.book_id }} className="quote-body-link">
            <div className="quote-mark">"</div>
            <blockquote>{quote.quote_text}</blockquote>
            <div className="quote-attr">
              — underlined in <em>{quote.books?.title}</em>
              {quote.page_number ? `, p. ${quote.page_number}` : ""}
            </div>
          </Link>
          {connectedBooks.length > 0 && (
            <div className="quote-conn">
              Connected to{" "}
              {connectedBooks.map((b, i) => (
                <span key={b.id}>
                  {i > 0 && (i === connectedBooks.length - 1 ? " and " : ", ")}
                  <Link to="/books/$bookId" params={{ bookId: b.id }} className="quote-conn-link">
                    <em>{b.title}</em>
                  </Link>
                </span>
              ))}
            </div>
          )}
        </section>
      )}

      <footer className="hp-foot">
        <span>Unshelved · a quiet place for readers</span>
        <span>{finishedThisYear} books · this year</span>
      </footer>

      <HomepageStyles />
      <span className="sr-only">{initials}</span>
      <AddBookModal open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="hp-empty">{children}</div>;
}

function HomepageStyles() {
  return (
    <style>{`
      .hp {
        font-family: 'Manrope', system-ui, sans-serif;
        color: var(--ink);
        background: var(--cream);
        padding: 8px 56px 56px;
        max-width: 1280px;
        margin: 0 auto;
        box-sizing: border-box;
        background-image:
          radial-gradient(circle at 85% 0%, rgba(209,118,72,0.08), transparent 35%),
          radial-gradient(circle at 0% 60%, rgba(111,179,122,0.08), transparent 40%);
      }
      @media (max-width: 900px) { .hp { padding: 8px 20px 40px; } }

      .hero {
        display: grid;
        grid-template-columns: 1.4fr 1fr;
        gap: 32px;
        margin-bottom: 56px;
        align-items: end;
      }
      @media (max-width: 900px) { .hero { grid-template-columns: 1fr; } }

      .hero-eyebrow {
        display: inline-flex; align-items: center; gap: 10px;
        font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase;
        color: var(--forest); font-weight: 600;
        margin-bottom: 22px;
      }
      .hero-eyebrow .dot {
        width: 8px; height: 8px; border-radius: 50%; background: var(--sage);
        box-shadow: 0 0 0 4px rgba(111,179,122,0.18);
      }
      .hero-title {
        font-family: 'Newsreader', serif;
        font-weight: 400;
        font-size: 64px;
        line-height: 1.02;
        letter-spacing: -0.02em;
        margin: 0 0 28px;
        text-wrap: balance;
      }
      @media (max-width: 900px) { .hero-title { font-size: 44px; } }
      .hero-title em { font-style: italic; color: var(--terra); font-weight: 300; }
      .hero-cta { display: flex; gap: 12px; flex-wrap: wrap; }
      .btn {
        display: inline-flex; align-items: center; gap: 10px;
        padding: 14px 22px;
        border-radius: 999px;
        border: none;
        font-family: inherit;
        font-size: 14.5px;
        font-weight: 600;
        cursor: pointer;
        text-decoration: none;
        transition: transform 0.15s ease, box-shadow 0.15s ease;
      }
      .btn:hover { transform: translateY(-1px); }
      .btn-primary {
        background: var(--forest);
        color: var(--paper);
        box-shadow: 0 1px 0 rgba(31,38,48,0.06), 0 12px 24px -10px rgba(31,82,102,0.5);
      }

      .hero-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
      .stat {
        background: var(--paper);
        border-radius: 24px;
        padding: 22px 24px;
        box-shadow: 0 1px 0 rgba(31,38,48,0.04), 0 18px 40px -28px rgba(31,38,48,0.22);
      }
      .stat.alt { background: #D5E8F2; }
      .stat-link { display: block; text-decoration: none; color: inherit; transition: transform 0.15s ease, box-shadow 0.15s ease; cursor: pointer; }
      .stat-link:hover { transform: translateY(-2px); box-shadow: 0 1px 0 rgba(31,38,48,0.04), 0 24px 48px -24px rgba(31,38,48,0.28); }
      .stat-num {
        font-family: 'Newsreader', serif;
        font-size: 56px; font-weight: 400; line-height: 1;
        letter-spacing: -0.02em; color: var(--ink);
      }
      .stat-num-sm { font-size: 22px; color: rgba(31,38,48,0.4); margin-left: 4px; }
      .stat-lbl { font-size: 13px; color: rgba(31,38,48,0.6); margin: 8px 0 14px; }
      .stat-bar { height: 6px; background: var(--mist); border-radius: 999px; overflow: hidden; margin-bottom: 10px; }
      .stat-bar.light { background: rgba(31,38,48,0.08); }
      .stat-fill { height: 100%; background: var(--sage); border-radius: 999px; }
      .stat-fill.terra { background: var(--honey); }
      .stat-foot { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: rgba(31,38,48,0.5); }

      .section { margin-bottom: 48px; }
      .section-head { display: flex; align-items: center; gap: 16px; margin-bottom: 22px; }
      .section-head h2 {
        font-family: 'Newsreader', serif;
        font-weight: 500; font-size: 24px; margin: 0; letter-spacing: -0.01em;
      }
      .section-rule { flex: 1; height: 1px; background: var(--mist); }
      .section-link { font-size: 13px; color: var(--forest); text-decoration: none; font-weight: 600; }

      .hp-empty {
        background: var(--paper); border-radius: 24px; padding: 32px;
        text-align: center; color: rgba(31,38,48,0.55); font-style: italic;
        box-shadow: 0 1px 0 rgba(31,38,48,0.04), 0 18px 40px -28px rgba(31,38,48,0.22);
      }

      .reading-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 20px;
      }

      .two-col { display: grid; grid-template-columns: 1.3fr 1fr; gap: 32px; margin-bottom: 48px; }
      @media (max-width: 900px) { .two-col { grid-template-columns: 1fr; } }

      .upnext-row {
        display: flex; gap: 14px; flex-wrap: wrap; align-items: flex-start;
        padding: 18px;
        background: var(--paper);
        border-radius: 24px;
        box-shadow: 0 1px 0 rgba(31,38,48,0.04), 0 18px 40px -28px rgba(31,38,48,0.22);
      }
      .upnext-item {
        flex: 0 0 84px;
        width: 84px;
        text-decoration: none;
        color: inherit;
        display: flex; flex-direction: column; gap: 8px;
      }
      .upnext-cover {
        width: 84px;
        height: 126px;
        border-radius: 4px;
        box-shadow: inset -2px 0 0 rgba(0,0,0,0.15), 0 6px 14px -8px rgba(31,38,48,0.35);
        transition: transform 0.18s ease, box-shadow 0.18s ease;
      }
      .upnext-item:hover .upnext-cover {
        transform: translateY(-3px);
        box-shadow: inset -2px 0 0 rgba(0,0,0,0.15), 0 12px 22px -10px rgba(31,38,48,0.4);
      }
      .upnext-title {
        font-size: 11.5px; line-height: 1.3;
        color: rgba(31,38,48,0.75);
        display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .upnext-add {
        flex: 0 0 84px;
        width: 84px;
        height: 126px;
        align-self: flex-start;
        border-radius: 4px;
        border: 1.5px dashed rgba(31,38,48,0.18);
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        gap: 6px; color: rgba(31,38,48,0.45);
        background: transparent; cursor: pointer; padding: 0;
        transition: border-color 0.15s ease, color 0.15s ease, transform 0.15s ease;
      }
      .upnext-add:hover { border-color: var(--forest); color: var(--forest); transform: translateY(-2px); }
      .upnext-showall {
        margin-top: 14px;
        background: transparent; border: none; padding: 0;
        color: var(--forest); font: inherit; font-size: 13px; font-weight: 600; cursor: pointer;
      }
      .upnext-grid {
        margin-top: 16px;
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 14px;
        padding: 18px;
        background: var(--paper);
        border-radius: 24px;
        box-shadow: 0 1px 0 rgba(31,38,48,0.04), 0 18px 40px -28px rgba(31,38,48,0.22);
      }
      .upnext-grid .upnext-item { width: 100%; flex: initial; }
      .upnext-grid .upnext-cover { width: 100%; height: auto; aspect-ratio: 2 / 3; }
      .add-plus { font-size: 22px; font-family: 'Newsreader', serif; }
      .add-lbl { font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; }

      @media (max-width: 768px) {
        .upnext-row { flex-wrap: nowrap; overflow-x: auto; scroll-snap-type: x mandatory; }
        .upnext-row > * { scroll-snap-align: start; }
        .upnext-grid { grid-template-columns: repeat(2, 1fr); }
      }

      .finished-list {
        display: flex; flex-direction: column; gap: 4px;
        background: var(--paper);
        border-radius: 24px;
        padding: 12px;
        box-shadow: 0 1px 0 rgba(31,38,48,0.04), 0 18px 40px -28px rgba(31,38,48,0.22);
      }
      .fin-row {
        display: grid; grid-template-columns: 48px 1fr auto; gap: 16px;
        align-items: center; padding: 14px;
        border-radius: 16px; text-decoration: none; color: inherit;
      }
      .fin-row:hover { background: var(--cream); }
      .fin-cover-img {
        width: 48px;
        height: 72px;
        border-radius: 3px;
        flex-shrink: 0;
        box-shadow: inset -2px 0 0 rgba(0,0,0,0.15), 0 2px 6px -2px rgba(31,38,48,0.3);
      }
      .fin-title { font-family: 'Newsreader', serif; font-size: 17px; font-weight: 500; }
      .fin-meta { font-size: 12px; color: rgba(31,38,48,0.55); }
      .fin-rating { display: flex; gap: 3px; }
      .star-btn {
        background: none;
        border: none;
        padding: 0;
        cursor: pointer;
        font-size: 8px;
        color: rgba(31,38,48,0.18);
        transition: color 0.12s ease;
        line-height: 1;
      }
      .star-btn.on { color: var(--honey); }
      .star-btn:hover { color: var(--honey); opacity: 0.7; }

      .quote {
        background: var(--forest);
        color: var(--paper);
        border-radius: 28px;
        padding: 44px 56px 48px;
        margin-bottom: 32px;
        position: relative;
        overflow: hidden;
      }
      .quote::after {
        content: ""; position: absolute;
        right: -60px; bottom: -60px;
        width: 280px; height: 280px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(93,168,213,0.4), rgba(45,106,149,0.18) 60%, transparent 80%);
      }
      .quote-mark {
        font-family: 'Newsreader', serif;
        font-size: 120px; line-height: 0.5;
        color: var(--honey); opacity: 0.95; margin-bottom: 4px;
      }
      .quote blockquote {
        font-family: 'Newsreader', serif;
        font-style: italic; font-weight: 300;
        font-size: 36px; line-height: 1.2;
        margin: 0 0 18px; max-width: 880px;
        letter-spacing: -0.01em; text-wrap: balance;
        position: relative; z-index: 1;
      }
      @media (max-width: 900px) { .quote { padding: 32px 28px; } .quote blockquote { font-size: 26px; } }
      .quote-attr { font-size: 13px; color: rgba(250,251,243,0.7); position: relative; z-index: 1; }
      .quote-attr em { color: var(--cream); font-style: italic; }
      .quote-conn { margin-top: 14px; font-size: 12px; color: rgba(250,251,243,0.6); position: relative; z-index: 1; }
      .quote-conn-link { color: rgba(250,251,243,0.85); text-decoration: none; border-bottom: 1px dotted rgba(250,251,243,0.4); }
      .quote-conn-link:hover { color: var(--cream); border-bottom-color: var(--cream); }
      .quote-body-link { display: block; text-decoration: none; color: inherit; }
      .quote-body-link:hover blockquote { color: var(--cream); }

      .hp-foot {
        display: flex; justify-content: space-between;
        font-size: 12px; color: rgba(31,38,48,0.45);
        letter-spacing: 0.04em; padding: 0 8px;
      }
      .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); border: 0; }
    `}</style>
  );
}
