import { createClient } from '@supabase/supabase-js'

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false
  }
})

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string
          role: 'student' | 'admin'
          password_hash?: string
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          full_name: string
          role?: 'student' | 'admin'
          password_hash?: string
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          role?: 'student' | 'admin'
          password_hash?: string
          created_at?: string
        }
      }
      tests: {
        Row: {
          id: string
          title: string
          description: string
          duration_minutes: number
          status: 'draft' | 'published' | 'coming_soon'
          shuffle_questions: boolean
          shuffle_options: boolean
          negative_marking: boolean
          category: string
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string
          duration_minutes: number
          status?: 'draft' | 'published' | 'coming_soon'
          shuffle_questions?: boolean
          shuffle_options?: boolean
          negative_marking?: boolean
          category?: string
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string
          duration_minutes?: number
          status?: 'draft' | 'published' | 'coming_soon'
          shuffle_questions?: boolean
          shuffle_options?: boolean
          negative_marking?: boolean
          category?: string
          created_at?: string
        }
      }
      questions: {
        Row: {
          id: string
          test_id: string
          text: string
          points: number
          negative_points: number
          order_index: number
          created_at: string
        }
        Insert: {
          id?: string
          test_id: string
          text: string
          points?: number
          negative_points?: number
          order_index?: number
          created_at?: string
        }
        Update: {
          id?: string
          test_id?: string
          text?: string
          points?: number
          negative_points?: number
          order_index?: number
          created_at?: string
        }
      }
      options: {
        Row: {
          id: string
          question_id: string
          label: string
          is_correct: boolean
          order_index: number
          created_at: string
        }
        Insert: {
          id?: string
          question_id: string
          label: string
          is_correct?: boolean
          order_index?: number
          created_at?: string
        }
        Update: {
          id?: string
          question_id?: string
          label?: string
          is_correct?: boolean
          order_index?: number
          created_at?: string
        }
      }
      attempts: {
        Row: {
          id: string
          user_id: string
          test_id: string
          started_at: string
          submitted_at: string | null
          total_score: number
          status: 'active' | 'submitted'
          time_remaining: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          test_id: string
          started_at?: string
          submitted_at?: string | null
          total_score?: number
          status?: 'active' | 'submitted'
          time_remaining?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          test_id?: string
          started_at?: string
          submitted_at?: string | null
          total_score?: number
          status?: 'active' | 'submitted'
          time_remaining?: number | null
          created_at?: string
        }
      }
      answers: {
        Row: {
          id: string
          attempt_id: string
          question_id: string
          chosen_option_id: string | null
          is_correct: boolean
          score: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          attempt_id: string
          question_id: string
          chosen_option_id?: string | null
          is_correct?: boolean
          score?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          attempt_id?: string
          question_id?: string
          chosen_option_id?: string | null
          is_correct?: boolean
          score?: number
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}