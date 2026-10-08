import { createBrowserClient } from '@supabase/ssr';

const FALLBACK_SUPABASE_URL = 'https://dvihewhnspmxyigdeikp.supabase.co';
const FALLBACK_SUPABASE_ANON_KEY = 'sb_publishable_b9v8HuohVD3vGcjRo3VmLQ_f74UhAhJ';

export function createClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY;

  return createBrowserClient(supabaseUrl, supabaseKey);
}
