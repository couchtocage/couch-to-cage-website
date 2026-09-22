CTC FINAL CONTROL CENTER

ONE-TIME SETUP
1. Deploy this ZIP to the real Netlify project connected to couchtocage.com.
2. In Supabase, open SQL Editor > New query.
3. Open RUN-THIS-ONCE-IN-SUPABASE.sql from this ZIP, copy all of it, paste it, and tap Run.
   This script is safe to rerun. It will not duplicate the existing fights or gallery.
4. Open https://couchtocage.com/admin/ and sign in with officialcouchtocage@gmail.com.

ADMIN TABS INCLUDED
- Upcoming Fights
- CTC Family Gallery
- Homepage headline and fighter count
- Fighter Map locations
- Promotions Worked With
- Contact email and social links
- Roster Applications

The public Upcoming Fights, Gallery, Homepage, Map, Promotions and Contact pages are connected to Supabase. Routine changes can be made from /admin/ without uploading another ZIP. A brand-new feature or structural redesign would still require a deployment.

CTC FIGHTER PORTAL / ROSTER V2 (2026-09-18)
1. Deploy this ZIP to Netlify.
2. Run CTC-PORTAL-MIGRATION.sql ONCE in Supabase SQL Editor.
3. Netlify must have SUPABASE_URL and SUPABASE_SECRET_KEY set as secret environment variables.
4. Admin Fighters now reads the permanent Supabase roster through a protected Netlify Function.
5. Fighter self-activation uses roster email + email verification. Fighters set their own passwords.
6. Matchmaking statuses: pending, confirmed, completed, cancelled.
7. Bloodwork statuses: GOOD, EXPIRING SOON (30 days), PENDING REVIEW, NEEDS BLOODWORK.
