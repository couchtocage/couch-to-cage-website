# CTC Sep 21 — Live Dashboard / Portal / Bloodwork reliability

This build is based on `CTC-INSTALLABLE-APP-PICTURE-GUIDE-ATTACHMENTS.zip`.

## Changes
- Admin successful sign-in now lands on **Dashboard / Overview** instead of reopening a previously saved Admin tab.
- Portal account totals are calculated from the **live Supabase fighters roster** (`auth_user_id`, portal access, active roster status), independent of Fighter Messages.
- Portal Accounts refreshes directly from the live `fighters` endpoint on Admin ready and whenever the Portal Accounts tab is opened.
- Fighter Messages now loads even if the attachment migration has not yet been run; attachment columns fall back cleanly instead of breaking the inbox.
- Attachment errors now explain which one-time SQL file is required instead of dumping raw Supabase JSON.
- Bloodwork has direct **Download** controls in Bloodwork, Fighter Profile, and completed Bloodwork notifications.
- Homepage default hero video is re-encoded from the original high-resolution MOV at 1920x1246 H.264, with a high-resolution poster/fallback and stronger iPhone inline-autoplay handling.
- Existing local-scope Admin sign-out remains intact. Separate devices/browsers use independent Supabase sessions; one Admin signing out does not revoke another Admin's token.

## One-time attachment setup
If message attachments have never been configured on the live Supabase project, run **only** `CTC-MESSAGE-ATTACHMENTS-RUN-ONCE.sql`. Do not blindly rerun older setup SQL files. The inbox itself will still load without this migration; sending/opening attachments requires it.

## Live checks after deployment
1. Admin sign-in -> Dashboard immediately after the existing walk-in art.
2. Dashboard Portal Accounts shows a real live count rather than `loading…`.
3. Open Portal Accounts and compare active rows with the dashboard count.
4. Open Fighter Messages; existing text conversations load even before attachment SQL.
5. If attachment SQL is installed, send a small image/PDF both directions and open it.
6. Upload fighter bloodwork, then verify Admin can download it from Bloodwork, Fighter Profile, and the completed notification.
7. Open homepage in iPhone Safari and installed PWA; hero should show the sharp poster immediately and the video should play muted/inline when iOS permits autoplay.
8. Sign into Admin on two separate devices/browsers simultaneously; sign out on one and verify the other remains active.

No additional database migration is required for portal counts, dashboard landing, or bloodwork downloads.
