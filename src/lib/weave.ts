import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import type { Database } from "@/integrations/supabase/types";

export type ConnectionKind = Database["public"]["Enums"]["connection_kind"];
export type Connection = Database["public"]["Tables"]["connections"]["Row"];
export type ReferenceBook = Database["public"]["Tables"]["reference_books"]["Row"];

export function useReferenceBooks() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["reference_books", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reference_books")
        .select("*")
        .order("title");
      if (error) throw error;
      return (data ?? []) as ReferenceBook[];
    },
  });
}

export function useAllConnections() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["connections", "all", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("connections")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Connection[];
    },
  });
}

export function useBookConnections(bookId: string, highlightIds: string[], noteIds: string[]) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["connections", "book", bookId, highlightIds.length, noteIds.length, user?.id],
    enabled: !!user && !!bookId,
    queryFn: async () => {
      const ids = [bookId, ...highlightIds, ...noteIds];
      const orFilter = ids.map(id => `source_id.eq.${id},target_id.eq.${id}`).join(",");
      const { data, error } = await supabase
        .from("connections")
        .select("*")
        .or(orFilter)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Connection[];
    },
  });
}

export function useCreateConnection() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      source_kind: ConnectionKind; source_id: string;
      target_kind: ConnectionKind; target_id: string;
      why?: string | null; tags?: string[];
    }) => {
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase.from("connections").insert({
        user_id: user.id, ...input,
        tags: input.tags ?? [],
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["connections"] }),
  });
}

export function useUpdateConnection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, why, tags, target_kind, target_id }: {
      id: string;
      why?: string | null;
      tags?: string[];
      target_kind?: ConnectionKind;
      target_id?: string;
    }) => {
      const patch: Record<string, unknown> = {};
      if (why !== undefined) patch.why = why;
      if (tags !== undefined) patch.tags = tags;
      if (target_kind !== undefined) patch.target_kind = target_kind;
      if (target_id !== undefined) patch.target_id = target_id;
      const { error } = await supabase.from("connections").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["connections"] }),
  });
}

export function useDeleteConnection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("connections").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["connections"] }),
  });
}

export function useCreateReferenceBook() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ title, author }: { title: string; author?: string | null }) => {
      if (!user) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("reference_books")
        .insert({ user_id: user.id, title, author: author ?? null })
        .select()
        .single();
      if (error) throw error;
      return data as ReferenceBook;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reference_books"] }),
  });
}
