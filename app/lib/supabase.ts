// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

// .env.local에 있는 키값을 가져와서 수파베이스와 연결하는 마법의 열쇠입니다.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);