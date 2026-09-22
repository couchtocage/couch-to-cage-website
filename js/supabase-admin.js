// Dedicated persistent ADMIN auth store: fighter login in another tab cannot replace an Admin token.
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.4/+esm';
// Keep these two public Supabase connection values in sync with supabase-config.js.
// Do not import fighter's initialized client here: both clients would consume admin password-recovery links.
export const SUPABASE_URL='https://xlxdkftgfsbildenubkx.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY='sb_publishable_33V5061mDv_gSfdGMDgPOQ_IFtt0enO';
export const supabase=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{
 auth:{storageKey:'ctc-admin-auth-v1',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
});
