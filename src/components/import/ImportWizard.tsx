import { useMemo, useReducer, useRef, useState, useSyncExternalStore } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/lib/auth";
import { useLibrary, type BookStatus } from "@/lib/queries";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  applyMap,
  detectColumnMap,
  emptyRow,
  parseCsvText,
  parsePaste,
} from "@/lib/import/parsers";
import { annotateDuplicates, buildDedupeMaps } from "@/lib/import/dedupe";
import { enrichRows } from "@/lib/import/enrich";
import { commitImport, undoImport } from "@/lib/import/commit";
import { runPalettePass } from "@/lib/palette-pass";
import type { QueryClient } from "@tanstack/react-query";
import {
  FIELD_LABELS,
  type ColumnMap,
  type FieldKey,
  type ImportRow,
  type ImportSource,
} from "@/lib/import/types";
import {
  FileUp, ClipboardPaste, FileText, ChevronLeft, ChevronRight,
  Loader2, X, Sparkles, AlertTriangle, Check, RotateCcw,
} from "lucide-react";

// ────────────────────────────────────────────────────────────
// State

type Step = "source" | "map" | "review" | "done";

type State = {
  step: Step;
  source: ImportSource | null;
  // CSV intermediates
  headers: string[];
  rawRows: Record<string, string>[];
  map: ColumnMap;
  // Result rows
  rows: ImportRow[];
  // Commit
  commitInserted: number;
  commitTotal: number;
  commitSkipped: number;
  batchId: string | null;
};

const initial: State = {
  step: "source",
  source: null,
  headers: [],
  rawRows: [],
  map: {},
  rows: [],
  commitInserted: 0,
  commitTotal: 0,
  commitSkipped: 0,
  batchId: null,
};

type Action =
  | { type: "reset" }
  | { type: "loadCsv"; source: ImportSource; headers: string[]; rows: Record<string, string>[]; map: ColumnMap }
  | { type: "loadPaste"; rows: ImportRow[] }
  | { type: "setMap"; map: ColumnMap }
  | { type: "setRows"; rows: ImportRow[] }
  | { type: "patchRow"; uid: string; patch: Partial<ImportRow> }
  | { type: "step"; step: Step }
  | { type: "commitProgress"; inserted: number; total: number; skipped: number }
  | { type: "commitDone"; batchId: string; inserted: number; skipped: number };

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case "reset": return initial;
    case "loadCsv": return { ...s, source: a.source, headers: a.headers, rawRows: a.rows, map: a.map, step: "map" };
    case "loadPaste": return { ...s, source: "paste", rows: a.rows, step: "review" };
    case "setMap": return { ...s, map: a.map };
    case "setRows": return { ...s, rows: a.rows };
    case "patchRow": return {
      ...s,
      rows: s.rows.map((r) => r.uid === a.uid ? { ...r, ...a.patch } : r),
    };
    case "step": return { ...s, step: a.step };
    case "commitProgress": return { ...s, commitInserted: a.inserted, commitTotal: a.total, commitSkipped: a.skipped };
    case "commitDone": return { ...s, step: "done", batchId: a.batchId, commitInserted: a.inserted, commitSkipped: a.skipped };
  }
}

// ────────────────────────────────────────────────────────────
// Wizard shell

