export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type EloRankTier =
  | 'Bronze Recruit'
  | 'Silver Operative'
  | 'Gold Specialist'
  | 'Platinum Specialist'
  | 'Diamond Vanguard'
  | 'Grandmaster Elite'
  | 'Cyber Warlord';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          nick: string;
          elo: number;
          rank: EloRankTier;
          xp: number;
          inventory: Json;
          profession: string | null;
          flagged: boolean;
          last_ranked_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          nick: string;
          elo?: number;
          rank?: EloRankTier;
          xp?: number;
          inventory?: Json;
          profession?: string | null;
          flagged?: boolean;
          last_ranked_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          nick?: string;
          elo?: number;
          rank?: EloRankTier;
          xp?: number;
          inventory?: Json;
          profession?: string | null;
          flagged?: boolean;
          last_ranked_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      questions: {
        Row: {
          id: string;
          category: string;
          question: string;
          code_snippet: string | null;
          options: string[];
          correct_index: number;
          difficulty: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          category: string;
          question: string;
          code_snippet?: string | null;
          options: string[];
          correct_index: number;
          difficulty?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          category?: string;
          question?: string;
          code_snippet?: string | null;
          options?: string[];
          correct_index?: number;
          difficulty?: string;
          created_at?: string;
        };
      };
      matches: {
        Row: {
          id: string;
          p1_id: string;
          p2_id: string;
          status: 'active' | 'completed' | 'forfeited';
          question_ids: string[];
          current_question_index: number;
          question_started_at: string;
          p1_score: number;
          p2_score: number;
          winner_id: string | null;
          elo_delta_p1: number | null;
          elo_delta_p2: number | null;
          created_at: string;
          ended_at: string | null;
        };
        Insert: {
          id?: string;
          p1_id: string;
          p2_id: string;
          status?: 'active' | 'completed' | 'forfeited';
          question_ids: string[];
          current_question_index?: number;
          question_started_at?: string;
          p1_score?: number;
          p2_score?: number;
          winner_id?: string | null;
          elo_delta_p1?: number | null;
          elo_delta_p2?: number | null;
          created_at?: string;
          ended_at?: string | null;
        };
        Update: {
          id?: string;
          p1_id?: string;
          p2_id?: string;
          status?: 'active' | 'completed' | 'forfeited';
          question_ids?: string[];
          current_question_index?: number;
          question_started_at?: string;
          p1_score?: number;
          p2_score?: number;
          winner_id?: string | null;
          elo_delta_p1?: number | null;
          elo_delta_p2?: number | null;
          created_at?: string;
          ended_at?: string | null;
        };
      };
      match_answers: {
        Row: {
          id: string;
          match_id: string;
          user_id: string;
          question_id: string;
          answer_index: number;
          is_correct: boolean;
          response_time_ms: number;
          server_ts: string;
        };
        Insert: {
          id?: string;
          match_id: string;
          user_id: string;
          question_id: string;
          answer_index: number;
          is_correct: boolean;
          response_time_ms: number;
          server_ts?: string;
        };
        Update: {
          id?: string;
          match_id?: string;
          user_id?: string;
          question_id?: string;
          answer_index?: number;
          is_correct?: boolean;
          response_time_ms?: number;
          server_ts?: string;
        };
      };
      matchmaking_queue: {
        Row: {
          user_id: string;
          elo: number;
          queued_at: string;
          matched_match_id: string | null;
        };
        Insert: {
          user_id: string;
          elo: number;
          queued_at?: string;
          matched_match_id?: string | null;
        };
        Update: {
          user_id?: string;
          elo?: number;
          queued_at?: string;
          matched_match_id?: string | null;
        };
      };
    };
    Functions: {
      get_match_questions: {
        Args: { p_match_id: string };
        Returns: {
          id: string;
          category: string;
          question: string;
          code_snippet: string | null;
          options: string[];
          question_order: number;
        }[];
      };
      find_or_create_match: {
        Args: Record<string, never>;
        Returns: {
          status: 'matched' | 'queued';
          match_id?: string;
          message?: string;
        };
      };
      poll_matchmaking: {
        Args: Record<string, never>;
        Returns: {
          status: 'matched' | 'waiting';
          match_id?: string;
        };
      };
      submit_answer: {
        Args: {
          p_match_id: string;
          p_question_id: string;
          p_answer_index: number;
        };
        Returns: {
          is_correct: boolean;
          elapsed_ms: number;
          both_answered: boolean;
          question_index: number;
        };
      };
      finalize_match: {
        Args: { p_match_id: string };
        Returns: {
          status: 'completed' | 'already_completed';
          winner_id: string | null;
          p1_score: number;
          p2_score: number;
          p1_delta: number;
          p2_delta: number;
        };
      };
      forfeit_match: {
        Args: { p_match_id: string };
        Returns: {
          status: 'forfeited' | 'already_ended';
          winner_id: string;
        };
      };
      import_legacy_progress: {
        Args: {
          p_xp: number;
          p_inventory: Json;
          p_profession: string;
        };
        Returns: {
          success: boolean;
          imported_xp: number;
          elo: number;
        };
      };
      apply_elo_decay: {
        Args: Record<string, never>;
        Returns: number;
      };
    };
  };
}
