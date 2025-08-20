import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          created_at: string
          last_login: string | null
        }
      }
      analysis_requests: {
        Row: {
          id: string
          user_id: string
          request_id: string
          user_linkedin_url: string
          competitor_urls: string[]
          target_position: string
          status: 'processing' | 'completed' | 'failed'
          created_at: string
          completed_at: string | null
        }
      }
      analysis_results: {
        Row: {
          id: string
          request_id: string
          user_id: string
          result_data: Record<string, unknown>
          created_at: string
        }
      }
    }
  }
}