# CTC installable app, picture-email guide and attachments

Based on `CTC-HOMEPAGE-HERO-BROADCAST-TEMPLATES-WEIGHT-ROSTER.zip`. The full CTC website, original images and existing hero are retained. This is an **installable web app (PWA)**, not an Apple App Store or Google Play listing.

## Required deployment order

1. Back up the live Supabase database and your current Netlify deploy. **Before uploading this ZIP, run only `CTC-MESSAGE-ATTACHMENTS-RUN-ONCE.sql` in your existing Supabase SQL Editor.** Do not blindly rerun historical setup files. This additive migration extends `ctc_messages` and creates the **private** `ctc-message-attachments` bucket. Confirm SQL success before testing file messages.
2. Deploy this **entire ZIP** to your **existing** Netlify site with the same production configuration. Keep `SUPABASE_URL`, `SUPABASE_SECRET_KEY` (or `SUPABASE_SERVICE_ROLE_KEY`) and `RESEND_API_KEY` in Netlify server environment variables only. No keys belong in browser code.
3. Open `https://couchtocage.com/` and `https://couchtocage.com/install.html`. On iPhone Safari: Share → Add to Home Screen → Add. On Android Chrome: three dots → Install app / Add to Home screen. The existing site and portals are still available without installation.
4. Admin → Email Broadcasts → **Install the CTC app — illustrated guide** → Send test to yourself. Confirm the 8 picture instructions and link render in your email client; images may require tapping “display images.” Then choose your audience and send the broadcast. The greeting remains “Hello CTC Family,”.
5. Admin → Fighter Messages: send a small test image or PDF to a test fighter; check it on their portal; send a file back from the portal; confirm opening either file requires the correct sign-in. Test plain text messages and Admin “Delete message” / “Delete conversation” as well.
6. Optional: Admin → Email Broadcasts → attach a file, send **TEST TO ME**, then send to the correct audience. Broadcast attachments are emailed to each recipient; never include private documents in an all-fighter broadcast.

## Limits and security

- Files supported in private messages: JPG, PNG, WebP, HEIC/HEIF, PDF, TXT, DOC and DOCX, **up to 3 MiB per file**. The conservative limit accounts for base64 expansion in a Netlify request. Only one file per message. Existing text-only sending stays available.
- Broadcast files: JPG, PNG, WebP, PDF, TXT, DOC or DOCX, **up to 3 MiB**. The install-guide **pictures are hosted** on `couchtocage.com` and are included in the install email without an oversized PDF attachment.
- Private chat files are stored in a private bucket; the new function verifies the Supabase login and exact fighter association or Admin membership, then issues a short-lived signed URL. **Never make this bucket public.** Neither site HTML nor the email contains Supabase secrets.
- Admin deletes are permanent for **both Admin and fighter** and remove linked private files when Storage responds successfully. Deleting a chat is not the same as dismissing a notification.
- App shell caches only the offline notice and official app icons. **No private portal, Admin, message, itinerary, API or authenticated HTML is cached.** Internet is required for live CTC features. This ZIP does **not** add push notifications or app-store publishing.

## Offline checks versus live checks

Bundled JS syntax checks and offline mock suites cannot prove production Supabase permissions, Storage uploads/signing, Resend delivery, install behavior in Safari, or two-person Admin sessions. Test these against a staging environment first if available. If the schema migration fails, stop and capture the SQL error rather than redeploying old migrations.
