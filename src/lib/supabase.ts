import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cbtaxsxzfveidadbwfwj.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_wsZjjVUwSff5J4J-oRAIjg_x244_cOR';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
