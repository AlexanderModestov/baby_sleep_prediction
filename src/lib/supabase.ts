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