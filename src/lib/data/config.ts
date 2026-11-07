export function getDataMode(): 'local' | 'supabase' {
  const mode = process.env.NEXT_PUBLIC_DATA_MODE;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (mode === 'local') return 'local';
  if (mode && mode !== 'auto' && mode !== 'supabase') throw new Error('Invalid NEXT_PUBLIC_DATA_MODE');
  if (mode === 'supabase' || url || key) {
    if (!url || !key) throw new Error('أكمل إعدادات Supabase: الرابط والمفتاح العام مطلوبان.');
    return 'supabase';
  }
  return 'local';
}
