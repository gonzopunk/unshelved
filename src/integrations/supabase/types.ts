export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      book_axis_values: {
        Row: {
          axis_id: string
          book_id: string
          id: string
          scale_value: number | null
          updated_at: string
          user_id: string
          values: string[]
        }
        Insert: {
          axis_id: string
          book_id: string
          id?: string
          scale_value?: number | null
          updated_at?: string
          user_id: string
          values?: string[]
        }
        Update: {
          axis_id?: string
          book_id?: string
          id?: string
          scale_value?: number | null
          updated_at?: string
          user_id?: string
          values?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "book_axis_values_axis_id_fkey"
            columns: ["axis_id"]
            isOneToOne: false
            referencedRelation: "tag_axes"
            referencedColumns: ["id"]
          },
        ]
      }
      book_tags: {
        Row: {
          book_id: string
          created_at: string
          tag_id: string
          user_id: string
        }
        Insert: {
          book_id: string
          created_at?: string
          tag_id: string
          user_id: string
        }
        Update: {
          book_id?: string
          created_at?: string
          tag_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      books: {
        Row: {
          author: string | null
          bookmark_color: string
          cover_color: string
          cover_generic: boolean
          cover_secondary_color: string | null
          cover_text_color: string
          cover_url: string | null
          created_at: string
          format: Database["public"]["Enums"]["book_format"]
          id: string
          import_batch_id: string | null
          is_sample: boolean
          title: string
          user_id: string
        }
        Insert: {
          author?: string | null
          bookmark_color?: string
          cover_color?: string
          cover_generic?: boolean
          cover_secondary_color?: string | null
          cover_text_color?: string
          cover_url?: string | null
          created_at?: string
          format?: Database["public"]["Enums"]["book_format"]
          id?: string
          import_batch_id?: string | null
          is_sample?: boolean
          title: string
          user_id: string
        }
        Update: {
          author?: string | null
          bookmark_color?: string
          cover_color?: string
          cover_generic?: boolean
          cover_secondary_color?: string | null
          cover_text_color?: string
          cover_url?: string | null
          created_at?: string
          format?: Database["public"]["Enums"]["book_format"]
          id?: string
          import_batch_id?: string | null
          is_sample?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      connections: {
        Row: {
          created_at: string
          id: string
          is_sample: boolean
          source_id: string
          source_kind: Database["public"]["Enums"]["connection_kind"]
          tags: string[]
          target_id: string
          target_kind: Database["public"]["Enums"]["connection_kind"]
          user_id: string
          why: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_sample?: boolean
          source_id: string
          source_kind: Database["public"]["Enums"]["connection_kind"]
          tags?: string[]
          target_id: string
          target_kind: Database["public"]["Enums"]["connection_kind"]
          user_id: string
          why?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_sample?: boolean
          source_id?: string
          source_kind?: Database["public"]["Enums"]["connection_kind"]
          tags?: string[]
          target_id?: string
          target_kind?: Database["public"]["Enums"]["connection_kind"]
          user_id?: string
          why?: string | null
        }
        Relationships: []
      }
      highlights: {
        Row: {
          book_id: string
          created_at: string
          id: string
          is_sample: boolean
          page_number: number | null
          quote_text: string
          user_id: string
        }
        Insert: {
          book_id: string
          created_at?: string
          id?: string
          is_sample?: boolean
          page_number?: number | null
          quote_text: string
          user_id: string
        }
        Update: {
          book_id?: string
          created_at?: string
          id?: string
          is_sample?: boolean
          page_number?: number | null
          quote_text?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "highlights_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      import_batches: {
        Row: {
          created_at: string
          id: string
          row_count: number
          source: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          row_count?: number
          source: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          row_count?: number
          source?: string
          user_id?: string
        }
        Relationships: []
      }
      notes: {
        Row: {
          book_id: string
          content: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          book_id: string
          content: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          book_id?: string
          content?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          yearly_goal: number
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          yearly_goal?: number
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          yearly_goal?: number
        }
        Relationships: []
      }
      reading_sessions: {
        Row: {
          book_id: string
          end_page: number | null
          end_pct: number | null
          end_seconds: number | null
          ended_at: string | null
          id: string
          location: string | null
          minutes: number | null
          mood: string | null
          pages_read: number | null
          session_note: string | null
          start_page: number | null
          start_pct: number | null
          start_seconds: number | null
          started_at: string
          user_id: string
        }
        Insert: {
          book_id: string
          end_page?: number | null
          end_pct?: number | null
          end_seconds?: number | null
          ended_at?: string | null
          id?: string
          location?: string | null
          minutes?: number | null
          mood?: string | null
          pages_read?: number | null
          session_note?: string | null
          start_page?: number | null
          start_pct?: number | null
          start_seconds?: number | null
          started_at?: string
          user_id: string
        }
        Update: {
          book_id?: string
          end_page?: number | null
          end_pct?: number | null
          end_seconds?: number | null
          ended_at?: string | null
          id?: string
          location?: string | null
          minutes?: number | null
          mood?: string | null
          pages_read?: number | null
          session_note?: string | null
          start_page?: number | null
          start_pct?: number | null
          start_seconds?: number | null
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reading_sessions_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      reference_books: {
        Row: {
          author: string | null
          created_at: string
          id: string
          is_sample: boolean
          title: string
          user_id: string
        }
        Insert: {
          author?: string | null
          created_at?: string
          id?: string
          is_sample?: boolean
          title: string
          user_id: string
        }
        Update: {
          author?: string | null
          created_at?: string
          id?: string
          is_sample?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      tag_axes: {
        Row: {
          built_in: boolean
          created_at: string
          hidden: boolean
          id: string
          key: string
          kind: string
          label: string
          open: boolean
          position: number
          scale_max: number | null
          scale_min: number | null
          user_id: string
          values: string[]
        }
        Insert: {
          built_in?: boolean
          created_at?: string
          hidden?: boolean
          id?: string
          key: string
          kind: string
          label: string
          open?: boolean
          position?: number
          scale_max?: number | null
          scale_min?: number | null
          user_id: string
          values?: string[]
        }
        Update: {
          built_in?: boolean
          created_at?: string
          hidden?: boolean
          id?: string
          key?: string
          kind?: string
          label?: string
          open?: boolean
          position?: number
          scale_max?: number | null
          scale_min?: number | null
          user_id?: string
          values?: string[]
        }
        Relationships: []
      }
      tags: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          use_count: number
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          use_count?: number
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          use_count?: number
          user_id?: string
        }
        Relationships: []
      }
      user_books: {
        Row: {
          board_position: number
          book_id: string
          current_page: number | null
          current_seconds: number | null
          finished_at: string | null
          id: string
          import_batch_id: string | null
          note: string | null
          paused: boolean
          progress_pct: number | null
          rating: number | null
          started_at: string | null
          status: Database["public"]["Enums"]["book_status"]
          total_pages: number | null
          total_seconds: number | null
          user_id: string
        }
        Insert: {
          board_position?: number
          book_id: string
          current_page?: number | null
          current_seconds?: number | null
          finished_at?: string | null
          id?: string
          import_batch_id?: string | null
          note?: string | null
          paused?: boolean
          progress_pct?: number | null
          rating?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["book_status"]
          total_pages?: number | null
          total_seconds?: number | null
          user_id: string
        }
        Update: {
          board_position?: number
          book_id?: string
          current_page?: number | null
          current_seconds?: number | null
          finished_at?: string | null
          id?: string
          import_batch_id?: string | null
          note?: string | null
          paused?: boolean
          progress_pct?: number | null
          rating?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["book_status"]
          total_pages?: number | null
          total_seconds?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_books_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      seed_tag_axes: { Args: { _user_id: string }; Returns: undefined }
    }
    Enums: {
      book_format: "print" | "ebook" | "audiobook"
      book_status:
        | "want"
        | "reading"
        | "later"
        | "dnf"
        | "loved"
        | "liked"
        | "meh"
      connection_kind: "book" | "reference_book" | "highlight" | "note"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      book_format: ["print", "ebook", "audiobook"],
      book_status: ["want", "reading", "later", "dnf", "loved", "liked", "meh"],
      connection_kind: ["book", "reference_book", "highlight", "note"],
    },
  },
} as const
