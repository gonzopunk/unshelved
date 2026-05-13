// Post-commit palette extraction pass.
// Reads books for an import batch, extracts cover palettes off the
// import-critical path, and updates rows one chunk at a time so the
// Library can light up live as colors arrive. Independent of any
// component lifecycle — once started, runs to completion or abort.

import { supabase } from "@/integrations/supabase/client";
import { extractCoverPalette } from "@/lib/palette";
import type { QueryClient } from "@tanstack/react-query";

type Options = {
  signal?: AbortSignal;
  onProgress?: (done: number, total: number) => void;
  queryClient?: QueryClient;
};

const chunk = <T,>(arr: T[], n: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
};

export async function runPalettePass(batchId: string, options: Options = {}): Promise<void> {
  const { signal, onProgress, queryClient } = options;

  const { data: books, error } = await supabase
    .from("books")
    .select("id, cover_url")
    .eq("import_batch_id", batchId)
    .not("cover_url", "is", null);

  if (error) throw error;

  const targets = (books ?? []).filter(
    (b): b is { id: string; cover_url: string } => typeof b.cover_url === "string" && b.cover_url.length > 0,
  );
  const total = targets.length;
  let done = 0;
  onProgress?.(done, total);
  if (total === 0) return;

  for (const group of chunk(targets, 10)) {
    if (signal?.aborted) return;

    const updatedIds: string[] = [];

    await Promise.all(
      group.map(async (b) => {
        try {
          const pal = await extractCoverPalette(b.cover_url);
          if (!pal) return;
          const { error: upErr } = await supabase
            .from("books")
            .update({
              cover_color: pal.dominant,
              cover_text_color: pal.text,
              bookmark_color: pal.bookmark,
              cover_secondary_color: pal.secondary,
              cover_generic: false,
            })
            .eq("id", b.id);
          if (!upErr) updatedIds.push(b.id);
        } catch {
          // Silent skip — book keeps its DEFAULT_COVER values.
        }
      }),
    );

    done += group.length;

    if (queryClient) {
      queryClient.invalidateQueries({ queryKey: ["library"] });
      for (const id of updatedIds) {
        queryClient.invalidateQueries({ queryKey: ["book", id] });
      }
    }

    onProgress?.(done, total);
  }
}
