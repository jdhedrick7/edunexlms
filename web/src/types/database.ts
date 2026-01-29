export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          course_id: string | null
          created_at: string | null
          id: string
          institution_id: string | null
          ip_address: unknown
          metadata: Json | null
          target_id: string | null
          target_type: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          course_id?: string | null
          created_at?: string | null
          id?: string
          institution_id?: string | null
          ip_address?: unknown
          metadata?: Json | null
          target_id?: string | null
          target_type?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          course_id?: string | null
          created_at?: string | null
          id?: string
          institution_id?: string | null
          ip_address?: unknown
          metadata?: Json | null
          target_id?: string | null
          target_type?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      announcement_reads: {
        Row: {
          announcement_id: string
          id: string
          read_at: string | null
          user_id: string
        }
        Insert: {
          announcement_id: string
          id?: string
          read_at?: string | null
          user_id: string
        }
        Update: {
          announcement_id?: string
          id?: string
          read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_reads_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          attachments: Json | null
          author_id: string
          content: string
          course_id: string
          created_at: string | null
          id: string
          pinned: boolean | null
          publish_at: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          attachments?: Json | null
          author_id: string
          content: string
          course_id: string
          created_at?: string | null
          id?: string
          pinned?: boolean | null
          publish_at?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          attachments?: Json | null
          author_id?: string
          content?: string
          course_id?: string
          created_at?: string | null
          id?: string
          pinned?: boolean | null
          publish_at?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "announcements_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          id: string
          joined_at: string | null
          last_read_at: string | null
          role: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          joined_at?: string | null
          last_read_at?: string | null
          role?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          joined_at?: string | null
          last_read_at?: string | null
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          course_id: string
          created_at: string | null
          created_by: string | null
          id: string
          title: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          course_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          title?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          title?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      course_edit_jobs: {
        Row: {
          completed_at: string | null
          course_id: string
          created_at: string | null
          created_by: string | null
          error_message: string | null
          id: string
          module_path: string | null
          prompt: string
          result_version_id: string | null
          scope: string | null
          source_version_id: string
          started_at: string | null
          status: string | null
        }
        Insert: {
          completed_at?: string | null
          course_id: string
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          id?: string
          module_path?: string | null
          prompt: string
          result_version_id?: string | null
          scope?: string | null
          source_version_id: string
          started_at?: string | null
          status?: string | null
        }
        Update: {
          completed_at?: string | null
          course_id?: string
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          id?: string
          module_path?: string | null
          prompt?: string
          result_version_id?: string | null
          scope?: string | null
          source_version_id?: string
          started_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_edit_jobs_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_edit_jobs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_edit_jobs_result_version_id_fkey"
            columns: ["result_version_id"]
            isOneToOne: false
            referencedRelation: "course_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_edit_jobs_source_version_id_fkey"
            columns: ["source_version_id"]
            isOneToOne: false
            referencedRelation: "course_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      course_material_embeddings: {
        Row: {
          chunk_index: number
          content: string
          course_id: string
          created_at: string | null
          embedding: string
          file_path: string
          id: string
          metadata: Json | null
          version_id: string
        }
        Insert: {
          chunk_index: number
          content: string
          course_id: string
          created_at?: string | null
          embedding: string
          file_path: string
          id?: string
          metadata?: Json | null
          version_id: string
        }
        Update: {
          chunk_index?: number
          content?: string
          course_id?: string
          created_at?: string | null
          embedding?: string
          file_path?: string
          id?: string
          metadata?: Json | null
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_material_embeddings_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_material_embeddings_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "course_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      course_versions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          course_id: string
          created_at: string | null
          created_by: string | null
          id: string
          notes: string | null
          status: string | null
          storage_path: string
          version_number: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          course_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          status?: string | null
          storage_path: string
          version_number: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          course_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          status?: string | null
          storage_path?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "course_versions_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_versions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          id: string
          institution_id: string
          name: string
          published_version_id: string | null
          settings: Json | null
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          id?: string
          institution_id: string
          name: string
          published_version_id?: string | null
          settings?: Json | null
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          id?: string
          institution_id?: string
          name?: string
          published_version_id?: string | null
          settings?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "courses_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_published_version"
            columns: ["published_version_id"]
            isOneToOne: false
            referencedRelation: "course_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          course_id: string
          enrolled_at: string | null
          id: string
          role: string
          user_id: string
        }
        Insert: {
          course_id: string
          enrolled_at?: string | null
          id?: string
          role: string
          user_id: string
        }
        Update: {
          course_id?: string
          enrolled_at?: string | null
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      grades: {
        Row: {
          assignment_path: string
          course_id: string
          feedback: string | null
          graded_at: string | null
          graded_by: string | null
          id: string
          points_earned: number | null
          points_possible: number
          rubric_scores: Json | null
          submission_id: string | null
          user_id: string
        }
        Insert: {
          assignment_path: string
          course_id: string
          feedback?: string | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          points_earned?: number | null
          points_possible: number
          rubric_scores?: Json | null
          submission_id?: string | null
          user_id: string
        }
        Update: {
          assignment_path?: string
          course_id?: string
          feedback?: string | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          points_earned?: number | null
          points_possible?: number
          rubric_scores?: Json | null
          submission_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "grades_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_graded_by_fkey"
            columns: ["graded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      institution_members: {
        Row: {
          created_at: string | null
          id: string
          institution_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          institution_id: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          institution_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "institution_members_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "institution_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      institutions: {
        Row: {
          created_at: string | null
          id: string
          name: string
          settings: Json | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          settings?: Json | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          settings?: Json | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          attachments: Json | null
          content: string
          conversation_id: string
          created_at: string | null
          deleted_at: string | null
          edited_at: string | null
          id: string
          sender_id: string | null
        }
        Insert: {
          attachments?: Json | null
          content: string
          conversation_id: string
          created_at?: string | null
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          sender_id?: string | null
        }
        Update: {
          attachments?: Json | null
          content?: string
          conversation_id?: string
          created_at?: string | null
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          sender_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          course_id: string | null
          created_at: string | null
          data: Json | null
          id: string
          institution_id: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          course_id?: string | null
          created_at?: string | null
          data?: Json | null
          id?: string
          institution_id?: string | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          course_id?: string | null
          created_at?: string | null
          data?: Json | null
          id?: string
          institution_id?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_attempts: {
        Row: {
          answers: Json
          attempt_number: number
          course_id: string
          id: string
          max_score: number | null
          quiz_path: string
          score: number | null
          started_at: string | null
          submitted_at: string | null
          user_id: string
        }
        Insert: {
          answers: Json
          attempt_number: number
          course_id: string
          id?: string
          max_score?: number | null
          quiz_path: string
          score?: number | null
          started_at?: string | null
          submitted_at?: string | null
          user_id: string
        }
        Update: {
          answers?: Json
          attempt_number?: number
          course_id?: string
          id?: string
          max_score?: number | null
          quiz_path?: string
          score?: number | null
          started_at?: string | null
          submitted_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      student_context_embeddings: {
        Row: {
          chunk_index: number
          content: string
          created_at: string | null
          embedding: string
          file_path: string
          id: string
          institution_id: string
          user_id: string
        }
        Insert: {
          chunk_index: number
          content: string
          created_at?: string | null
          embedding: string
          file_path: string
          id?: string
          institution_id: string
          user_id: string
        }
        Update: {
          chunk_index?: number
          content?: string
          created_at?: string | null
          embedding?: string
          file_path?: string
          id?: string
          institution_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_context_embeddings_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_context_embeddings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      student_tutors: {
        Row: {
          agent_md_path: string
          created_at: string | null
          id: string
          institution_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          agent_md_path: string
          created_at?: string | null
          id?: string
          institution_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          agent_md_path?: string
          created_at?: string | null
          id?: string
          institution_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_tutors_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_tutors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      submissions: {
        Row: {
          assignment_path: string
          course_id: string
          id: string
          status: string | null
          storage_path: string
          submitted_at: string | null
          text_content: string | null
          user_id: string
        }
        Insert: {
          assignment_path: string
          course_id: string
          id?: string
          status?: string | null
          storage_path: string
          submitted_at?: string | null
          text_content?: string | null
          user_id: string
        }
        Update: {
          assignment_path?: string
          course_id?: string
          id?: string
          status?: string | null
          storage_path?: string
          submitted_at?: string | null
          text_content?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "submissions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_assistants: {
        Row: {
          agent_md_path: string
          created_at: string | null
          id: string
          institution_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          agent_md_path: string
          created_at?: string | null
          id?: string
          institution_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          agent_md_path?: string
          created_at?: string | null
          id?: string
          institution_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_assistants_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_assistants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_context_embeddings: {
        Row: {
          chunk_index: number
          content: string
          created_at: string | null
          embedding: string
          file_path: string
          id: string
          institution_id: string
          user_id: string
        }
        Insert: {
          chunk_index: number
          content: string
          created_at?: string | null
          embedding: string
          file_path: string
          id?: string
          institution_id: string
          user_id: string
        }
        Update: {
          chunk_index?: number
          content?: string
          created_at?: string | null
          embedding?: string
          file_path?: string
          id?: string
          institution_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_context_embeddings_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_context_embeddings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_messages: {
        Row: {
          assistant_id: string
          content: string
          course_id: string | null
          created_at: string | null
          id: string
          role: string
          tool_calls: Json | null
          tool_results: Json | null
        }
        Insert: {
          assistant_id: string
          content: string
          course_id?: string | null
          created_at?: string | null
          id?: string
          role: string
          tool_calls?: Json | null
          tool_results?: Json | null
        }
        Update: {
          assistant_id?: string
          content?: string
          course_id?: string | null
          created_at?: string | null
          id?: string
          role?: string
          tool_calls?: Json | null
          tool_results?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "teacher_messages_assistant_id_fkey"
            columns: ["assistant_id"]
            isOneToOne: false
            referencedRelation: "teacher_assistants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_messages_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      tutor_messages: {
        Row: {
          content: string
          context_files: string[] | null
          course_id: string | null
          created_at: string | null
          id: string
          role: string
          tool_calls: Json | null
          tool_results: Json | null
          tutor_id: string
        }
        Insert: {
          content: string
          context_files?: string[] | null
          course_id?: string | null
          created_at?: string | null
          id?: string
          role: string
          tool_calls?: Json | null
          tool_results?: Json | null
          tutor_id: string
        }
        Update: {
          content?: string
          context_files?: string[] | null
          course_id?: string | null
          created_at?: string | null
          id?: string
          role?: string
          tool_calls?: Json | null
          tool_results?: Json | null
          tutor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tutor_messages_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tutor_messages_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "student_tutors"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_course_staff: {
        Args: { crs_id: string }
        Returns: boolean
      }
      is_enrolled: {
        Args: { crs_id: string; required_role?: string }
        Returns: boolean
      }
      is_institution_member: {
        Args: { inst_id: string; required_role?: string }
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

// Convenience types
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

// Commonly used types
export type User = Tables<'users'>
export type Institution = Tables<'institutions'>
export type InstitutionMember = Tables<'institution_members'>
export type Course = Tables<'courses'>
export type CourseVersion = Tables<'course_versions'>
export type Enrollment = Tables<'enrollments'>
export type Submission = Tables<'submissions'>
export type Grade = Tables<'grades'>
export type QuizAttempt = Tables<'quiz_attempts'>
export type StudentTutor = Tables<'student_tutors'>
export type TutorMessage = Tables<'tutor_messages'>
export type TeacherAssistant = Tables<'teacher_assistants'>
export type TeacherMessage = Tables<'teacher_messages'>
export type CourseEditJob = Tables<'course_edit_jobs'>
export type Notification = Tables<'notifications'>
export type Announcement = Tables<'announcements'>
export type Conversation = Tables<'conversations'>
export type Message = Tables<'messages'>

// Role types
export type InstitutionRole = 'admin' | 'teacher' | 'ta' | 'student'
export type EnrollmentRole = 'teacher' | 'ta' | 'student'
export type CourseVersionStatus = 'draft' | 'review' | 'approved' | 'archived'
export type SubmissionStatus = 'draft' | 'submitted' | 'graded' | 'returned'
export type EditJobStatus = 'pending' | 'processing' | 'completed' | 'failed'
export type NotificationType = 'grade' | 'submission' | 'announcement' | 'message' | 'edit_complete' | 'system'
