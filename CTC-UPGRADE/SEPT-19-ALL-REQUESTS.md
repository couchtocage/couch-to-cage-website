# CTC — September 19 release · implementation and deployment

Based on the existing CTC-FIGHT-CARD-HIDE-MISSING-GYM ZIP. No logo, artwork, public layout, or existing pages were replaced. This is not a live deployment; no real CTC, fighter, or Resend account was accessed by the build process.

## Required deployment order
1. Back up the Supabase schema/data and current Netlify deployment.
2. In Supabase SQL Editor, run **CTC-SEPT-19-TRAVEL-NOTIFICATIONS-SETUP.sql** in the ZIP root. If it raises a duplicate pending fighter name or schema mismatch, resolve that specific existing data conflict before running again; do not drop fighters. The migration allows email-free roster profiles, creates an isolated per-manager notification-dismissal table, creates private per-matchup travel records with fighter-only SELECT, and a nonpublic ctc-travel storage bucket.
3. Deploy the ZIP **contents** to the EXISTING Netlify site. Keep the existing Netlify environment variables SUPABASE_URL, SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY), and RESEND_API_KEY. Do not upload SQL files to a public browsable site if you can exclude them from deployment.
4. Sign into Admin again. The updated Admin client deliberately uses an independent browser auth store (`ctc-admin-auth-v1`) so Fighter Portal login in the same browser cannot replace your Admin login. Browser password managers can save username and password through the standard form/autocomplete; there is no plaintext password or custom password cache.
5. Press LOAD OCT 24, then LOAD NOV 6, and read each final result. This writes live Supabase rows; importing twice is intended to update existing cards and fights, not create new copies. The import will create **pending, email-free** roster profiles only for unique missing names; ambiguous names are held for Admin review. It will not guess contact information or link an auth account by name. Admin must add the correct **verified roster email** before that fighter can activate their account. All their matchups remain on the same fighter UUID and are visible after verified-email linkage.
6. Manage travel by opening a saved Matchmaking card and clicking **TRAVEL DETAILS**. Fill dates as local clock times **at the airport/station**, and label the departure and arrival time zones. Save, optionally upload a private PDF/JPG/PNG/WebP itinerary (up to 3 MB), and manually send the CTC travel reminder around 40 hours before departure. Reminders are **not automatically scheduled**. A fighter sees only their own travel records in Upcoming Fights and cannot edit the official travel details.
7. Test Admin and Fighter Portal with two separate authorized Admin accounts/browsers and a designated test fighter before using real fighters' travel documents. Supabase Auth's project-level single-session setting, if enabled, may still prevent different devices sharing the **same** credentials; use separately authorized manager accounts. Add each manager's auth UUID to admin_users under existing project authorization procedures.

## Requested items

- [x] Admin session: separate browser storage from Fighter Portal, local-only logout, prevent repeated dashboard restart on refresh, independent admin managers using per-device sessions; no password caching in custom code.
- [x] Dashboard: nonfatal settings/gallery/seed issue no longer blocks roster/matchup loading or leaves counters on permanent ellipsis; failures are logged/visible rather than replaced by fabricated numbers.
- [x] Roster-first matchmaking: October 24 and November 6 named lists, pending profile creation, readiness on assignment, preservation of fighter UUID across portal activation, matched cards can publish before signup; ambiguous same names are not guessed.
- [x] Fighter profile matchup navigation: new matchup preselects fighter and resets stale matchmaking filters; saved matchups offer a MANAGE MATCHUP action.
- [x] Public card: existing CTC fighter count remains; gym only appears when actual gym present; official art and Flex series remain unchanged.
- [x] Requests/notifications: pending and completed weight/bloodwork requests, confirmed sends, count badge, direct weight-history or fighter bloodwork review navigation, persistent per-admin, per-request-stage Clear (a new completed response reappears even if an earlier pending alert was cleared), 30-second refresh while Admin is open. Clear does not delete an underlying request.
- [x] Per-fight travel: private Admin form, carrier and trip link, times with explicit local time zones, booking reference, transportation mode, itinerary upload/short-lived signed file URL, fighter read-only panel.
- [x] Admin-sendable CTC MANAGEMENT travel reminder email with check-in and schedule-change advice and messaging direction. No background automatic scheduling included.

## Live verification still required

- [ ] Run the SQL migration on the actual Supabase project and inspect success.
- [ ] Verify Oct 24 5 fighters: Yusif Thomas, Jeremiah Jones, Treve Gielder, Brendan Simpson, Ali Kahzaal.
- [ ] Verify Nov 6 6 fighters: Jonathan Smith and Jameson Webber (Fight Capital **gym**, not event promotion), Bryant Franklin, Richie Irving III, Bradley Terwilliger, Brian Tracy.
- [ ] Activate a pending fighter after adding their verified email; confirm an already-created matchup appears under the same roster UUID.
- [ ] Sign in/out twice on Safari and Chrome, with two independent Admin devices.
- [ ] Send weight and bloodwork requests, have a test fighter respond, open each Admin notification, and clear it.
- [ ] Upload a test itinerary and verify that an unrelated fighter gets denied and that the right fighter can open it.
- [ ] Test Resend travel email delivery and links before sending real itineraries.

Note: Existing Netlify credentials, Supabase data, fighter records and publication can only be checked on the deployed site; JavaScript parsing and ZIP integrity tests by themselves cannot prove production login/session behavior.
