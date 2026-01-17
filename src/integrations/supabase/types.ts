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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      analytics_cache: {
        Row: {
          computed_at: string
          expires_at: string | null
          geo_zone: string | null
          id: string
          metric_name: string
          metric_value: Json
          period_end: string | null
          period_start: string | null
        }
        Insert: {
          computed_at?: string
          expires_at?: string | null
          geo_zone?: string | null
          id?: string
          metric_name: string
          metric_value: Json
          period_end?: string | null
          period_start?: string | null
        }
        Update: {
          computed_at?: string
          expires_at?: string | null
          geo_zone?: string | null
          id?: string
          metric_name?: string
          metric_value?: Json
          period_end?: string | null
          period_start?: string | null
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor_email: string | null
          actor_role: string
          actor_user_id: string | null
          created_at: string
          entity: string
          entity_id: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          new_values: Json | null
          old_values: Json | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_role?: string
          actor_user_id?: string | null
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_role?: string
          actor_user_id?: string | null
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
        }
        Relationships: []
      }
      authors: {
        Row: {
          avatar_url: string | null
          bio_en: string | null
          bio_fr: string | null
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          social_linkedin: string | null
          social_twitter: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio_en?: string | null
          bio_fr?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          social_linkedin?: string | null
          social_twitter?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio_en?: string | null
          bio_fr?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          social_linkedin?: string | null
          social_twitter?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          auto_rules: Json | null
          created_at: string
          created_by: string | null
          description_en: string | null
          description_fr: string | null
          display_order: number | null
          id: string
          is_visible: boolean | null
          name_en: string
          name_fr: string
          pinned_event_ids: string[] | null
          slug: string
          status: Database["public"]["Enums"]["content_status"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          auto_rules?: Json | null
          created_at?: string
          created_by?: string | null
          description_en?: string | null
          description_fr?: string | null
          display_order?: number | null
          id?: string
          is_visible?: boolean | null
          name_en: string
          name_fr: string
          pinned_event_ids?: string[] | null
          slug: string
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          auto_rules?: Json | null
          created_at?: string
          created_by?: string | null
          description_en?: string | null
          description_fr?: string | null
          display_order?: number | null
          id?: string
          is_visible?: boolean | null
          name_en?: string
          name_fr?: string
          pinned_event_ids?: string[] | null
          slug?: string
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      event_pricing: {
        Row: {
          computation_date: string | null
          computed_price: number | null
          computed_tier: Database["public"]["Enums"]["pricing_tier"] | null
          created_at: string
          event_id: string
          id: string
          is_manual_override: boolean | null
          manual_price: number | null
          manual_tier: Database["public"]["Enums"]["pricing_tier"] | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          computation_date?: string | null
          computed_price?: number | null
          computed_tier?: Database["public"]["Enums"]["pricing_tier"] | null
          created_at?: string
          event_id: string
          id?: string
          is_manual_override?: boolean | null
          manual_price?: number | null
          manual_tier?: Database["public"]["Enums"]["pricing_tier"] | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          computation_date?: string | null
          computed_price?: number | null
          computed_tier?: Database["public"]["Enums"]["pricing_tier"] | null
          created_at?: string
          event_id?: string
          id?: string
          is_manual_override?: boolean | null
          manual_price?: number | null
          manual_tier?: Database["public"]["Enums"]["pricing_tier"] | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_pricing_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_pricing_history: {
        Row: {
          change_type: string | null
          changed_by: string | null
          created_at: string
          event_pricing_id: string
          id: string
          new_price: number | null
          new_tier: Database["public"]["Enums"]["pricing_tier"] | null
          previous_price: number | null
          previous_tier: Database["public"]["Enums"]["pricing_tier"] | null
        }
        Insert: {
          change_type?: string | null
          changed_by?: string | null
          created_at?: string
          event_pricing_id: string
          id?: string
          new_price?: number | null
          new_tier?: Database["public"]["Enums"]["pricing_tier"] | null
          previous_price?: number | null
          previous_tier?: Database["public"]["Enums"]["pricing_tier"] | null
        }
        Update: {
          change_type?: string | null
          changed_by?: string | null
          created_at?: string
          event_pricing_id?: string
          id?: string
          new_price?: number | null
          new_tier?: Database["public"]["Enums"]["pricing_tier"] | null
          previous_price?: number | null
          previous_tier?: Database["public"]["Enums"]["pricing_tier"] | null
        }
        Relationships: [
          {
            foreignKeyName: "event_pricing_history_event_pricing_id_fkey"
            columns: ["event_pricing_id"]
            isOneToOne: false
            referencedRelation: "event_pricing"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          allowed_countries: string[] | null
          api_description: string | null
          api_image_url: string | null
          api_title: string | null
          away_team: string | null
          blocked_countries: string[] | null
          created_at: string
          created_by: string | null
          event_date: string
          external_id: string | null
          home_team: string | null
          id: string
          is_live: boolean | null
          is_pinned: boolean | null
          league: string | null
          override_description: string | null
          override_image_url: string | null
          override_title: string | null
          published_at: string | null
          sport: string
          status: Database["public"]["Enums"]["content_status"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          allowed_countries?: string[] | null
          api_description?: string | null
          api_image_url?: string | null
          api_title?: string | null
          away_team?: string | null
          blocked_countries?: string[] | null
          created_at?: string
          created_by?: string | null
          event_date: string
          external_id?: string | null
          home_team?: string | null
          id?: string
          is_live?: boolean | null
          is_pinned?: boolean | null
          league?: string | null
          override_description?: string | null
          override_image_url?: string | null
          override_title?: string | null
          published_at?: string | null
          sport: string
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          allowed_countries?: string[] | null
          api_description?: string | null
          api_image_url?: string | null
          api_title?: string | null
          away_team?: string | null
          blocked_countries?: string[] | null
          created_at?: string
          created_by?: string | null
          event_date?: string
          external_id?: string | null
          home_team?: string | null
          id?: string
          is_live?: boolean | null
          is_pinned?: boolean | null
          league?: string | null
          override_description?: string | null
          override_image_url?: string | null
          override_title?: string | null
          published_at?: string | null
          sport?: string
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      originals: {
        Row: {
          author_id: string | null
          category_ids: string[] | null
          content_en: string | null
          content_fr: string | null
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          duration_seconds: number | null
          excerpt_en: string | null
          excerpt_fr: string | null
          id: string
          media_url: string | null
          meta_description: string | null
          meta_title: string | null
          published_at: string | null
          related_event_ids: string[] | null
          slug: string | null
          status: Database["public"]["Enums"]["content_status"]
          title_en: string | null
          title_fr: string
          type: Database["public"]["Enums"]["original_type"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          author_id?: string | null
          category_ids?: string[] | null
          content_en?: string | null
          content_fr?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          duration_seconds?: number | null
          excerpt_en?: string | null
          excerpt_fr?: string | null
          id?: string
          media_url?: string | null
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          related_event_ids?: string[] | null
          slug?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          title_en?: string | null
          title_fr: string
          type: Database["public"]["Enums"]["original_type"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          author_id?: string | null
          category_ids?: string[] | null
          content_en?: string | null
          content_fr?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          duration_seconds?: number | null
          excerpt_en?: string | null
          excerpt_fr?: string | null
          id?: string
          media_url?: string | null
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          related_event_ids?: string[] | null
          slug?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          title_en?: string | null
          title_fr?: string
          type?: Database["public"]["Enums"]["original_type"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "originals_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "authors"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_config: {
        Row: {
          base_price: number
          created_at: string | null
          id: string
          max_price: number
          min_price: number
          tier: Database["public"]["Enums"]["pricing_tier"]
          updated_at: string | null
        }
        Insert: {
          base_price?: number
          created_at?: string | null
          id?: string
          max_price?: number
          min_price?: number
          tier: Database["public"]["Enums"]["pricing_tier"]
          updated_at?: string | null
        }
        Update: {
          base_price?: number
          created_at?: string | null
          id?: string
          max_price?: number
          min_price?: number
          tier?: Database["public"]["Enums"]["pricing_tier"]
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          preferred_language: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          preferred_language?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          preferred_language?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["admin_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["admin_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["admin_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      workflow_runs: {
        Row: {
          created_at: string
          duration_ms: number | null
          error_message: string | null
          finished_at: string | null
          id: string
          input_data: Json | null
          output_data: Json | null
          started_at: string | null
          status: Database["public"]["Enums"]["workflow_status"]
          triggered_by: string | null
          workflow_name: string
          workflow_type: string | null
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          input_data?: Json | null
          output_data?: Json | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["workflow_status"]
          triggered_by?: string | null
          workflow_name: string
          workflow_type?: string | null
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          input_data?: Json | null
          output_data?: Json | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["workflow_status"]
          triggered_by?: string | null
          workflow_name?: string
          workflow_type?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["admin_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["admin_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      remove_event_from_pinned: {
        Args: { _event_id: string }
        Returns: undefined
      }
    }
    Enums: {
      admin_role: "owner" | "admin" | "editor" | "support"
      content_status: "draft" | "published" | "archived"
      original_type: "article" | "podcast" | "emission"
      pricing_tier: "gold" | "silver" | "bronze"
      workflow_status: "pending" | "running" | "success" | "failed"
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
      admin_role: ["owner", "admin", "editor", "support"],
      content_status: ["draft", "published", "archived"],
      original_type: ["article", "podcast", "emission"],
      pricing_tier: ["gold", "silver", "bronze"],
      workflow_status: ["pending", "running", "success", "failed"],
    },
  },
} as const
