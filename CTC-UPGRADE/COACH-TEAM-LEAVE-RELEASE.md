# CTC COACH / TEAM / LEAVE — SEPTEMBER 21

Built from the most recent CTC-LIVE-PORTAL-DASHBOARD-BLOODWORK-RELIABILITY-FIX.zip (not a fresh redesign).

## Before Netlify deployment
1. BACK UP your live Supabase database.
2. Review `CTC-COACH-TEAM-LEAVE-SETUP.sql`, then run ONLY this new script in Supabase SQL Editor. Do not rerun old scripts blindly. It adds new private personnel, assignment, travel, message and leave tables; it does not modify existing fighter or matchup rows.
3. If iPhone gallery MOV uploads are blocked with video/quicktime MIME errors, separately review and run `CTC-GALLERY-IPHONE-MOV-SETUP.sql`. This adjusts only the existing ctc-media storage bucket MIME list; it does not convert HEVC MOV codec or guarantee playback in every browser.
4. Deploy the COMPLETE ZIP to the EXISTING Netlify CTC site, retaining SUPABASE_URL, SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) and RESEND_API_KEY.

## What's in this build
- Restricted `/coach-portal/` sign in, activation and password recovery; selectable from `/login.html`. Staff must have an enabled personnel profile with the same verified email.
- Admin → Coaches & Team: add/disable profiles; individually assign fighters, assign by card date, or assign ALL current and future fighters; revoke assignments; send verified-email invitations; manage each person's travel and messages.
- Coach/team read-only fighter information, own travel, carrier links, weight requests for assigned fighters, Management messaging, personal leave. Fighter booking references are NOT shared in the coach's assigned-fighter travel overview.
- Fighter Portal fight-level CTC Fight Team contacts, only associated with that specific fighter and matchup. Admin explicitly opts in to expose phone/email.
- Team approval, decline, activation and reminder email templates all begin 'Hello CTC Family,'. Sending is explicit, never automatic.
- Join Fighter Tapology N/A and required/optional badges; existing application approval converts invalid Tapology text to null.
- Existing past-card archive/delete-if-empty controls, All Fighters broadcast audience, and optional MOV bucket MIME migration included from prior working baseline.

## Live verification required — not proved by offline checks
1. Create one coach profile; send invite; activate with verified email; confirm unauthorized account cannot see portal.
2. Assign ONE fighter, a card date, and ALL fighters; verify ONLY expected profiles and matchups appear, including future roster members.
3. Save coach itinerary; verify coach sees own itinerary and not another coach's booking reference.
4. Have coach request fighter weight; verify fighter notification and successful submission.
5. Verify fighter's fight-team contacts resolve for the right matchup, and private phone/email appears only when Admin opted in.
6. Save leave from coach and fighter portals, verify ON LEAVE in Admin and early return updates.
7. Send test team emails and verify real delivery.
8. Test mobile views on a real iPhone. No live Supabase / Netlify / Resend tests were possible while packaging.

## Known limits
- Personnel travel supports carrier links and typed itinerary fields, not file uploads.
- Coach messages are a separate private Coach/Team inbox under Admin → Coaches & Team, not the older fighter chat inbox.
- Assigning a coach to a date assigns the coach to every fight on that DATE; events on the same date are not differentiated.
- The homepage hero appearance and new-media video conversion are not proven repaired by this Coach/Team release.
