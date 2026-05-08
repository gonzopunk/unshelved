import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import type { Database } from "@/integrations/supabase/types";

export type TagAxis = Database["public"]["Tables"]["tag_axes"]["Row"];
export type BookAxisValue = Database["public"]["Tables"]["book_axis_values"]["Row"];
export type Tag = Database["public"]["Tables"]["tags"]["Row"];
export type BookTag = Database["public"]["Tables"]["book_tags"]["Row"];

export function useTagAxes() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["tag_axes", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tag_axes")
        .select("*")
        .order("position");
      if (error) throw error;
      return (data ?? []) as TagAxis[];
    },
  });
}

export function useBookAxisValues(bookId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["book_axis_values", bookId, user?.id],
    enabled: !!user && !!bookId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("book_axis_values")
        .select("*")
        .eq("book_id", bookId);
      if (error) throw error;
      return (data ?? []) as BookAxisValue[];
    },
  });
}

export function useTags() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["tags", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tags")
        .select("*")
        .order("use_count", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Tag[];
    },
  });
}

export function useBookTags(bookId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["book_tags", bookId, user?.id],
    enabled: !!user && !!bookId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("book_tags")
        .select("tag_id, tags(*)")
        .eq("book_id", bookId);
      if (error) throw error;
      return (data ?? []).map((row) => row.tags as Tag).filter(Boolean);
    },
  });
}

export function useSetAxisValue() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      book_id: string;
      axis_id: string;
      scale_value?: number | null;
      values?: string[];
    }) => {
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase
        .from("book_axis_values")
        .upsert(
          {
            user_id: user.id,
            book_id: input.book_id,
            axis_id: input.axis_id,
            scale_value: input.scale_value ?? null,
            values: input.values ?? [],
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,book_id,axis_id" },
        );
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["book_axis_values", vars.book_id] });
    },
  });
}

export function useClearAxisValue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ book_id, axis_id }: { book_id: string; axis_id: string }) => {
      const { error } = await supabase
        .from("book_axis_values")
        .delete()
        .eq("book_id", book_id)
        .eq("axis_id", axis_id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["book_axis_values", vars.book_id] });
    },
  });
}

/** Add a free tag to a book by name (creates it if missing). */
export function useAddBookTag() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ book_id, name }: { book_id: string; name: string }) => {
      if (!user) throw new Error("Not signed in");
      const clean = name.trim().toLowerCase();
      if (!clean) return;
      // Find or create tag
      const existing = await supabase
        .from("tags")
        .select("*")
        .eq("name", clean)
        .maybeSingle();
      let tag = existing.data as Tag | null;
      if (!tag) {
        const created = await supabase
          .from("tags")
          .insert({ user_id: user.id, name: clean })
          .select()
          .single();
        if (created.error) throw created.error;
        tag = created.data as Tag;
      }
      const { error } = await supabase
        .from("book_tags")
        .upsert(
          { user_id: user.id, book_id, tag_id: tag.id },
          { onConflict: "book_id,tag_id" },
        );
      if (error) throw error;
      // Bump use_count
      await supabase
        .from("tags")
        .update({ use_count: (tag.use_count ?? 0) + 1 })
        .eq("id", tag.id);
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["book_tags", vars.book_id] });
      qc.invalidateQueries({ queryKey: ["tags"] });
    },
  });
}

export function useRemoveBookTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ book_id, tag_id }: { book_id: string; tag_id: string }) => {
      const { error } = await supabase
        .from("book_tags")
        .delete()
        .eq("book_id", book_id)
        .eq("tag_id", tag_id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["book_tags", vars.book_id] });
      qc.invalidateQueries({ queryKey: ["tags"] });
    },
  });
}
