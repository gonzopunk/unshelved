import { createFileRoute, Link } from "@tanstack/react-router";
import { useLibrary, useProfile } from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import BookCard from "@/components/BookCard";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({ meta: [{ title: "Margins — Library" }] }),
  component: Home,
});

const FORMAT_LABEL: Record<string, string> = { print: "Print", ebook: "Ebook", audiobook: "Audiobook" };

function Home() {
  const { data: library = [] } = useLibrary();
  const { data: profile } = useProfile();
  const { user } = useAuth();

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

  const reading = library.filter((b) => b.user_books[0]?.status === "reading").slice(0, 2);
  const upNext = library.filter((b) => b.user_books[0]?.status === "want").slice(0, 5);
  const finished = library
    .filter((b) => ["loved", "liked", "meh"].includes(b.user_books[0]?.status ?? ""))
    .sort((a, b) => (b.user_books[0]?.finished_at ?? "").localeCompare(a.user_books[0]?.finished_at ?? ""))
    .slice(0, 3);

  const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString();
  const finishedThisYear = library.filter((b) => (b.user_books[0]?.finished_at ?? "") >= yearStart).length;
  const goal = profile?.yearly_goal ?? 24;
  const goalPct = Math.min(100, Math.round((finishedThisYear / goal) * 100));

  const inFlight = library.filter((b) => b.user_books[0]?.status === "reading").length;
  const focus = reading[0];
  const focusUb = focus?.user_books[0];
  const focusPct = focusUb?.total_pages
    ? Math.round(((focusUb.current_page ?? 0) / focusUb.total_pages) * 100)
    : Math.round(Number(focusUb?.progress_pct ?? 0));

  const quote = highlights[0] as
    | { quote_text: string; page_number: number | null; books?: { title: string; author: string } | null }
    | undefined;

  const dayName = format(new Date(), "EEEE");
  const partOfDay = (() => {
    const h = new Date().getHours();
    if (h < 12) return "morning";
    if (h < 18) return "afternoon";
    return "evening";
  })();
  const firstName = (profile?.display_name ?? "reader").split(" ")[0];
  const initials = firstName.slice(0, 2).toUpperCase();

  return (
    <div className="hp">
      <section className="hero">
        <div className="hero-text">
          <div className="hero-eyebrow">
            <span className="dot" /> {dayName} {partOfDay} · {inFlight} {inFlight === 1 ? "book" : "books"} in flight
          </div>
          <h1 className="hero-title">
            Welcome back, {firstName}. <em>Pick up where you drifted off.</em>
          </h1>
          <p className="hero-sub">
            {focus
              ? `You're ${focusPct}% through ${focus.title}. A few more pages and you'll close the chapter.`
              : "Your shelf is quiet. Pick something to start a new chapter."}
          </p>
          <div className="hero-cta">
            {focus ? (
              <Link to="/books/$bookId" params={{ bookId: focus.id }} className="btn btn-primary">
                Resume {focus.title}
                {focusUb?.current_page ? <> · p.&nbsp;{focusUb.current_page}</> : null}
              </Link>
            ) : (
              <Link to="/board" className="btn btn-primary">Open the board</Link>
            )}
            <button className="btn btn-ghost">Log a session</button>
          </div>
        </div>

        <div className="hero-stats">
          <div className="stat">
            <div className="stat-num">{finishedThisYear}</div>
            <div className="stat-lbl">books this year</div>
            <div className="stat-bar">
              <div className="stat-fill" style={{ width: `${goalPct}%` }} />
            </div>
            <div className="stat-foot">goal {goal} · {goalPct}% there</div>
          </div>
          <div className="stat alt">
            <div className="stat-num">
              {focusUb?.current_page ?? 0}
              <span className="stat-num-sm">/{focusUb?.total_pages ?? "?"}</span>
            </div>
            <div className="stat-lbl">{focus?.title ?? "Nothing in progress"}</div>
            <div className="stat-bar light">
              <div className="stat-fill terra" style={{ width: `${focusPct}%` }} />
            </div>
            <div className="stat-foot">{focusPct}% complete</div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Currently reading</h2>
          <span className="section-rule" />
          <Link to="/board" className="section-link">All shelves →</Link>
        </div>
        {reading.length === 0 ? (
          <Empty>Nothing in progress. Pick something from your shelf.</Empty>
        ) : (
          <div className="reading-grid">
            {reading.map((b, i) => (
              <BookCard key={b.id} book={b} userBook={b.user_books[0]} tilt={[-0.6, 0.4][i] ?? 0} />
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
          <div className="shelf-row">
            {upNext.map((b, i) => (
              <Link
                key={b.id}
                to="/books/$bookId"
                params={{ bookId: b.id }}
                className="shelf-book"
                style={{
                  background: b.cover_color,
                  color: b.cover_text_color,
                  transform: `translateY(${[0, 4, 2, 6, 3][i] ?? 0}px) rotate(${[-1.2, 0.4, -0.2, 0.8, -0.6][i] ?? 0}deg)`,
                }}
              >
                <div className="sb-spine">
                  <div className="sb-author">{b.author}</div>
                  <div className="sb-title">{b.title}</div>
                </div>
                <div className="sb-mark" />
              </Link>
            ))}
            <div className="shelf-add">
              <div className="add-plus">+</div>
              <div className="add-lbl">add</div>
            </div>
          </div>
          <div className="shelf-floor" />
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
                    <div className="fin-cover" style={{ background: b.cover_color }} />
                    <div className="fin-info">
                      <div className="fin-title">{b.title}</div>
                      <div className="fin-meta">
                        {b.author} · finished {ub?.finished_at ? format(new Date(ub.finished_at), "MMM d") : "—"}
                      </div>
                    </div>
                    <div className="fin-rating">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <span key={n} className={"star " + (n <= (ub?.rating ?? 0) ? "on" : "")}>●</span>
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
          <div className="quote-mark">"</div>
          <blockquote>{quote.quote_text}</blockquote>
          <div className="quote-attr">
            — underlined in <em>{quote.books?.title}</em>
            {quote.page_number ? `, p. ${quote.page_number}` : ""}
          </div>
        </section>
      )}

      <footer className="hp-foot">
        <span>Margins · a quiet place for readers</span>
        <span>{finishedThisYear} books · this year</span>
      </footer>

      <HomepageStyles />
      <span className="sr-only">{initials}</span>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="hp-empty">{children}</div>;
}

function ReadingCard({ book }: { book: BookWithShelf }) {
  const ub = book.user_books[0];
  const pct = ub?.total_pages
    ? Math.min(100, Math.round(((ub.current_page ?? 0) / ub.total_pages) * 100))
    : Math.round(Number(ub?.progress_pct ?? 0));
  const started = ub?.started_at ? format(new Date(ub.started_at), "MMM d") : "—";
  return (
    <article className="read-card">
      <div className="cover-wrap">
        <div className="cover" style={{ background: book.cover_color, color: book.cover_text_color }}>
          <div className="cv-stripe" />
          <div className="cv-meta">
            <div className="cv-author">{book.author}</div>
            <div className="cv-title">{book.title}</div>
          </div>
          <div className="cv-corner">·</div>
        </div>
        {book.format === "print" && (
          <div className="bookmark" style={{ background: book.bookmark_color }} />
        )}
        {book.format === "audiobook" && (
          <div className="audio-spool-hp">
            {[6, 10, 14, 8, 12, 6].map((h, i) => (
              <div key={i} className="asbar" style={{ height: h }} />
            ))}
          </div>
        )}
      </div>
      <div className="read-info">
        <div className="read-row">
          <div className="read-title">{book.title}</div>
          <div className={"read-fmt " + book.format}>{FORMAT_LABEL[book.format]}</div>
        </div>
        <div className="read-author">
          {book.author}
          {ub?.total_pages ? (
            <span className="read-pages"> · p. {ub.current_page ?? 0} / {ub.total_pages}</span>
          ) : null}
        </div>
        <div className="read-bar">
          <div className="read-fill" style={{ width: `${pct}%`, background: book.cover_color }} />
        </div>
        <div className="read-meta">
          <span>Started {started}</span>
          <span className="dot-sep">·</span>
          <span>{pct}% complete</span>
        </div>
        <div className="read-actions">
          <Link to="/books/$bookId" params={{ bookId: book.id }} className="chip-btn primary">Continue</Link>
          <button className="chip-btn">+ note</button>
          <button className="chip-btn">+ quote</button>
        </div>
      </div>
    </article>
  );
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
        margin: 0 0 18px;
        text-wrap: balance;
      }
      @media (max-width: 900px) { .hero-title { font-size: 44px; } }
      .hero-title em { font-style: italic; color: var(--terra); font-weight: 300; }
      .hero-sub {
        font-size: 17px;
        color: rgba(31,38,48,0.7);
        line-height: 1.5;
        margin: 0 0 28px;
        max-width: 520px;
      }
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
      .btn-ghost {
        background: transparent;
        color: var(--ink);
        box-shadow: inset 0 0 0 1.5px rgba(31,38,48,0.18);
      }

      .hero-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
      .stat {
        background: var(--paper);
        border-radius: 24px;
        padding: 22px 24px;
        box-shadow: 0 1px 0 rgba(31,38,48,0.04), 0 18px 40px -28px rgba(31,38,48,0.22);
      }
      .stat.alt { background: #D5E8F2; }
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

      .reading-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
      @media (max-width: 900px) { .reading-grid { grid-template-columns: 1fr; } }

      .read-card {
        display: grid; grid-template-columns: 168px 1fr; gap: 24px;
        padding: 24px; background: var(--paper); border-radius: 26px;
        box-shadow: 0 1px 0 rgba(31,38,48,0.04), 0 22px 44px -28px rgba(31,38,48,0.22);
      }
      .cover-wrap { position: relative; }
      .cover {
        aspect-ratio: 2/3;
        border-radius: 6px 12px 12px 6px;
        padding: 18px 16px;
        display: flex; flex-direction: column; justify-content: space-between;
        font-family: 'Newsreader', serif;
        box-shadow:
          inset 4px 0 0 rgba(0,0,0,0.12),
          0 6px 14px -6px rgba(31,38,48,0.3),
          0 14px 32px -16px rgba(31,38,48,0.2);
        position: relative;
      }
      .cv-stripe { height: 1px; background: currentColor; opacity: 0.4; width: 60%; margin-top: 10px; }
      .cv-meta { margin-top: auto; }
      .cv-author { font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; opacity: 0.85; margin-bottom: 8px; }
      .cv-title { font-size: 22px; line-height: 1.05; font-weight: 500; letter-spacing: -0.01em; }
      .cv-corner { position: absolute; top: 8px; right: 12px; font-size: 24px; opacity: 0.4; }

      .bookmark {
        position: absolute; top: -6px; left: 50%;
        transform: translateX(-50%);
        width: 14px; height: 56px;
        border-radius: 0 0 4px 4px;
        box-shadow: 0 4px 8px -4px rgba(31,38,48,0.4);
      }
      .bookmark::before {
        content: ""; position: absolute; top: 0; left: 0; bottom: 0;
        width: 3px; background: linear-gradient(90deg, rgba(0,0,0,0.18), transparent);
      }
      .bookmark::after {
        content: ""; position: absolute; bottom: -6px; left: 0;
        width: 14px; height: 8px; background: inherit;
        clip-path: polygon(0 0, 100% 0, 100% 100%, 50% 50%, 0 100%);
      }
      .audio-spool-hp {
        position: absolute; top: 12px; right: 12px;
        padding: 5px 9px; background: rgba(0,0,0,0.28);
        border-radius: 999px; display: flex; gap: 3px; align-items: center;
      }
      .audio-spool-hp .asbar { width: 2px; background: rgba(250,251,243,0.95); border-radius: 2px; }

      .read-info { display: flex; flex-direction: column; gap: 6px; padding-top: 4px; }
      .read-row { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
      .read-title { font-family: 'Newsreader', serif; font-size: 26px; font-weight: 500; letter-spacing: -0.01em; }
      .read-fmt { padding: 4px 9px; border-radius: 999px; font-size: 11px; font-weight: 600; flex-shrink: 0; }
      .read-fmt.print { background: rgba(111,179,122,0.18); color: #2F6638; }
      .read-fmt.ebook { background: rgba(45,106,149,0.16); color: #1F5266; }
      .read-fmt.audiobook { background: rgba(209,118,72,0.18); color: #A85428; }
      .read-pages { font-family: 'JetBrains Mono', monospace; font-size: 13px; color: rgba(31,38,48,0.55); }
      .read-author { font-size: 14px; color: rgba(31,38,48,0.6); margin-bottom: 14px; }
      .read-bar { height: 8px; background: var(--mist); border-radius: 999px; overflow: hidden; margin-bottom: 10px; }
      .read-fill { height: 100%; border-radius: 999px; }
      .read-meta { display: flex; gap: 8px; font-size: 12.5px; color: rgba(31,38,48,0.55); margin-bottom: 14px; }
      .dot-sep { color: rgba(31,38,48,0.3); }
      .read-actions { display: flex; gap: 8px; margin-top: auto; flex-wrap: wrap; }
      .chip-btn {
        padding: 8px 14px; border-radius: 999px;
        border: 1.5px solid rgba(31,38,48,0.12);
        background: transparent; font-family: inherit; font-size: 12.5px; font-weight: 600;
        color: var(--ink); cursor: pointer; text-decoration: none;
      }
      .chip-btn.primary { background: var(--forest); color: var(--paper); border-color: var(--forest); }

      .two-col { display: grid; grid-template-columns: 1.3fr 1fr; gap: 32px; margin-bottom: 48px; }
      @media (max-width: 900px) { .two-col { grid-template-columns: 1fr; } }

      .shelf-row {
        display: flex; align-items: flex-end; gap: 14px;
        padding: 28px 24px 0;
        background: var(--paper);
        border-radius: 24px 24px 0 0;
        height: 220px;
        box-shadow: inset 0 1px 0 rgba(31,38,48,0.04);
      }
      .shelf-book {
        width: 44px; height: 168px;
        border-radius: 4px 4px 2px 2px;
        padding: 14px 6px;
        font-family: 'Newsreader', serif;
        box-shadow: inset -3px 0 0 rgba(0,0,0,0.12), 0 6px 12px -6px rgba(31,38,48,0.3);
        display: flex; flex-direction: column;
        position: relative;
        transition: transform 0.2s ease;
        text-decoration: none;
      }
      .shelf-book:hover { transform: translateY(-12px) rotate(0deg) !important; }
      .sb-spine { writing-mode: vertical-rl; transform: rotate(180deg); margin: 0 auto; display: flex; gap: 14px; align-items: center; }
      .sb-author { font-size: 9px; letter-spacing: 0.14em; text-transform: uppercase; opacity: 0.85; }
      .sb-title { font-size: 14px; font-weight: 500; letter-spacing: 0.02em; }
      .sb-mark { position: absolute; left: 8px; right: 8px; bottom: 16px; height: 1px; background: currentColor; opacity: 0.3; }
      .shelf-add {
        width: 44px; height: 168px; border-radius: 4px;
        border: 1.5px dashed rgba(31,38,48,0.18);
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        gap: 8px; color: rgba(31,38,48,0.45); margin-left: auto;
      }
      .add-plus { font-size: 22px; font-family: 'Newsreader', serif; }
      .add-lbl { font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; }
      .shelf-floor {
        height: 14px;
        background: linear-gradient(180deg, #b89e7a, #9a7e58 60%, #7e6442);
        border-radius: 0 0 24px 24px;
        box-shadow: 0 18px 32px -22px rgba(31,38,48,0.4);
      }

      .finished-list {
        display: flex; flex-direction: column; gap: 4px;
        background: var(--paper);
        border-radius: 24px;
        padding: 12px;
        box-shadow: 0 1px 0 rgba(31,38,48,0.04), 0 18px 40px -28px rgba(31,38,48,0.22);
      }
      .fin-row {
        display: grid; grid-template-columns: 28px 1fr auto; gap: 16px;
        align-items: center; padding: 14px;
        border-radius: 16px; text-decoration: none; color: inherit;
      }
      .fin-row:hover { background: var(--cream); }
      .fin-cover {
        width: 28px; height: 40px;
        border-radius: 2px 4px 4px 2px;
        box-shadow: inset -2px 0 0 rgba(0,0,0,0.15), 0 2px 4px -2px rgba(31,38,48,0.3);
      }
      .fin-title { font-family: 'Newsreader', serif; font-size: 17px; font-weight: 500; }
      .fin-meta { font-size: 12px; color: rgba(31,38,48,0.55); }
      .fin-rating { display: flex; gap: 3px; }
      .star { font-size: 8px; color: rgba(31,38,48,0.18); }
      .star.on { color: var(--honey); }

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

      .hp-foot {
        display: flex; justify-content: space-between;
        font-size: 12px; color: rgba(31,38,48,0.45);
        letter-spacing: 0.04em; padding: 0 8px;
      }
      .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); border: 0; }
    `}</style>
  );
}
