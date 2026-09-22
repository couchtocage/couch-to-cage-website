# CTC card preview, activation, and usability update

Based on CTC-ACTIVATION-FIRST-MATCHUP-LOGIN-NAV-FIX.zip; deploy into **existing** Netlify site. No SQL migration for this patch (uses previous CTC notification dismissals table and site_settings table).

- OCT 24 and NOV 6: `VIEW CARD` displays same reusable public card renderer inside Admin with unsaved drafts clearly marked; `BACK TO EDITING`, `VIEW LIVE SITE`, top/bottom close.
- `ACTIVATE … FIGHTERS`: previews card-specific roster/account/email status, asks for explicit confirmation, skips already-active/missing-email/ambiguous profiles, creates only verified-roster-email accounts, emails new credentials from CTC Management, then reloads that card; email failures reported. Same-name matching remains an Admin-reviewed workflow; do not guess new profiles.
- LOAD count reports already linked, newly linked, attached, and public counts instead of per-run count as total. No first fighter auto expanded.
- A fighter with assigned matches has `VIEW MATCHUP` to reopen the saved editor/travel details. Tapping an otherwise inactive matchup card toggles that card, not a fighter profile; bottom collapse control also available.
- Notifications only appear for completed fighter submissions; CLEAR ALL is per-admin and does not delete records.
- Public card shows exactly one level-appropriate record. Login link visible in nav and high-contrast top-right mobile pill.
- Walk-in art always uploads original bytes, keeps object-fit:contain and supports safe zoom **out** 60–100%, shared Admin/Fighter. Templates greet Hello CTC Family.

## Live verification required

1. Confirm both Admin functions have `SUPABASE_URL`, service key and Resend key configured; newly activated fighters need a real roster email.
2. Try VIEW CARD before/after saving a draft, and VIEW LIVE SITE to compare published result.
3. Use ACTIVATE only after reviewing who is not active and eligible. Verify CTC email arrival; accounts can activate even if delivery fails (Admin receives error).
4. Confirm request inbox shows only completed responses and CLEAR ALL survives refreshing on the same admin account.
5. Confirm site navigation on phone and desktop and loading art uncropped.
