# CTC · Fighter Account Manager / matchup controls update

Built from `CTC-CARD-PREVIEW-ACTIVATION-AND-ADMIN-FIXES-SEP20.zip`, retaining the existing site architecture, Netlify functions, Supabase, original artwork, and existing saved fighter data.

## Deployment
Deploy this ZIP into the **existing Netlify site**. No new Supabase SQL is required for the new Account Manager; it uses your current Admin-authorized Netlify API and existing fighter roster. Keep `SUPABASE_URL`, the Supabase service key, and `RESEND_API_KEY` configured. Verify email delivery on the real site; offline tests mock the external services.

## Changes
- Admin → More → **Fighter Account Manager**: select one existing fighter or the Oct 24 / Nov 6 confirmed list; preview exact eligibility; create only existing roster-linked accounts with a nonempty roster email; skip active, inactive, missing and ambiguous profiles.
- A single fighter can receive a unique manually chosen temporary password (minimum 12 characters, containing letters and a number), OR a cryptographically generated temporary password. Full-card activation always generates a separate password per eligible fighter. A CTC-branded `Hello CTC Family,` access email is sent, and initial login prompts for a personal password. Do not email new credentials to a guessed address or reset accounts that are already active.
- Email-delivery failures are reported without exposing the generated password in API results. Fighters can use Forgot Password if delivery failed after the account was created.
- Matchmaking card controls: **LOAD | VIEW** in a fixed two-column layout for each date; activation moved to Account Manager. LOAD does not pop a repeated confirmation or open the top fighter editor.
- Count status now distinguishes saved matchups *on the date* from matchups verified against the selected parent event. Existing fights pointing to a different event ID are **not** automatically overwritten; use Matchmaking to review them.
- Mobile public LOGIN placement centered below hamburger, with Login retained inside the dropdown; existing left/right artwork untouched.
- Existing BJJ / Grappling discipline on Join Fighter now reveals optional belt rank, Gi/No-Gi, preferred competition weight and experience fields. The same CTC roster and existing Netlify form remain in use.

## Live validation
1. Log in to Admin → More → Fighter Account Manager. Check an active roster fighter (no new password or duplicate email) and a newly eligible roster fighter (generated or manually chosen, one-at-a-time). Confirm the CTC email arrives and initial login requests a private password.
2. Check October 24 and November 6 **LOAD | VIEW** remain paired and never activate accounts themselves; review mismatched event IDs before editing/reassigning.
3. Confirm mobile Login is visible below the hamburger without covering either motto; BJJ fields show only if BJJ / Grappling checked and flow through the current form.
4. Confirm all 11 intended fighters are not represented as published until they have real roster accounts AND real saved/published matchups.

**Offline checks cannot establish actual Resend inbox delivery, real Supabase authorization, or live Netlify publishing.**
