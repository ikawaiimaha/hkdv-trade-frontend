import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Create client only if credentials are available
// If not, create a dummy client that won't crash the app
const client = supabaseUrl && supabaseKey
  ? createClient<Database>(supabaseUrl, supabaseKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : createClient<Database>('https://placeholder.supabase.co', 'placeholder');

export const supabase = client;
