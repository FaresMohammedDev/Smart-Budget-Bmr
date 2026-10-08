import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const FALLBACK_SUPABASE_URL = 'https://dvihewhnspmxyigdeikp.supabase.co';
const FALLBACK_SUPABASE_ANON_KEY = 'sb_publishable_b9v8HuohVD3vGcjRo3VmLQ_f74UhAhJ';

export async function createClient() {
  const cookieStore = await cookies();

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY;

  return createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
          }
        },
      },
    }
  );
}
