export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      admin_student_audit_log: {
        Row: {
          action: string;
          admin_user_id: string;
          created_at: string;
          details: Json;
          id: string;
          student_user_id: string;
        };
        Insert: {
          action: string;
          admin_user_id: string;
          created_at?: string;
          details?: Json;
          id?: string;
          student_user_id: string;
        };
        Update: {
          action?: string;
          admin_user_id?: string;
          created_at?: string;
          details?: Json;
          id?: string;
          student_user_id?: string;
        };
        Relationships: [];
      };
      app_config: {
        Row: {
          beta_ends_at: string | null;
          beta_mode: boolean;
          id: boolean;
          updated_at: string;
        };
        Insert: {
          beta_ends_at?: string | null;
          beta_mode?: boolean;
          id?: boolean;
          updated_at?: string;
        };
        Update: {
          beta_ends_at?: string | null;
          beta_mode?: boolean;
          id?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      attempts: {
        Row: {
          created_at: string;
          exam_session_id: string | null;
          exercise_id: string;
          id: string;
          is_correct: boolean;
          selected_choice: number;
          time_spent_ms: number;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          exam_session_id?: string | null;
          exercise_id: string;
          id?: string;
          is_correct: boolean;
          selected_choice: number;
          time_spent_ms?: number;
          user_id: string;
        };
        Update: {
          created_at?: string;
          exam_session_id?: string | null;
          exercise_id?: string;
          id?: string;
          is_correct?: boolean;
          selected_choice?: number;
          time_spent_ms?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "attempts_exercise_id_fkey";
            columns: ["exercise_id"];
            isOneToOne: false;
            referencedRelation: "exercises";
            referencedColumns: ["id"];
          },
        ];
      };
      careers: {
        Row: {
          active: boolean;
          created_at: string;
          id: string;
          name: string;
          university_id: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          id?: string;
          name: string;
          university_id: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          id?: string;
          name?: string;
          university_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "careers_university_id_fkey";
            columns: ["university_id"];
            isOneToOne: false;
            referencedRelation: "universities";
            referencedColumns: ["id"];
          },
        ];
      };
      daily_exercise_answers: {
        Row: {
          answer_date: string;
          created_at: string;
          exercise_id: string;
          id: string;
          is_correct: boolean;
        };
        Insert: {
          answer_date: string;
          created_at?: string;
          exercise_id: string;
          id?: string;
          is_correct: boolean;
        };
        Update: {
          answer_date?: string;
          created_at?: string;
          exercise_id?: string;
          id?: string;
          is_correct?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "daily_exercise_answers_exercise_id_fkey";
            columns: ["exercise_id"];
            isOneToOne: false;
            referencedRelation: "exercises";
            referencedColumns: ["id"];
          },
        ];
      };
      daily_exercise_settings: {
        Row: {
          id: boolean;
          reshuffle_seed: number;
          updated_at: string;
        };
        Insert: {
          id?: boolean;
          reshuffle_seed?: number;
          updated_at?: string;
        };
        Update: {
          id?: boolean;
          reshuffle_seed?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      exam_questions: {
        Row: {
          exam_id: string;
          exercise_id: string;
          id: string;
          points: number;
          position: number;
        };
        Insert: {
          exam_id: string;
          exercise_id: string;
          id?: string;
          points?: number;
          position?: number;
        };
        Update: {
          exam_id?: string;
          exercise_id?: string;
          id?: string;
          points?: number;
          position?: number;
        };
        Relationships: [
          {
            foreignKeyName: "exam_questions_exam_id_fkey";
            columns: ["exam_id"];
            isOneToOne: false;
            referencedRelation: "exams";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "exam_questions_exercise_id_fkey";
            columns: ["exercise_id"];
            isOneToOne: false;
            referencedRelation: "exercises";
            referencedColumns: ["id"];
          },
        ];
      };
      exam_sessions: {
        Row: {
          answers: Json;
          correct_count: number | null;
          empty_count: number | null;
          exam_id: string | null;
          finished_at: string | null;
          flagged: Json;
          id: string;
          incorrect_count: number | null;
          max_score: number | null;
          question_ids: string[];
          score: number | null;
          started_at: string;
          status: string;
          time_limit_min: number | null;
          total: number | null;
          university_id: string | null;
          user_id: string;
        };
        Insert: {
          answers?: Json;
          correct_count?: number | null;
          empty_count?: number | null;
          exam_id?: string | null;
          finished_at?: string | null;
          flagged?: Json;
          id?: string;
          incorrect_count?: number | null;
          max_score?: number | null;
          question_ids?: string[];
          score?: number | null;
          started_at?: string;
          status?: string;
          time_limit_min?: number | null;
          total?: number | null;
          university_id?: string | null;
          user_id: string;
        };
        Update: {
          answers?: Json;
          correct_count?: number | null;
          empty_count?: number | null;
          exam_id?: string | null;
          finished_at?: string | null;
          flagged?: Json;
          id?: string;
          incorrect_count?: number | null;
          max_score?: number | null;
          question_ids?: string[];
          score?: number | null;
          started_at?: string;
          status?: string;
          time_limit_min?: number | null;
          total?: number | null;
          university_id?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "exam_sessions_exam_id_fkey";
            columns: ["exam_id"];
            isOneToOne: false;
            referencedRelation: "exams";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "exam_sessions_university_id_fkey";
            columns: ["university_id"];
            isOneToOne: false;
            referencedRelation: "universities";
            referencedColumns: ["id"];
          },
        ];
      };
      exam_template_rules: {
        Row: {
          created_at: string;
          difficulty_filter: Database["public"]["Enums"]["difficulty"] | null;
          exam_id: string;
          id: string;
          position: number;
          question_count: number;
          topic_id: string;
        };
        Insert: {
          created_at?: string;
          difficulty_filter?: Database["public"]["Enums"]["difficulty"] | null;
          exam_id: string;
          id?: string;
          position?: number;
          question_count: number;
          topic_id: string;
        };
        Update: {
          created_at?: string;
          difficulty_filter?: Database["public"]["Enums"]["difficulty"] | null;
          exam_id?: string;
          id?: string;
          position?: number;
          question_count?: number;
          topic_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "exam_template_rules_exam_id_fkey";
            columns: ["exam_id"];
            isOneToOne: false;
            referencedRelation: "exams";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "exam_template_rules_topic_id_fkey";
            columns: ["topic_id"];
            isOneToOne: false;
            referencedRelation: "topics";
            referencedColumns: ["id"];
          },
        ];
      };
      exams: {
        Row: {
          created_at: string;
          created_by: string | null;
          description: string | null;
          exam_type: string;
          id: string;
          max_attempts: number | null;
          passing_score: number;
          points_correct: number;
          points_empty: number;
          points_incorrect: number;
          question_order: string;
          status: string;
          time_limit_min: number;
          title: string;
          university_id: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          exam_type?: string;
          id?: string;
          max_attempts?: number | null;
          passing_score?: number;
          points_correct?: number;
          points_empty?: number;
          points_incorrect?: number;
          question_order?: string;
          status?: string;
          time_limit_min?: number;
          title: string;
          university_id?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          exam_type?: string;
          id?: string;
          max_attempts?: number | null;
          passing_score?: number;
          points_correct?: number;
          points_empty?: number;
          points_incorrect?: number;
          question_order?: string;
          status?: string;
          time_limit_min?: number;
          title?: string;
          university_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "exams_university_id_fkey";
            columns: ["university_id"];
            isOneToOne: false;
            referencedRelation: "universities";
            referencedColumns: ["id"];
          },
        ];
      };
      exercise_ratings: {
        Row: {
          created_at: string;
          exercise_id: string;
          id: string;
          stars: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          exercise_id: string;
          id?: string;
          stars: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          exercise_id?: string;
          id?: string;
          stars?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "exercise_ratings_exercise_id_fkey";
            columns: ["exercise_id"];
            isOneToOne: false;
            referencedRelation: "exercises";
            referencedColumns: ["id"];
          },
        ];
      };
      exercise_reports: {
        Row: {
          created_at: string;
          exercise_id: string;
          id: string;
          note: string | null;
          reason: Database["public"]["Enums"]["exercise_report_reason"];
          resolved_at: string | null;
          resolved_by: string | null;
          status: Database["public"]["Enums"]["exercise_report_status"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          exercise_id: string;
          id?: string;
          note?: string | null;
          reason: Database["public"]["Enums"]["exercise_report_reason"];
          resolved_at?: string | null;
          resolved_by?: string | null;
          status?: Database["public"]["Enums"]["exercise_report_status"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          exercise_id?: string;
          id?: string;
          note?: string | null;
          reason?: Database["public"]["Enums"]["exercise_report_reason"];
          resolved_at?: string | null;
          resolved_by?: string | null;
          status?: Database["public"]["Enums"]["exercise_report_status"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "exercise_reports_exercise_id_fkey";
            columns: ["exercise_id"];
            isOneToOne: false;
            referencedRelation: "exercises";
            referencedColumns: ["id"];
          },
        ];
      };
      exercises: {
        Row: {
          choices: Json;
          correct_choice: number;
          created_at: string;
          difficulty: Database["public"]["Enums"]["difficulty"];
          exam_year: number | null;
          expected_time_ms: number | null;
          id: string;
          solution_image_path: string | null;
          solution_md: string;
          statement_image_path: string | null;
          statement_md: string;
          subtopic_id: string | null;
          tags: string[];
          topic_id: string;
          university_id: string | null;
        };
        Insert: {
          choices: Json;
          correct_choice: number;
          created_at?: string;
          difficulty?: Database["public"]["Enums"]["difficulty"];
          exam_year?: number | null;
          expected_time_ms?: number | null;
          id?: string;
          solution_image_path?: string | null;
          solution_md: string;
          statement_image_path?: string | null;
          statement_md: string;
          subtopic_id?: string | null;
          tags?: string[];
          topic_id: string;
          university_id?: string | null;
        };
        Update: {
          choices?: Json;
          correct_choice?: number;
          created_at?: string;
          difficulty?: Database["public"]["Enums"]["difficulty"];
          exam_year?: number | null;
          expected_time_ms?: number | null;
          id?: string;
          solution_image_path?: string | null;
          solution_md?: string;
          statement_image_path?: string | null;
          statement_md?: string;
          subtopic_id?: string | null;
          tags?: string[];
          topic_id?: string;
          university_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "exercises_subtopic_id_fkey";
            columns: ["subtopic_id"];
            isOneToOne: false;
            referencedRelation: "subtopics";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "exercises_topic_id_fkey";
            columns: ["topic_id"];
            isOneToOne: false;
            referencedRelation: "topics";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "exercises_university_id_fkey";
            columns: ["university_id"];
            isOneToOne: false;
            referencedRelation: "universities";
            referencedColumns: ["id"];
          },
        ];
      };
      favorite_exercises: {
        Row: {
          created_at: string;
          exercise_id: string;
          id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          exercise_id: string;
          id?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          exercise_id?: string;
          id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "favorite_exercises_exercise_id_fkey";
            columns: ["exercise_id"];
            isOneToOne: false;
            referencedRelation: "exercises";
            referencedColumns: ["id"];
          },
        ];
      };
      min_scores: {
        Row: {
          career_id: string;
          created_at: string;
          exam_id: string;
          id: string;
          min_score: number;
          university_id: string;
          updated_at: string;
        };
        Insert: {
          career_id: string;
          created_at?: string;
          exam_id: string;
          id?: string;
          min_score: number;
          university_id: string;
          updated_at?: string;
        };
        Update: {
          career_id?: string;
          created_at?: string;
          exam_id?: string;
          id?: string;
          min_score?: number;
          university_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "min_scores_career_id_fkey";
            columns: ["career_id"];
            isOneToOne: false;
            referencedRelation: "careers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "min_scores_exam_id_fkey";
            columns: ["exam_id"];
            isOneToOne: false;
            referencedRelation: "exams";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "min_scores_university_id_fkey";
            columns: ["university_id"];
            isOneToOne: false;
            referencedRelation: "universities";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          body: string | null;
          created_at: string;
          id: string;
          kind: string;
          read_at: string | null;
          title: string;
          user_id: string;
        };
        Insert: {
          body?: string | null;
          created_at?: string;
          id?: string;
          kind: string;
          read_at?: string | null;
          title: string;
          user_id: string;
        };
        Update: {
          body?: string | null;
          created_at?: string;
          id?: string;
          kind?: string;
          read_at?: string | null;
          title?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          career: string | null;
          created_at: string;
          full_name: string | null;
          id: string;
          initial_weak_topic_ids: string[] | null;
          leaderboard_opt_in: boolean;
          onboarding_completed: boolean;
          onboarding_completed_at: string | null;
          plan_type: string;
          premium_ends_at: string | null;
          premium_source: string | null;
          prep_method: string | null;
          prep_time: string | null;
          pseudonym: string | null;
          pseudonym_change_required: boolean;
          suspended_at: string | null;
          target_university: string | null;
          trial_ends_at: string | null;
          trial_used: boolean;
          weekly_goal_exams: number;
          weekly_goal_questions: number;
          weekly_study_hours: number | null;
          welcome_email_sent_at: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          career?: string | null;
          created_at?: string;
          full_name?: string | null;
          id: string;
          initial_weak_topic_ids?: string[] | null;
          leaderboard_opt_in?: boolean;
          onboarding_completed?: boolean;
          onboarding_completed_at?: string | null;
          plan_type?: string;
          premium_ends_at?: string | null;
          premium_source?: string | null;
          prep_method?: string | null;
          prep_time?: string | null;
          pseudonym?: string | null;
          pseudonym_change_required?: boolean;
          suspended_at?: string | null;
          target_university?: string | null;
          trial_ends_at?: string | null;
          trial_used?: boolean;
          weekly_goal_exams?: number;
          weekly_goal_questions?: number;
          weekly_study_hours?: number | null;
          welcome_email_sent_at?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          career?: string | null;
          created_at?: string;
          full_name?: string | null;
          id?: string;
          initial_weak_topic_ids?: string[] | null;
          leaderboard_opt_in?: boolean;
          onboarding_completed?: boolean;
          onboarding_completed_at?: string | null;
          plan_type?: string;
          premium_ends_at?: string | null;
          premium_source?: string | null;
          prep_method?: string | null;
          prep_time?: string | null;
          pseudonym?: string | null;
          pseudonym_change_required?: boolean;
          suspended_at?: string | null;
          target_university?: string | null;
          trial_ends_at?: string | null;
          trial_used?: boolean;
          weekly_goal_exams?: number;
          weekly_goal_questions?: number;
          weekly_study_hours?: number | null;
          welcome_email_sent_at?: string | null;
        };
        Relationships: [];
      };
      student_universities: {
        Row: {
          career_id: string | null;
          created_at: string;
          exam_date: string | null;
          id: string;
          university_id: string;
          user_id: string;
        };
        Insert: {
          career_id?: string | null;
          created_at?: string;
          exam_date?: string | null;
          id?: string;
          university_id: string;
          user_id: string;
        };
        Update: {
          career_id?: string | null;
          created_at?: string;
          exam_date?: string | null;
          id?: string;
          university_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "student_universities_career_id_fkey";
            columns: ["career_id"];
            isOneToOne: false;
            referencedRelation: "careers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "student_universities_university_id_fkey";
            columns: ["university_id"];
            isOneToOne: false;
            referencedRelation: "universities";
            referencedColumns: ["id"];
          },
        ];
      };
      subtopics: {
        Row: {
          id: string;
          name: string;
          order: number;
          slug: string;
          topic_id: string;
        };
        Insert: {
          id?: string;
          name: string;
          order?: number;
          slug: string;
          topic_id: string;
        };
        Update: {
          id?: string;
          name?: string;
          order?: number;
          slug?: string;
          topic_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subtopics_topic_id_fkey";
            columns: ["topic_id"];
            isOneToOne: false;
            referencedRelation: "topics";
            referencedColumns: ["id"];
          },
        ];
      };
      topics: {
        Row: {
          active: boolean;
          color: string | null;
          description: string | null;
          icon: string | null;
          id: string;
          name: string;
          order: number;
          slug: string;
        };
        Insert: {
          active?: boolean;
          color?: string | null;
          description?: string | null;
          icon?: string | null;
          id?: string;
          name: string;
          order?: number;
          slug: string;
        };
        Update: {
          active?: boolean;
          color?: string | null;
          description?: string | null;
          icon?: string | null;
          id?: string;
          name?: string;
          order?: number;
          slug?: string;
        };
        Relationships: [];
      };
      universities: {
        Row: {
          active: boolean;
          description: string | null;
          exam_date: string | null;
          id: string;
          logo_path: string | null;
          name: string;
          short_name: string;
          slug: string;
        };
        Insert: {
          active?: boolean;
          description?: string | null;
          exam_date?: string | null;
          id?: string;
          logo_path?: string | null;
          name: string;
          short_name: string;
          slug: string;
        };
        Update: {
          active?: boolean;
          description?: string | null;
          exam_date?: string | null;
          id?: string;
          logo_path?: string | null;
          name?: string;
          short_name?: string;
          slug?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      activate_premium_trial: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      get_beta_status: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      get_daily_exercise: {
        Args: Record<PropertyKey, never>;
        Returns: {
          choices: Json;
          correct_answers: number;
          difficulty: Database["public"]["Enums"]["difficulty"];
          exercise_id: string;
          statement_md: string;
          topic_name: string;
          total_answers: number;
        }[];
      };
      get_daily_exercise_id: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      get_exam_leaderboard: {
        Args: { _exam_id: string; _limit?: number };
        Returns: {
          attempts_count: number;
          best_score: number;
          is_me: boolean;
          max_score: number;
          pseudonym: string;
          rank: number;
          total_count: number;
          user_id: string;
        }[];
      };
      get_exam_stats: {
        Args: { _exam_id: string; _my_score_pct?: number };
        Returns: {
          avg_score: number;
          my_percentile: number;
          sessions_count: number;
        }[];
      };
      get_exercise_avg_times: {
        Args: { _exercise_ids: string[] };
        Returns: {
          avg_time_ms: number;
          exercise_id: string;
          samples: number;
        }[];
      };
      get_exercise_counts_by_topic: {
        Args: Record<PropertyKey, never>;
        Returns: {
          exercise_count: number;
          topic_id: string;
        }[];
      };
      get_exercise_counts_by_university: {
        Args: Record<PropertyKey, never>;
        Returns: {
          exercise_count: number;
          university_id: string;
        }[];
      };
      get_exercise_review_queue: {
        Args: { _low_rating_threshold?: number };
        Returns: {
          avg_rating: number;
          exercise_id: string;
          flag_reason: string;
          pending_report_count: number;
          rating_count: number;
          statement_md: string;
          subtopic_name: string;
          topic_name: string;
        }[];
      };
      get_low_quality_exercise_ids: {
        Args: { _low_rating_threshold?: number };
        Returns: {
          exercise_id: string;
        }[];
      };
      get_my_subtopic_stats: {
        Args: Record<PropertyKey, never>;
        Returns: {
          accuracy: number;
          avg_time_ms: number;
          correct: number;
          last_attempt_at: string;
          subtopic_id: string;
          topic_id: string;
          total: number;
        }[];
      };
      get_plan_status: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      get_subtopic_avg_accuracy: {
        Args: Record<PropertyKey, never>;
        Returns: {
          accuracy: number;
          samples: number;
          subtopic_id: string;
        }[];
      };
      get_subtopic_avg_times: {
        Args: Record<PropertyKey, never>;
        Returns: {
          avg_time_ms: number;
          samples: number;
          subtopic_id: string;
        }[];
      };
      get_topic_avg_accuracy: {
        Args: Record<PropertyKey, never>;
        Returns: {
          accuracy: number;
          samples: number;
          topic_id: string;
        }[];
      };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      reshuffle_daily_exercise: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      submit_daily_exercise_answer: {
        Args: { _selected_choice: number };
        Returns: {
          correct_answers: number;
          correct_choice: number;
          exercise_id: string;
          is_correct: boolean;
          total_answers: number;
        }[];
      };
    };
    Enums: {
      app_role: "student" | "admin";
      difficulty: "facil" | "medio" | "dificil";
      exercise_report_reason:
        | "respuesta_incorrecta"
        | "enunciado_confuso"
        | "falta_informacion"
        | "imagen_problema"
        | "otro";
      exercise_report_status: "pendiente" | "resuelto" | "descartado";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["student", "admin"],
      difficulty: ["facil", "medio", "dificil"],
    },
  },
} as const;
