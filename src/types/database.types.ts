
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "forfeit_history": {
                  Row: {
                    "forfeited_at": string,"id": string,"match_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "forfeited_at"?: string,"id"?: string,"match_id": string,"user_id": string
                  }
                  Update: {
                    "forfeited_at"?: string,"id"?: string,"match_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "forfeit_history_match_id_fkey"
      columns: ["match_id"]
isOneToOne: false
      referencedRelation: "matches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "forfeit_history_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"match_answers": {
                  Row: {
                    "answer_index": number,"id": string,"is_correct": boolean,"match_id": string,"question_id": string,"response_time_ms": number,"server_ts": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "answer_index": number,"id"?: string,"is_correct": boolean,"match_id": string,"question_id": string,"response_time_ms": number,"server_ts"?: string,"user_id": string
                  }
                  Update: {
                    "answer_index"?: number,"id"?: string,"is_correct"?: boolean,"match_id"?: string,"question_id"?: string,"response_time_ms"?: number,"server_ts"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "match_answers_match_id_fkey"
      columns: ["match_id"]
isOneToOne: false
      referencedRelation: "matches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "match_answers_question_id_fkey"
      columns: ["question_id"]
isOneToOne: false
      referencedRelation: "questions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "match_answers_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"matches": {
                  Row: {
                    "created_at": string,"current_question_index": number,"elo_delta_p1": number | null,"elo_delta_p2": number | null,"ended_at": string | null,"id": string,"p1_id": string,"p1_score": number,"p2_id": string,"p2_score": number,"question_ids": NonNullable<Json>,"question_started_at": string,"status": string,"winner_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"current_question_index"?: number,"elo_delta_p1"?: number | null,"elo_delta_p2"?: number | null,"ended_at"?: string | null,"id"?: string,"p1_id": string,"p1_score"?: number,"p2_id": string,"p2_score"?: number,"question_ids": NonNullable<Json>,"question_started_at"?: string,"status"?: string,"winner_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"current_question_index"?: number,"elo_delta_p1"?: number | null,"elo_delta_p2"?: number | null,"ended_at"?: string | null,"id"?: string,"p1_id"?: string,"p1_score"?: number,"p2_id"?: string,"p2_score"?: number,"question_ids"?: NonNullable<Json>,"question_started_at"?: string,"status"?: string,"winner_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "matches_p1_id_fkey"
      columns: ["p1_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matches_p2_id_fkey"
      columns: ["p2_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matches_winner_id_fkey"
      columns: ["winner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"matchmaking_queue": {
                  Row: {
                    "elo": number,"matched_match_id": string | null,"queued_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "elo": number,"matched_match_id"?: string | null,"queued_at"?: string,"user_id": string
                  }
                  Update: {
                    "elo"?: number,"matched_match_id"?: string | null,"queued_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "matchmaking_queue_matched_match_id_fkey"
      columns: ["matched_match_id"]
isOneToOne: false
      referencedRelation: "matches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matchmaking_queue_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"elo": number,"flagged": boolean,"id": string,"inventory": NonNullable<Json>,"is_pro": boolean,"last_ranked_at": string | null,"legacy_imported": boolean,"matchmaking_cooldown_until": string | null,"nick": string,"profession": string | null,"rank": string,"updated_at": string,"xp": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"elo"?: number,"flagged"?: boolean,"id": string,"inventory"?: NonNullable<Json>,"is_pro"?: boolean,"last_ranked_at"?: string | null,"legacy_imported"?: boolean,"matchmaking_cooldown_until"?: string | null,"nick": string,"profession"?: string | null,"rank"?: string,"updated_at"?: string,"xp"?: number
                  }
                  Update: {
                    "created_at"?: string,"elo"?: number,"flagged"?: boolean,"id"?: string,"inventory"?: NonNullable<Json>,"is_pro"?: boolean,"last_ranked_at"?: string | null,"legacy_imported"?: boolean,"matchmaking_cooldown_until"?: string | null,"nick"?: string,"profession"?: string | null,"rank"?: string,"updated_at"?: string,"xp"?: number
                  }
                  Relationships: [
                    
                  ]
                },"questions": {
                  Row: {
                    "category": string,"code_snippet": string | null,"correct_index": number,"created_at": string,"difficulty": string,"id": string,"options": NonNullable<Json>,"question": string
                  }
                  ComputedFields: never
                  Insert: {
                    "category": string,"code_snippet"?: string | null,"correct_index": number,"created_at"?: string,"difficulty"?: string,"id"?: string,"options": NonNullable<Json>,"question": string
                  }
                  Update: {
                    "category"?: string,"code_snippet"?: string | null,"correct_index"?: number,"created_at"?: string,"difficulty"?: string,"id"?: string,"options"?: NonNullable<Json>,"question"?: string
                  }
                  Relationships: [
                    
                  ]
                },"rpc_rate_limits": {
                  Row: {
                    "action_name": string,"request_count": number,"user_id": string,"window_start": string
                  }
                  ComputedFields: never
                  Insert: {
                    "action_name": string,"request_count"?: number,"user_id": string,"window_start"?: string
                  }
                  Update: {
                    "action_name"?: string,"request_count"?: number,"user_id"?: string,"window_start"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "rpc_rate_limits_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"user_licenses": {
                  Row: {
                    "activated_at": string,"expires_at": string | null,"id": string,"instance_id": string | null,"lemon_customer_id": string | null,"lemon_order_id": string | null,"lemon_subscription_id": string | null,"license_key_hash": string,"status": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "activated_at"?: string,"expires_at"?: string | null,"id"?: string,"instance_id"?: string | null,"lemon_customer_id"?: string | null,"lemon_order_id"?: string | null,"lemon_subscription_id"?: string | null,"license_key_hash": string,"status"?: string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "activated_at"?: string,"expires_at"?: string | null,"id"?: string,"instance_id"?: string | null,"lemon_customer_id"?: string | null,"lemon_order_id"?: string | null,"lemon_subscription_id"?: string | null,"license_key_hash"?: string,"status"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_licenses_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "apply_elo_decay":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"check_and_increment_rate_limit":
{ Args: { "p_action": string,"p_max_requests": number,"p_user_id": string,"p_window_seconds": number }; Returns: boolean
                           },
"check_operator_anomalies":
{ Args: { "p_user_id": string }; Returns: undefined
                           },
"finalize_abandoned_match":
{ Args: { "p_match_id": string }; Returns: Json
                           },
"finalize_match":
{ Args: { "p_match_id": string }; Returns: Json
                           },
"finalize_match_internal":
{ Args: { "p_match_id": string }; Returns: Json
                           },
"find_or_create_match":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"forfeit_match":
{ Args: { "p_match_id": string }; Returns: Json
                           },
"get_match_questions":
{ Args: { "p_match_id": string }; Returns: {
              "category": string,"code_snippet": string,"id": string,"options": Json,"question": string,"question_order": number
            }[]
                           },
"get_tier_from_elo":
{ Args: { "p_elo": number }; Returns: string
                           },
"import_legacy_progress":
{ Args: { "p_inventory": Json,"p_profession": string,"p_user_id": string,"p_xp": number }; Returns: Json
                           },
"migrate_my_legacy_progress":
{ Args: { "p_inventory": Json,"p_profession": string,"p_xp": number }; Returns: Json
                           },
"poll_matchmaking":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"set_profile_pro_status":
{ Args: { "p_expires_at"?: string,"p_instance_id"?: string,"p_is_pro": boolean,"p_lemon_cust_id"?: string,"p_lemon_order_id"?: string,"p_lemon_sub_id"?: string,"p_license_key_hash"?: string,"p_user_id": string }; Returns: undefined
                           },
"submit_answer":
{ Args: { "p_answer_index": number,"p_match_id": string,"p_question_id": string }; Returns: Json
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

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
