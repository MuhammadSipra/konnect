import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://nrzsabbnyscllbhvbdkm.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yenNhYmJueXNjbGxiaHZiZGttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzMjUxMjcsImV4cCI6MjA5ODkwMTEyN30.iqSTFB9U6mwEi8f5GGHsPU5HzsGeyq-NEQ1nzmpGgCc'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: false,
    detectSessionInUrl: false,
  },
})