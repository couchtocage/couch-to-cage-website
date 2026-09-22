import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.4/+esm';

export const SUPABASE_URL = 'https://xlxdkftgfsbildenubkx.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_33V5061mDv_gSfdGMDgPOQ_IFtt0enO';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
