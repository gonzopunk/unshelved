import { supabase } from "@/integrations/supabase/client";
import type { ImportRow, ImportSource } from "./types";

const DEFAULT_COVER = {
  color: "#1F5266",
  text: "#FAFBF3",
  bookmark: "#D17648",
};

const chunk = <T,>(arr: T[], n: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
};

export type CommitProgress = {
  inserted: number;
  total: number;
  skipped: number;
};

export type CommitResult = {
  batchId: string;
  inserted: number;
  skipped: number;
};

/** Insert selected rows in batches. Skips duplicates that already match an existing book. */
export async function commitImport(
  rows: ImportRow[],
  userId: string,
  source: ImportSource,
  onProgress?: (p: CommitProgress) => void,
): Promise<CommitResult> {
  const selected = rows.filter((r) => r.selected && r.title.trim() && !r.matchedBookId);
  const skipped = rows.filter((r) => r.selected && r.matchedBookId).length;

  // 1) batch row
  const { data: batch, error: batchErr } = await supabase
    .from("import_batches")
    .insert({ user_id: userId, source, row_count: selected.length })
    .select()
    .single();
  if (batchErr) throw batchErr;
  const batchId = batch.id;

  let inserted = 0;
  const total = selected.length;
  onProgress?.({ inserted, total, skipped });

  for (const group of chunk(selected, 50)) {
    const bookPayloads = group.map((r) => ({
      user_id: userId,
      title: r.title,
      author: r.author,
      format: r.format,
      cover_color: r.coverColor ?? DEFAULT_COVER.color,
      cover_text_color: r.coverTextColor ?? DEFAULT_COVER.text,
      bookmark_color: r.bookmarkColor ?? DEFAULT_COVER.bookmark,
      cover_secondary_color: r.coverSecondaryColor,
      cover_url: r.coverUrl,
      cover_generic: !r.coverUrl,
      publication_year: r.publicationYear ?? null,
      publisher: r.publisher ?? null,
      isbn: r.isbn ?? null,
      description: r.description ?? null,
      import_batch_id: batchId,
    }));
    const { data: books, error: bErr } = await supabase
      .from("books")
      .insert(bookPayloads)
      .select("id");
    if (bErr) throw bErr;

    const ubPayloads = (books ?? []).map((b, i) => {
      const r = group[i];
      const ratingInt = r.rating != null && r.rating > 0 ? Math.round(r.rating) : null;
      return {
        user_id: userId,
        book_id: b.id,
        status: r.status,
        current_page: r.currentPage ?? 0,
        total_pages: r.totalPages,
        progress_pct: r.totalPages && r.currentPage
          ? Math.round((r.currentPage / r.totalPages) * 100)
          : (r.status === "loved" || r.status === "liked" || r.status === "meh") ? 100 : 0,
        started_at: r.startedAt,
        finished_at: r.finishedAt,
        rating: ratingInt,
        note: r.note,
        import_batch_id: batchId,
      };
    });
    const { error: ubErr } = await supabase.from("user_books").insert(ubPayloads);
    if (ubErr) throw ubErr;

    inserted += group.length;
    onProgress?.({ inserted, total, skipped });
  }

  return { batchId, inserted, skipped };
}

export async function undoImport(batchId: string): Promise<void> {
  // Order matters: user_books → books → batch row.
  const { error: ubErr } = await supabase.from("user_books").delete().eq("import_batch_id", batchId);
  if (ubErr) throw ubErr;
  const { error: bErr } = await supabase.from("books").delete().eq("import_batch_id", batchId);
  if (bErr) throw bErr;
  const { error: batchErr } = await supabase.from("import_batches").delete().eq("id", batchId);
  if (batchErr) throw batchErr;
}
