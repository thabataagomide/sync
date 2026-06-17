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
      achievements: {
        Row: {
          code: string
          description: string | null
          icon: string | null
          id: string
          rarity: string
          title: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          code: string
          description?: string | null
          icon?: string | null
          id?: string
          rarity?: string
          title: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          code?: string
          description?: string | null
          icon?: string | null
          id?: string
          rarity?: string
          title?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: []
      }
      books: {
        Row: {
          author: string | null
          cover_url: string | null
          created_at: string
          id: string
          rating: number | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          author?: string | null
          cover_url?: string | null
          created_at?: string
          id?: string
          rating?: number | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          author?: string | null
          cover_url?: string | null
          created_at?: string
          id?: string
          rating?: number | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          color: string
          created_at: string
          icon: string | null
          id: string
          name: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          all_day: boolean | null
          category: string | null
          color: string | null
          created_at: string
          description: string | null
          ends_at: string
          guests: string[] | null
          id: string
          location: string | null
          priority: string | null
          recurrence: Json | null
          reminder_minutes: number | null
          starts_at: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          all_day?: boolean | null
          category?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          ends_at: string
          guests?: string[] | null
          id?: string
          location?: string | null
          priority?: string | null
          recurrence?: Json | null
          reminder_minutes?: number | null
          starts_at: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          all_day?: boolean | null
          category?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string
          guests?: string[] | null
          id?: string
          location?: string | null
          priority?: string | null
          recurrence?: Json | null
          reminder_minutes?: number | null
          starts_at?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      focus_presets: {
        Row: {
          break_minutes: number
          created_at: string
          duration_minutes: number
          id: string
          mode: string
          name: string
          related_habit_ids: string[] | null
          user_id: string
        }
        Insert: {
          break_minutes?: number
          created_at?: string
          duration_minutes?: number
          id?: string
          mode?: string
          name: string
          related_habit_ids?: string[] | null
          user_id: string
        }
        Update: {
          break_minutes?: number
          created_at?: string
          duration_minutes?: number
          id?: string
          mode?: string
          name?: string
          related_habit_ids?: string[] | null
          user_id?: string
        }
        Relationships: []
      }
      focus_sessions: {
        Row: {
          completed: boolean
          duration_minutes: number
          ended_at: string | null
          id: string
          mode: string
          started_at: string
          task_id: string | null
          user_id: string
        }
        Insert: {
          completed?: boolean
          duration_minutes: number
          ended_at?: string | null
          id?: string
          mode?: string
          started_at?: string
          task_id?: string | null
          user_id: string
        }
        Update: {
          completed?: boolean
          duration_minutes?: number
          ended_at?: string | null
          id?: string
          mode?: string
          started_at?: string
          task_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "focus_sessions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      habit_logs: {
        Row: {
          count: number
          created_at: string
          habit_id: string
          id: string
          log_date: string
          note: string | null
          user_id: string
        }
        Insert: {
          count?: number
          created_at?: string
          habit_id: string
          id?: string
          log_date?: string
          note?: string | null
          user_id: string
        }
        Update: {
          count?: number
          created_at?: string
          habit_id?: string
          id?: string
          log_date?: string
          note?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habit_logs_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      habits: {
        Row: {
          archived: boolean
          best_streak: number
          category: string | null
          color: string | null
          created_at: string
          description: string | null
          difficulty: string | null
          frequency: Json | null
          goal_per_week: number | null
          icon: string | null
          id: string
          image_url: string | null
          name: string
          schedule_times: string[] | null
          streak: number
          times_per_day: number | null
          updated_at: string
          user_id: string
          weekdays: number[] | null
        }
        Insert: {
          archived?: boolean
          best_streak?: number
          category?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          difficulty?: string | null
          frequency?: Json | null
          goal_per_week?: number | null
          icon?: string | null
          id?: string
          image_url?: string | null
          name: string
          schedule_times?: string[] | null
          streak?: number
          times_per_day?: number | null
          updated_at?: string
          user_id: string
          weekdays?: number[] | null
        }
        Update: {
          archived?: boolean
          best_streak?: number
          category?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          difficulty?: string | null
          frequency?: Json | null
          goal_per_week?: number | null
          icon?: string | null
          id?: string
          image_url?: string | null
          name?: string
          schedule_times?: string[] | null
          streak?: number
          times_per_day?: number | null
          updated_at?: string
          user_id?: string
          weekdays?: number[] | null
        }
        Relationships: []
      }
      hydration_logs: {
        Row: {
          amount_ml: number
          created_at: string
          id: string
          log_date: string
          user_id: string
        }
        Insert: {
          amount_ml: number
          created_at?: string
          id?: string
          log_date?: string
          user_id: string
        }
        Update: {
          amount_ml?: number
          created_at?: string
          id?: string
          log_date?: string
          user_id?: string
        }
        Relationships: []
      }
      mood_logs: {
        Row: {
          created_at: string
          energy: number | null
          id: string
          log_date: string
          mood: string
          note: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          energy?: number | null
          id?: string
          log_date?: string
          mood: string
          note?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          energy?: number | null
          id?: string
          log_date?: string
          mood?: string
          note?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notes: {
        Row: {
          archived: boolean | null
          content: string | null
          created_at: string
          folder: string | null
          id: string
          pinned: boolean | null
          tags: string[] | null
          title: string
          type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          archived?: boolean | null
          content?: string | null
          created_at?: string
          folder?: string | null
          id?: string
          pinned?: boolean | null
          tags?: string[] | null
          title: string
          type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          archived?: boolean | null
          content?: string | null
          created_at?: string
          folder?: string | null
          id?: string
          pinned?: boolean | null
          tags?: string[] | null
          title?: string
          type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          coins: number
          created_at: string
          email: string | null
          full_name: string | null
          hydration_goal_ml: number
          hydration_reminders: Json
          id: string
          last_active_date: string | null
          level: number
          library_enabled: boolean
          modules_enabled: Json
          streak: number
          sync_flow: number
          theme: string
          updated_at: string
          username: string | null
          weight_kg: number | null
          xp: number
        }
        Insert: {
          avatar_url?: string | null
          coins?: number
          created_at?: string
          email?: string | null
          full_name?: string | null
          hydration_goal_ml?: number
          hydration_reminders?: Json
          id: string
          last_active_date?: string | null
          level?: number
          library_enabled?: boolean
          modules_enabled?: Json
          streak?: number
          sync_flow?: number
          theme?: string
          updated_at?: string
          username?: string | null
          weight_kg?: number | null
          xp?: number
        }
        Update: {
          avatar_url?: string | null
          coins?: number
          created_at?: string
          email?: string | null
          full_name?: string | null
          hydration_goal_ml?: number
          hydration_reminders?: Json
          id?: string
          last_active_date?: string | null
          level?: number
          library_enabled?: boolean
          modules_enabled?: Json
          streak?: number
          sync_flow?: number
          theme?: string
          updated_at?: string
          username?: string | null
          weight_kg?: number | null
          xp?: number
        }
        Relationships: []
      }
      rituals: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          name: string
          steps: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          steps?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          steps?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      roadmap_items: {
        Row: {
          completed: boolean
          created_at: string
          description: string | null
          id: string
          link: string | null
          phase_id: string
          roadmap_id: string
          sort_order: number
          tag: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          description?: string | null
          id?: string
          link?: string | null
          phase_id: string
          roadmap_id: string
          sort_order?: number
          tag?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          description?: string | null
          id?: string
          link?: string | null
          phase_id?: string
          roadmap_id?: string
          sort_order?: number
          tag?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "roadmap_items_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "roadmap_phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roadmap_items_roadmap_id_fkey"
            columns: ["roadmap_id"]
            isOneToOne: false
            referencedRelation: "roadmaps"
            referencedColumns: ["id"]
          },
        ]
      }
      roadmap_phases: {
        Row: {
          completed: boolean
          created_at: string
          id: string
          name: string
          roadmap_id: string
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          id?: string
          name: string
          roadmap_id: string
          sort_order?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          id?: string
          name?: string
          roadmap_id?: string
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "roadmap_phases_roadmap_id_fkey"
            columns: ["roadmap_id"]
            isOneToOne: false
            referencedRelation: "roadmaps"
            referencedColumns: ["id"]
          },
        ]
      }
      roadmaps: {
        Row: {
          category: string | null
          color: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      taskflow_boards: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          position: number
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          position?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          position?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      taskflow_cards: {
        Row: {
          board_id: string
          column_key: string
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          position: number
          priority: string | null
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          board_id: string
          column_key?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          position?: number
          priority?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          board_id?: string
          column_key?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          position?: number
          priority?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "taskflow_cards_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "taskflow_boards"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          actual_minutes: number | null
          archived: boolean
          category: string | null
          category_id: string | null
          completed_at: string | null
          created_at: string
          daily_completed: number
          description: string | null
          due_date: string | null
          due_time: string | null
          estimated_minutes: number | null
          flow_status: string
          id: string
          kind: string
          notes: string | null
          period: string | null
          periods: string[]
          priority: string
          recurrence: Json | null
          reminder_at: string | null
          status: string
          subtasks: Json | null
          tags: string[] | null
          times_per_day: number | null
          title: string
          updated_at: string
          user_id: string
          weekdays: number[] | null
        }
        Insert: {
          actual_minutes?: number | null
          archived?: boolean
          category?: string | null
          category_id?: string | null
          completed_at?: string | null
          created_at?: string
          daily_completed?: number
          description?: string | null
          due_date?: string | null
          due_time?: string | null
          estimated_minutes?: number | null
          flow_status?: string
          id?: string
          kind?: string
          notes?: string | null
          period?: string | null
          periods?: string[]
          priority?: string
          recurrence?: Json | null
          reminder_at?: string | null
          status?: string
          subtasks?: Json | null
          tags?: string[] | null
          times_per_day?: number | null
          title: string
          updated_at?: string
          user_id: string
          weekdays?: number[] | null
        }
        Update: {
          actual_minutes?: number | null
          archived?: boolean
          category?: string | null
          category_id?: string | null
          completed_at?: string | null
          created_at?: string
          daily_completed?: number
          description?: string | null
          due_date?: string | null
          due_time?: string | null
          estimated_minutes?: number | null
          flow_status?: string
          id?: string
          kind?: string
          notes?: string | null
          period?: string | null
          periods?: string[]
          priority?: string
          recurrence?: Json | null
          reminder_at?: string | null
          status?: string
          subtasks?: Json | null
          tags?: string[] | null
          times_per_day?: number | null
          title?: string
          updated_at?: string
          user_id?: string
          weekdays?: number[] | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
