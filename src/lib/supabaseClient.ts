import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(url && anonKey);

// Placeholder keeps the client usable (build/dev) when .env is not set yet.
// The login screen shows a friendly setup warning instead of crashing.
export const supabase = createClient(
  url && url.length > 8 ? url : 'https://placeholder.supabase.co',
  anonKey && anonKey.length > 8 ? anonKey : 'public-anon-key-placeholder'
);
