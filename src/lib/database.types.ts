export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      bookmarks: {
        Row: {
          created_at: string
          id: string
          novel_id: string
          novel_slug: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          novel_id: string
          novel_slug: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          novel_id?: string
          novel_slug?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookmarks_novel_id_fkey"
            columns: ["novel_id"]
            isOneToOne: false
            referencedRelation: "novels"
            referencedColumns: ["id"]
          },
        ]
      }
      chapter_reading_progress: {
        Row: {
          active_seconds: number
          chapter_number: number
          completed_at: string | null
          id: string
          max_scroll_pct: number
          novel_id: string
          novel_slug: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active_seconds?: number
          chapter_number: number
          completed_at?: string | null
          id?: string
          max_scroll_pct?: number
          novel_id: string
          novel_slug: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active_seconds?: number
          chapter_number?: number
          completed_at?: string | null
          id?: string
          max_scroll_pct?: number
          novel_id?: string
          novel_slug?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chapter_reading_progress_novel_id_fkey"
            columns: ["novel_id"]
            isOneToOne: false
            referencedRelation: "novels"
            referencedColumns: ["id"]
          },
        ]
      }
      chapter_unlocks: {
        Row: {
          chapter_number: number
          coins_spent: number
          created_at: string
          hidden_from_translator: boolean
          id: string
          novel_slug: string
          translator_share: number
          user_id: string
        }
        Insert: {
          chapter_number: number
          coins_spent: number
          created_at?: string
          hidden_from_translator?: boolean
          id?: string
          novel_slug: string
          translator_share?: number
          user_id: string
        }
        Update: {
          chapter_number?: number
          coins_spent?: number
          created_at?: string
          hidden_from_translator?: boolean
          id?: string
          novel_slug?: string
          translator_share?: number
          user_id?: string
        }
        Relationships: []
      }
      chapters: {
        Row: {
          coin_cost: number
          content: string
          created_at: string
          id: string
          is_free: boolean
          is_published: boolean
          novel_id: string
          number: number
          published_at: string
          source_url: string | null
          title: string
          translator_note: string | null
          unlock_at: string | null
          updated_at: string
          use_global_translator_note: boolean
          word_count: number
        }
        Insert: {
          coin_cost?: number
          content: string
          created_at?: string
          id?: string
          is_free?: boolean
          is_published?: boolean
          novel_id: string
          number: number
          published_at?: string
          source_url?: string | null
          title: string
          translator_note?: string | null
          unlock_at?: string | null
          updated_at?: string
          use_global_translator_note?: boolean
          word_count?: number
        }
        Update: {
          coin_cost?: number
          content?: string
          created_at?: string
          id?: string
          is_free?: boolean
          is_published?: boolean
          novel_id?: string
          number?: number
          published_at?: string
          source_url?: string | null
          title?: string
          translator_note?: string | null
          unlock_at?: string | null
          updated_at?: string
          use_global_translator_note?: boolean
          word_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "chapters_novel_id_fkey"
            columns: ["novel_id"]
            isOneToOne: false
            referencedRelation: "novels"
            referencedColumns: ["id"]
          },
        ]
      }
      coin_purchases: {
        Row: {
          amount_cents: number
          coins: number
          created_at: string
          id: string
          package_id: string
          paypal_capture_id: string
          paypal_order_id: string
          user_id: string
        }
        Insert: {
          amount_cents: number
          coins: number
          created_at?: string
          id?: string
          package_id: string
          paypal_capture_id: string
          paypal_order_id: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          coins?: number
          created_at?: string
          id?: string
          package_id?: string
          paypal_capture_id?: string
          paypal_order_id?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          actor_id: string | null
          chapter_number: number | null
          comment_id: string | null
          created_at: string
          dismissed_at: string | null
          id: string
          novel_id: string | null
          read_at: string | null
          reply_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          chapter_number?: number | null
          comment_id?: string | null
          created_at?: string
          dismissed_at?: string | null
          id?: string
          novel_id?: string | null
          read_at?: string | null
          reply_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          chapter_number?: number | null
          comment_id?: string | null
          created_at?: string
          dismissed_at?: string | null
          id?: string
          novel_id?: string | null
          read_at?: string | null
          reply_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "novel_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_novel_id_fkey"
            columns: ["novel_id"]
            isOneToOne: false
            referencedRelation: "novels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_reply_id_fkey"
            columns: ["reply_id"]
            isOneToOne: false
            referencedRelation: "novel_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      novel_comment_likes: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "novel_comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "novel_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "novel_comment_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      novel_comments: {
        Row: {
          body: string
          chapter_number: number | null
          created_at: string
          id: string
          novel_id: string
          novel_slug: string
          parent_id: string | null
          rating: number | null
          updated_at: string
          user_id: string
          comment_reply_count: number | null
        }
        Insert: {
          body: string
          chapter_number?: number | null
          created_at?: string
          id?: string
          novel_id: string
          novel_slug: string
          parent_id?: string | null
          rating?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          chapter_number?: number | null
          created_at?: string
          id?: string
          novel_id?: string
          novel_slug?: string
          parent_id?: string | null
          rating?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "novel_comments_novel_id_fkey"
            columns: ["novel_id"]
            isOneToOne: false
            referencedRelation: "novels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "novel_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "novel_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "novel_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      novel_readers: {
        Row: {
          first_chapter_number: number
          id: string
          novel_id: string
          novel_slug: string
          qualified_at: string
          qualify_reason: string
          user_id: string
        }
        Insert: {
          first_chapter_number: number
          id?: string
          novel_id: string
          novel_slug: string
          qualified_at?: string
          qualify_reason: string
          user_id: string
        }
        Update: {
          first_chapter_number?: number
          id?: string
          novel_id?: string
          novel_slug?: string
          qualified_at?: string
          qualify_reason?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "novel_readers_novel_id_fkey"
            columns: ["novel_id"]
            isOneToOne: false
            referencedRelation: "novels"
            referencedColumns: ["id"]
          },
        ]
      }
      novel_view_daily: {
        Row: {
          day: string
          novel_id: string
          view_count: number
        }
        Insert: {
          day: string
          novel_id: string
          view_count?: number
        }
        Update: {
          day?: string
          novel_id?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "novel_view_daily_novel_id_fkey"
            columns: ["novel_id"]
            isOneToOne: false
            referencedRelation: "novels"
            referencedColumns: ["id"]
          },
        ]
      }
      novels: {
        Row: {
          copyright_type: string | null
          cover_url: string | null
          created_at: string
          description: string | null
          genres: string[]
          id: string
          language: string
          library_add_count: number
          novelupdates_url: string | null
          original_author: string | null
          ownership_confirmed_at: string | null
          publication_type: string
          publisher_id: string | null
          reader_count: number
          slug: string
          status: string
          tags: string[]
          title: string
          translator: string | null
          updated_at: string
          view_count: number
        }
        Insert: {
          copyright_type?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          genres?: string[]
          id?: string
          language?: string
          library_add_count?: number
          novelupdates_url?: string | null
          original_author?: string | null
          ownership_confirmed_at?: string | null
          publication_type?: string
          publisher_id?: string | null
          reader_count?: number
          slug: string
          status?: string
          tags?: string[]
          title: string
          translator?: string | null
          updated_at?: string
          view_count?: number
        }
        Update: {
          copyright_type?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          genres?: string[]
          id?: string
          language?: string
          library_add_count?: number
          novelupdates_url?: string | null
          original_author?: string | null
          ownership_confirmed_at?: string | null
          publication_type?: string
          publisher_id?: string | null
          reader_count?: number
          slug?: string
          status?: string
          tags?: string[]
          title?: string
          translator?: string | null
          updated_at?: string
          view_count?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          coins: number
          created_at: string
          id: string
          kofi_url: string | null
          patreon_url: string | null
          role: string
          translator_note: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          coins?: number
          created_at?: string
          id: string
          kofi_url?: string | null
          patreon_url?: string | null
          role?: string
          translator_note?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          coins?: number
          created_at?: string
          id?: string
          kofi_url?: string | null
          patreon_url?: string | null
          role?: string
          translator_note?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      translator_applications: {
        Row: {
          created_at: string
          discord: string
          email: string
          id: string
          message: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
          username: string
        }
        Insert: {
          created_at?: string
          discord: string
          email: string
          id?: string
          message: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
          username: string
        }
        Update: {
          created_at?: string
          discord?: string
          email?: string
          id?: string
          message?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      batch_insert_notifications: { Args: { p_rows: Json }; Returns: number }
      bulk_unlock_chapters: { Args: { p_novel_slug: string }; Returns: Json }
      credit_coins: {
        Args: {
          p_amount_cents: number
          p_coins: number
          p_package_id: string
          p_paypal_capture_id: string
          p_paypal_order_id: string
          p_user_id: string
        }
        Returns: undefined
      }
      materialize_due_chapter_releases: {
        Args: { p_user_id?: string }
        Returns: number
      }
      novel_rating_summaries: {
        Args: Record<PropertyKey, never>
        Returns: {
          average: number
          novel_slug: string
          rating_count: number
        }[]
      }
      novel_unlock_stats: {
        Args: { p_slugs: string[] }
        Returns: {
          coins_earned: number
          novel_slug: string
          purchase_count: number
        }[]
      }
      recently_updated_chapters: {
        Args: { per_novel?: number }
        Returns: {
          chapter_number: number
          chapter_title: string
          cover_url: string
          is_free: boolean
          novel_slug: string
          novel_title: string
          published_at: string
        }[]
      }
      record_novel_view: { Args: { p_novel_slug: string }; Returns: undefined }
      report_chapter_engagement: {
        Args: {
          p_active_seconds: number
          p_chapter_number: number
          p_novel_slug: string
          p_scroll_pct: number
        }
        Returns: boolean
      }
      review_translator_application: {
        Args: { p_application_id: string; p_status: string }
        Returns: undefined
      }
      set_novel_view_counts: { Args: { p_counts: Json }; Returns: undefined }
      sync_admin_emails: { Args: { p_emails: string[] }; Returns: undefined }
      unlock_chapter: {
        Args: {
          p_chapter_number: number
          p_novel_slug: string
          p_user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
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
