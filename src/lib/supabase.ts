import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface User {
  id: string
  telegram_user_id: number
  first_name: string
  last_name?: string
  username?: string
  custom_name?: string
  settings: {
    notifications_enabled: boolean
    sleep_reminders: boolean
    wake_reminders: boolean
  }
  created_at: string
  updated_at: string
}

export interface Child {
  id: string
  user_id: string
  name: string
  date_of_birth: string
  gender: 'male' | 'female'
  created_at: string
  updated_at: string
}

export interface SleepSession {
  id: string
  child_id: string
  start_time: string
  end_time: string | null
  duration_minutes: number | null
  quality: 'excellent' | 'good' | 'average' | 'poor' | 'very_poor' | null
  session_type: 'night' | 'nap'
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface SleepContext {
  id: string
  child_id: string
  context_hash: string
  sessions_count: number
  session_ids: string // JSON string in simple schema
  last_sleep_session_id: string | null
  child_age_months: number
  total_sleep_hours: number | null
  average_session_duration: number | null
  created_at: string
}

export interface Prediction {
  id: string
  child_id: string
  sleep_context_id: string
  next_bedtime: string
  time_until_bedtime: string
  expected_duration: string
  confidence: number
  summary: string
  reasoning: string
  llm_provider: string
  model_used: string | null
  generation_time_ms: number | null
  is_active: boolean
  used_count: number
  last_served_at: string | null
  user_feedback: 'helpful' | 'not_helpful' | 'inaccurate' | null
  feedback_notes: string | null
  created_at: string
  updated_at: string
}

export interface PredictionUsage {
  id: string
  prediction_id: string
  child_id: string
  served_at: string
  was_from_cache: boolean
  user_action: string | null
  created_at: string
}