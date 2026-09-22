CTC Messaging + Portal Account Tracking

BEFORE DEPLOYING: Run admin/CTC-MESSAGING-SETUP.sql once in Supabase SQL Editor. This creates the private messages table and fighter-only access policies. Do not deploy the messaging UI until SQL succeeds.

Deploy this complete ZIP to Netlify. No new API key or paid messaging service is needed. Admin messages use the existing authenticated Netlify admin API; fighters use Supabase Auth and row-level security.

Admin > More > Messages: choose a fighter, read the thread and reply. Fighters > Message opens the same conversation. Portal > Messages lets each signed-in fighter send/reply. Unread counts refresh when the inbox is opened or the portal loads; this is NOT push notification or SMS.

Admin > Fighters: filter by Signed up / Not signed up. The dashboard shows linked fighter accounts. Signup status comes from fighters.auth_user_id, not a guessed status; last-login timestamps are not included because the existing database does not expose them reliably.

Discord invite is preserved: https://discord.gg/SphUDp6EA

Existing Admin hero, Resend, approvals, broadcasts and bloodwork files were retained from the latest available Admin navigation ZIP. Live deployment and Supabase migrations cannot be tested from this archive.