export default function ImportWizard({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [state, dispatch] = useReducer(reducer, initial);
  const close = () => { onOpenChange(false); setTimeout(() => dispatch({ type: "reset" }), 200); };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) close(); }}>
      <DialogContent className="rounded-3xl bg-card max-w-5xl max-h-[92vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="font-display text-2xl flex items-center gap-3">
            Import library
            <Stepper step={state.step} />
          </DialogTitle>
        </DialogHeader>
        <div className="px-6 pb-6">
          {state.step === "source" && <SourceStep dispatch={dispatch} />}
          {state.step === "map" && <MapStep state={state} dispatch={dispatch} />}
          {state.step === "review" && <ReviewStep state={state} dispatch={dispatch} onClose={close} />}
          {state.step === "done" && <DoneStep state={state} onClose={close} dispatch={dispatch} />}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Stepper({ step }: { step: Step }) {
  const steps: { id: Step; label: string }[] = [
    { id: "source", label: "Source" },
    { id: "map", label: "Map" },
    { id: "review", label: "Review" },
    { id: "done", label: "Done" },
  ];
  const idx = steps.findIndex((s) => s.id === step);
  return (
    <div className="ml-auto hidden sm:flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-muted-foreground">
      {steps.map((s, i) => (
        <span key={s.id} className={i === idx ? "text-ink" : i < idx ? "text-forest" : ""}>
          {i > 0 && <span className="mx-1.5 opacity-40">·</span>}
          {s.label}
        </span>
      ))}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Palette pass tracker — module-level so the pass survives the wizard
// being unmounted (closing the dialog, navigating away).

type PaletteState = {
  batchId: string | null;
  done: number;
  total: number;
  running: boolean;
  controller: AbortController | null;
};

let paletteState: PaletteState = { batchId: null, done: 0, total: 0, running: false, controller: null };
const paletteListeners = new Set<() => void>();

function setPaletteState(next: PaletteState) {
  paletteState = next;
  for (const l of paletteListeners) l();
}

function subscribePalette(fn: () => void) {
  paletteListeners.add(fn);
  return () => { paletteListeners.delete(fn); };
}

function startPalettePass(batchId: string, queryClient: QueryClient) {
  // If a pass is already running for this batch, do not start a duplicate.
  if (paletteState.running && paletteState.batchId === batchId) return;
  paletteState.controller?.abort();
  const controller = new AbortController();
  setPaletteState({ batchId, done: 0, total: 0, running: true, controller });
  void runPalettePass(batchId, {
    signal: controller.signal,
    queryClient,
    onProgress: (done, total) => {
      setPaletteState({ ...paletteState, batchId, done, total, running: true, controller });
    },
  })
    .catch(() => { /* surface nothing — library already usable */ })
    .finally(() => {
      setPaletteState({ ...paletteState, running: false });
    });
}
// Step 1 — Source

function SourceStep({ dispatch }: { dispatch: React.Dispatch<Action> }) {
  const [paste, setPaste] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingSource, setPendingSource] = useState<ImportSource>("goodreads");

  const onFile = async (file: File, source: ImportSource) => {
    const text = await file.text();
    const { headers, rows } = parseCsvText(text);
    if (rows.length === 0) {
      toast.error("Couldn't read any rows from that file.");
      return;
    }
    const map = detectColumnMap(headers, source);
    dispatch({ type: "loadCsv", source, headers, rows, map });
  };

  const sources: { id: ImportSource; label: string; hint: string; icon: React.ReactNode }[] = [
    { id: "goodreads", label: "Goodreads CSV", hint: "Goodreads → My Books → Import / Export → Export Library.", icon: <FileText className="h-5 w-5" /> },
    { id: "storygraph", label: "StoryGraph CSV", hint: "StoryGraph → Manage Account → Export StoryGraph Library.", icon: <FileText className="h-5 w-5" /> },
    { id: "generic", label: "Generic CSV", hint: "Any spreadsheet with a header row. You'll map the columns next.", icon: <FileUp className="h-5 w-5" /> },
  ];

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Bring an existing reading life into Unshelved. Pick a source — your file stays in this browser; only normalized title, author, and ISBN strings are sent to Open Library to fetch covers.
      </p>

      <div className="grid sm:grid-cols-3 gap-3">
        {sources.map((s) => (
          <button
            key={s.id}
            onClick={() => { setPendingSource(s.id); fileRef.current?.click(); }}
            className="text-left rounded-2xl border border-border bg-paper hover:bg-muted/50 transition p-4 flex flex-col gap-2"
          >
            <div className="flex items-center gap-2 text-forest">{s.icon}<span className="font-medium">{s.label}</span></div>
            <div className="text-xs text-muted-foreground leading-relaxed">{s.hint}</div>
          </button>
        ))}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f, pendingSource);
          e.target.value = "";
        }}
      />

      <div className="rounded-2xl border border-border bg-paper p-4">
        <div className="flex items-center gap-2 text-forest mb-2">
          <ClipboardPaste className="h-5 w-5" />
          <span className="font-medium">Paste a list</span>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          One book per line. Either <code className="font-mono">Title — Author</code> or an ISBN.
        </p>
        <Textarea
          rows={5}
          placeholder={"The Overstory — Richard Powers\n9780393635522\nPiranesi — Susanna Clarke"}
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
        />
        <div className="mt-3 flex justify-end">
          <Button
            onClick={() => {
              const rows = parsePaste(paste);
              if (!rows.length) { toast.error("Add at least one line."); return; }
              dispatch({ type: "loadPaste", rows });
            }}
            disabled={!paste.trim()}
            className="rounded-full"
          >
            Continue <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Step 2 — Field map

