import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import type { Database } from "@/integrations/supabase/types";

export type Book = Database["public"]["Tables"]["books"]["Row"];
export type UserBook = Database["public"]["Tables"]["user_books"]["Row"];
export type BookStatus = Database["public"]["Enums"]["book_status"];
export type BookFormat = Database["public"]["Enums"]["book_format"];

export type BookWithShelf = Book & { user_books: UserBook[] };

export function useLibrary() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["library", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("books")
        .select("*, user_books(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as BookWithShelf[];
    },
  });
}

export function useProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user!.id).single();
      if (error) throw error;
      return data;
    },
  });
}

export function useBookDetail(bookId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["book", bookId, user?.id],
    enabled: !!user && !!bookId,
    queryFn: async () => {
      const [book, ub, sessions, notes, highlights] = await Promise.all([
        supabase.from("books").select("*").eq("id", bookId).single(),
        supabase.from("user_books").select("*").eq("book_id", bookId).maybeSingle(),
        supabase.from("reading_sessions").select("*").eq("book_id", bookId).order("started_at", { ascending: false }),
        supabase.from("notes").select("*").eq("book_id", bookId).order("created_at", { ascending: false }),
        supabase.from("highlights").select("*").eq("book_id", bookId).order("created_at", { ascending: false }),
      ]);
      if (book.error) throw book.error;
      return {
        book: book.data,
        userBook: ub.data,
        sessions: sessions.data ?? [],
        notes: notes.data ?? [],
        highlights: highlights.data ?? [],
      };
    },
  });
}

export function useUpdateStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, board_position }: { id: string; status: BookStatus; board_position?: number }) => {
      const patch: Record<string, unknown> = { status };
      if (board_position !== undefined) patch.board_position = board_position;
      if (status === "loved" || status === "liked" || status === "meh" || status === "dnf") {
        patch.finished_at = new Date().toISOString();
        if (status === "loved") patch.rating = 5;
        if (status === "liked") patch.rating = 4;
        if (status === "meh") patch.rating = 2;
      }
      if (status === "reading") patch.started_at = new Date().toISOString();
      const { error } = await supabase.from("user_books").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["library"] });
      qc.invalidateQueries({ queryKey: ["book"] });
    },
  });
}

export function useUpdateProgress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, current_page, total_pages, progress_pct, current_seconds, total_seconds, paused }: {
      id: string;
      current_page?: number; total_pages?: number; progress_pct?: number;
      current_seconds?: number; total_seconds?: number; paused?: boolean;
    }) => {
      const patch: Record<string, unknown> = {};
      if (current_page !== undefined) patch.current_page = current_page;
      if (total_pages !== undefined) patch.total_pages = total_pages;
      if (progress_pct !== undefined) patch.progress_pct = progress_pct;
      if (current_seconds !== undefined) patch.current_seconds = current_seconds;
      if (total_seconds !== undefined) patch.total_seconds = total_seconds;
      if (paused !== undefined) patch.paused = paused;
      const { error } = await supabase.from("user_books").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["library"] });
      qc.invalidateQueries({ queryKey: ["book"] });
    },
  });
}
