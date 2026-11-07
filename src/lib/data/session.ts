import { createClient } from '@/lib/supabase/client';
import { getDataMode } from './config';

export async function endCustomerSession() {
  if (getDataMode() === 'supabase') {
    const { error } = await createClient().auth.signOut({ scope: 'local' });
    if (error) throw error;
  }
}