const MAPPABLE_FIELDS: FieldKey[] = [
  "title", "author", "isbn", "format", "status", "rating",
  "totalPages", "currentPage", "startedAt", "finishedAt", "tags", "note",
];

function MapStep({ state, dispatch }: { state: State; dispatch: React.Dispatch<Action> }) {
  const sample = state.rawRows[0] ?? {};
  const setMap = (k: FieldKey, col: string) => {
    const next = { ...state.map };
    if (col === "__none__") delete next[k];
    else next[k] = col;
    dispatch({ type: "setMap", map: next });
  };
  const next = () => {
    if (!state.map.title) { toast.error("Map at least the Title column."); return; }
    const rows = applyMap(state.rawRows, state.map, state.source ?? "generic");
    if (!rows.length) { toast.error("No rows had a usable title."); return; }
    dispatch({ type: "setRows", rows });
    dispatch({ type: "step", step: "review" });
  };

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        {state.rawRows.length} row{state.rawRows.length === 1 ? "" : "s"} detected.
        {state.source !== "generic" && " We've pre-filled the mapping — confirm or tweak below."}
      </div>
      <div className="rounded-2xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs font-mono uppercase tracking-widest text-muted-foreground">
            <tr><th className="text-left px-3 py-2 w-1/3">Unshelved field</th><th className="text-left px-3 py-2 w-1/3">Source column</th><th className="text-left px-3 py-2">Sample</th></tr>
          </thead>
          <tbody>
            {MAPPABLE_FIELDS.map((k) => (
              <tr key={k} className="border-t border-border">
                <td className="px-3 py-2">{FIELD_LABELS[k]}{k === "title" && <span className="text-destructive ml-1">*</span>}</td>
                <td className="px-3 py-2">
                  <Select value={state.map[k] ?? "__none__"} onValueChange={(v) => setMap(k, v)}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— Skip —</SelectItem>
                      {state.headers.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-3 py-2 text-muted-foreground truncate max-w-xs">
                  {state.map[k] ? (sample[state.map[k]!] ?? "") : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-between">
        <Button variant="ghost" onClick={() => dispatch({ type: "reset" })} className="rounded-full">
          <ChevronLeft className="h-4 w-4 mr-1" /> Start over
        </Button>
        <Button onClick={next} className="rounded-full">
          Preview {state.rawRows.length} rows <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Step 3 — Review

const SHELVES: { value: BookStatus; label: string }[] = [
  { value: "want", label: "Want" },
  { value: "reading", label: "Reading" },
  { value: "later", label: "Later" },
  { value: "loved", label: "Loved" },
  { value: "liked", label: "Liked" },
  { value: "meh", label: "Meh" },
  { value: "dnf", label: "DNF" },
];

function ReviewStep({ state, dispatch, onClose }: { state: State; dispatch: React.Dispatch<Action>; onClose: () => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: library = [] } = useLibrary();
  const dedupeMaps = useMemo(() => buildDedupeMaps(library), [library]);

  // Annotate duplicates once when we land here.
  const initialized = useRef(false);
  if (!initialized.current && state.rows.length) {
    initialized.current = true;
    const rows = annotateDuplicates(state.rows, dedupeMaps);
    dispatch({ type: "setRows", rows });
  }

  const [filter, setFilter] = useState<"all" | "matched" | "duplicates">("all");
  const [enriching, setEnriching] = useState(false);
  const [enrichDone, setEnrichDone] = useState(0);
  const [enrichTotal, setEnrichTotal] = useState(0);
  const [fetchCovers, setFetchCovers] = useState(true);
  const [overwritePages, setOverwritePages] = useState(false);
  const [committing, setCommitting] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const counts = useMemo(() => {
    const sel = state.rows.filter((r) => r.selected && !r.matchedBookId).length;
    const dup = state.rows.filter((r) => r.duplicate).length;
    const noMatch = state.rows.filter((r) => !r.title.trim()).length;
    return { sel, dup, noMatch, total: state.rows.length };
  }, [state.rows]);

  const visible = useMemo(() => {
    return state.rows.filter((r) => {
      if (filter === "duplicates") return r.duplicate;
      if (filter === "matched") return !!r.matchedBookId;
      return true;
    });
  }, [state.rows, filter]);

  const toggleAll = (val: boolean) => {
    dispatch({ type: "setRows", rows: state.rows.map((r) => ({ ...r, selected: val && !r.matchedBookId })) });
  };

  const runEnrich = async () => {
    setEnriching(true);
    abortRef.current = new AbortController();
    try {
      const next = await enrichRows(state.rows, {
        fetchCovers,
        overwritePages,
        signal: abortRef.current.signal,
        onProgress: (d, t) => { setEnrichDone(d); setEnrichTotal(t); },
      });
      dispatch({ type: "setRows", rows: next });
      toast.success("Lookup complete");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Lookup failed");
    } finally {
      setEnriching(false);
    }
  };

  const runCommit = async () => {
    if (!user) return;
    setCommitting(true);
    try {
      const result = await commitImport(
        state.rows,
        user.id,
        state.source ?? "generic",
        (p) => dispatch({ type: "commitProgress", inserted: p.inserted, total: p.total, skipped: p.skipped }),
      );
      qc.invalidateQueries({ queryKey: ["library"] });
      dispatch({ type: "commitDone", batchId: result.batchId, inserted: result.inserted, skipped: result.skipped });
      // Kick off palette extraction in the background. Tracker is module-level
      // so the pass keeps running even if the wizard unmounts.
      startPalettePass(result.batchId, qc);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Import failed");
      setCommitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="font-mono uppercase tracking-widest text-xs text-muted-foreground">
          {counts.sel} to import · {counts.dup} duplicate{counts.dup === 1 ? "" : "s"} · {counts.total} total
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-3">
          <FilterTabs filter={filter} setFilter={setFilter} />
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => toggleAll(true)} className="rounded-full text-xs">All</Button>
            <Button variant="ghost" size="sm" onClick={() => toggleAll(false)} className="rounded-full text-xs">None</Button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-paper p-4 flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-forest" />
          <span className="text-sm font-medium">Open Library lookup</span>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={fetchCovers} onCheckedChange={setFetchCovers} /> Fetch covers
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={overwritePages} onCheckedChange={setOverwritePages} /> Overwrite my page counts
        </label>
        <Button
          onClick={runEnrich}
          disabled={enriching}
          variant="outline"
          size="sm"
          className="rounded-full ml-auto"
        >
          {enriching ? <><Loader2 className="h-3 w-3 animate-spin mr-1" /> {enrichDone}/{enrichTotal}</> : "Run lookup"}
        </Button>
        {enriching && enrichDone < enrichTotal && (
          <Button
            onClick={() => abortRef.current?.abort()}
            variant="ghost"
            size="sm"
            className="rounded-full"
          >
            Cancel
          </Button>
        )}
      </div>

      <div className="rounded-2xl border border-border overflow-hidden">
        <div className="max-h-[50vh] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/80 backdrop-blur z-10 text-xs font-mono uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="px-2 py-2 w-8"></th>
                <th className="px-2 py-2 w-10"></th>
                <th className="px-2 py-2 text-left">Title / Author</th>
                <th className="px-2 py-2 text-left w-28">Shelf</th>
                <th className="px-2 py-2 text-left w-16">Rating</th>
                <th className="px-2 py-2 text-left w-20">Pages</th>
                <th className="px-2 py-2 text-left w-24">Match</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <ReviewRow key={r.uid} row={r} dispatch={dispatch} />
              ))}
              {visible.length === 0 && (
                <tr><td colSpan={7} className="text-center py-8 text-muted-foreground italic">No rows match this filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {committing && (
        <div className="rounded-2xl bg-paper border border-border p-4">
          <div className="flex justify-between text-sm mb-2">
            <span>Importing {state.commitInserted} / {state.commitTotal}…</span>
            <span className="text-muted-foreground">{state.commitSkipped} skipped</span>
          </div>
          <Progress value={state.commitTotal ? (state.commitInserted / state.commitTotal) * 100 : 0} />
        </div>
      )}

      <div className="flex justify-between">
        <Button variant="ghost" onClick={() => dispatch({ type: "step", step: state.source === "paste" ? "source" : "map" })} className="rounded-full" disabled={committing}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} className="rounded-full" disabled={committing}>Cancel</Button>
          <Button onClick={runCommit} disabled={committing || counts.sel === 0} className="rounded-full">
            {committing ? "Importing…" : `Import ${counts.sel} book${counts.sel === 1 ? "" : "s"}`}
          </Button>
        </div>
      </div>
    </div>
  );
}

function FilterTabs({ filter, setFilter }: { filter: "all" | "matched" | "duplicates"; setFilter: (f: "all" | "matched" | "duplicates") => void }) {
  const opts: { id: typeof filter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "duplicates", label: "Duplicates" },
    { id: "matched", label: "Matched" },
  ];
  return (
    <div className="flex rounded-full bg-muted p-0.5 text-xs">
      {opts.map((o) => (
        <button
          key={o.id}
          onClick={() => setFilter(o.id)}
          className={`px-3 py-1 rounded-full transition ${filter === o.id ? "bg-paper shadow-sm text-ink" : "text-muted-foreground hover:text-ink"}`}
        >{o.label}</button>
      ))}
    </div>
  );
}

function ReviewRow({ row, dispatch }: { row: ImportRow; dispatch: React.Dispatch<Action> }) {
  const patch = (p: Partial<ImportRow>) => dispatch({ type: "patchRow", uid: row.uid, patch: p });
  return (
    <tr className={`border-t border-border ${row.duplicate ? "bg-muted/30" : ""}`}>
      <td className="px-2 py-2">
        <Checkbox
          checked={row.selected}
          onCheckedChange={(v) => patch({ selected: !!v })}
          disabled={!!row.matchedBookId}
        />
      </td>
      <td className="px-2 py-2">
        {row.coverUrl ? (
          <img src={row.coverUrl} alt="" className="w-7 h-10 object-cover rounded shrink-0" loading="lazy" />
        ) : (
          <div className="w-7 h-10 rounded shrink-0" style={{ background: row.coverColor ?? "#1F5266" }} />
        )}
      </td>
      <td className="px-2 py-2">
        <Input value={row.title} onChange={(e) => patch({ title: e.target.value })} className="h-7 text-sm border-transparent hover:border-border focus:border-border bg-transparent px-1" />
        <Input value={row.author ?? ""} placeholder="Unknown" onChange={(e) => patch({ author: e.target.value || null })} className="h-6 text-xs text-muted-foreground border-transparent hover:border-border focus:border-border bg-transparent px-1" />
      </td>
      <td className="px-2 py-2">
        <Select value={row.status} onValueChange={(v) => patch({ status: v as BookStatus })}>
          <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>{SHELVES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
        </Select>
      </td>
      <td className="px-2 py-2">
        <Input
          type="number" min={0} max={5}
          value={row.rating ?? ""}
          onChange={(e) => patch({ rating: e.target.value === "" ? null : Number(e.target.value) })}
          className="h-7 text-xs px-1"
        />
      </td>
      <td className="px-2 py-2">
        <Input
          type="number" min={0}
          value={row.totalPages ?? ""}
          onChange={(e) => patch({ totalPages: e.target.value === "" ? null : Number(e.target.value) })}
          className="h-7 text-xs px-1"
        />
      </td>
      <td className="px-2 py-2 text-xs">
        {row.matchedBookId ? (
          <span className="inline-flex items-center gap-1 text-muted-foreground"><AlertTriangle className="h-3 w-3" /> in library</span>
        ) : row.duplicate ? (
          <span className="inline-flex items-center gap-1 text-muted-foreground"><X className="h-3 w-3" /> dup in file</span>
        ) : row.enrichTried ? (
          <span className="inline-flex items-center gap-1 text-forest"><Check className="h-3 w-3" /> looked up</span>
        ) : (
          <span className="text-muted-foreground/60">—</span>
        )}
      </td>
    </tr>
  );
}

// ────────────────────────────────────────────────────────────
// Step 4 — Done

function DoneStep({ state, onClose, dispatch }: { state: State; onClose: () => void; dispatch: React.Dispatch<Action> }) {
  const qc = useQueryClient();
  const [undoing, setUndoing] = useState(false);
  const undo = async () => {
    if (!state.batchId) return;
    setUndoing(true);
    try {
      await undoImport(state.batchId);
      qc.invalidateQueries({ queryKey: ["library"] });
      qc.invalidateQueries({ queryKey: ["import-batches"] });
      toast.success("Import undone");
      onClose();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Undo failed");
      setUndoing(false);
    }
  };
  const palette = useSyncExternalStore(subscribePalette, () => paletteState, () => paletteState);
  const showPalette = palette.batchId === state.batchId && (palette.running || palette.done > 0) && palette.total > 0;
  const palettePct = palette.total > 0 ? Math.round((palette.done / palette.total) * 100) : 0;

  return (
    <div className="text-center py-8 space-y-6">
      <div className="inline-flex h-14 w-14 rounded-full bg-forest/10 items-center justify-center mx-auto">
        <Check className="h-7 w-7 text-forest" />
      </div>
      <div>
        <h2 className="font-display text-3xl">Welcome to your library</h2>
        <p className="text-muted-foreground mt-2">
          {state.commitInserted} added · {state.commitSkipped} skipped as duplicates
        </p>
      </div>
      {showPalette && (
        <div className="max-w-md mx-auto space-y-2 text-left">
          <div className="flex items-center justify-between text-xs font-mono uppercase tracking-widest text-muted-foreground">
            <span>Extracting cover colors</span>
            <span>{palette.done}/{palette.total}</span>
          </div>
          <Progress value={palettePct} className="h-1.5" />
          {palette.running && (
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => palette.controller?.abort()}
                className="rounded-full text-xs h-7"
              >
                Skip
              </Button>
            </div>
          )}
        </div>
      )}
      <div className="flex justify-center gap-2">
        <Button variant="outline" onClick={() => dispatch({ type: "reset" })} className="rounded-full">Import more</Button>
        <Button variant="ghost" onClick={undo} disabled={undoing} className="rounded-full">
          <RotateCcw className="h-3 w-3 mr-1" /> {undoing ? "Undoing…" : "Undo this import"}
        </Button>
        <Button onClick={onClose} className="rounded-full">View library</Button>
      </div>
    </div>
  );
}
