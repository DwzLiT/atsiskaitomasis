import { createClient } from '@supabase/supabase-js'

const { SUPABASE_PROJECT_ID, SUPABASE_URL, SUPABASE_KEY } = process.env

const url =
  SUPABASE_URL ||
  (SUPABASE_PROJECT_ID && `https://${SUPABASE_PROJECT_ID}.supabase.co`)

if (!url || !SUPABASE_KEY || SUPABASE_KEY.startsWith('your-')) {
  console.error('Set SUPABASE_PROJECT_ID and SUPABASE_KEY in .env (see .env.example).')
  process.exit(1)
}

export const supabase = createClient(url, SUPABASE_KEY, {
  auth: { persistSession: false },
})
