// Run `pnpm db:types` to regenerate from the live Supabase project.
// supabase gen types typescript --project-id nupskyzzbkjvhdhfhegv > src/lib/supabase/types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          email: string;
          email_domain: string | null;
          avatar_url: string | null;
          onboarding_complete: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          email: string;
          avatar_url?: string | null;
          onboarding_complete?: boolean;
          created_at?: string;
        };
        Update: {
          display_name?: string | null;
          avatar_url?: string | null;
          onboarding_complete?: boolean;
        };
        Relationships: [];
      };
      rooms: {
        Row: {
          id: string;
          name: string;
          invite_code: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          invite_code: string;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          name?: string;
          invite_code?: string;
        };
        Relationships: [];
      };
      room_members: {
        Row: {
          room_id: string;
          user_id: string;
          role: string;
          joined_at: string;
        };
        Insert: {
          room_id: string;
          user_id: string;
          role?: string;
          joined_at?: string;
        };
        Update: {
          role?: string;
        };
        Relationships: [];
      };
      daily_statuses: {
        Row: {
          user_id: string;
          status_date: string;
          status: Database["public"]["Enums"]["daily_status"];
          updated_at: string;
        };
        Insert: {
          user_id: string;
          status_date: string;
          status: Database["public"]["Enums"]["daily_status"];
          updated_at?: string;
        };
        Update: {
          status?: Database["public"]["Enums"]["daily_status"];
          updated_at?: string;
        };
        Relationships: [];
      };
      pinned_people: {
        Row: {
          user_id: string;
          pinned_user_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          pinned_user_id: string;
          created_at?: string;
        };
        Update: {
          [key: string]: never;
        };
        Relationships: [];
      };
      notification_preferences: {
        Row: {
          user_id: string;
          enabled: boolean;
          reminder_time: string;
          evening_cutoff_hour: number;
          tz: string;
        };
        Insert: {
          user_id: string;
          enabled?: boolean;
          reminder_time?: string;
          evening_cutoff_hour?: number;
          tz?: string;
        };
        Update: {
          enabled?: boolean;
          reminder_time?: string;
          evening_cutoff_hour?: number;
          tz?: string;
        };
        Relationships: [];
      };
      push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth_key: string;
          user_agent: string | null;
          created_at: string;
          last_seen_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth_key: string;
          user_agent?: string | null;
          created_at?: string;
          last_seen_at?: string;
        };
        Update: {
          last_seen_at?: string;
          user_agent?: string | null;
        };
        Relationships: [];
      };
      notification_deliveries: {
        Row: {
          id: string;
          user_id: string;
          kind: string;
          target_date: string;
          sent_at: string;
          status: string;
          error: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          kind: string;
          target_date: string;
          sent_at?: string;
          status: string;
          error?: string | null;
        };
        Update: {
          status?: string;
          error?: string | null;
        };
        Relationships: [];
      };
      allowed_email_domains: {
        Row: {
          domain: string;
          added_at: string;
        };
        Insert: {
          domain: string;
          added_at?: string;
        };
        Update: {
          [key: string]: never;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_home_summary: {
        Args: { p_target_date: string };
        Returns: Json;
      };
      get_room_detail: {
        Args: { p_room_id: string; p_target_date: string };
        Returns: Json;
      };
      create_room: {
        Args: { p_name: string };
        Returns: Json;
      };
      accept_invite: {
        Args: { p_code: string };
        Returns: Json;
      };
      shares_room_with: {
        Args: { other: string };
        Returns: boolean;
      };
      generate_invite_code: {
        Args: Record<string, never>;
        Returns: string;
      };
    };
    Enums: {
      daily_status: "going" | "wfh" | "maybe" | "undecided";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type PublicSchema = Database[Extract<keyof Database, "public">];

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    ? (PublicSchema["Tables"] & PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never;
