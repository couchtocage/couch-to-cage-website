# CTC September 19 follow-up — after on-device testing

This release descends from `CTC-ADMIN-FIGHTS-NOTIFICATIONS-TRAVEL-FINAL.zip`. It is a complete website ZIP for deploying to your EXISTING Netlify site, not a replacement site or new Supabase project. No source photos, partner logos, or CTC art were altered.

## What changed

- **Dated cards:** The October 24 and November 6 load buttons save the dated roster fight card, then switch the existing matchmaking list into that date's editor with the first matchup expanded. A SHOW ALL CARDS control restores the full list. The import reports requested vs. actually saved matchups, roster creation errors, public feed counts, and refresh errors. Re-imports reuse roster fighter and matchup IDs when the data matches. If the live roster schema prevents pending-profile creation, the exact reason is shown instead of falsely claiming success. A mismatched public fighter count is explicitly flagged; the public fight-card API no longer caches stale content for 60 seconds.
- **Fighter request notifications:** A new authenticated `ctc-fighter-requests` Netlify function reads, clears, and completes ONLY the signed-in fighter's own request records via their linked roster ID. Fighter Portal no longer turns a request-fetch failure into a false "No new notifications." Notices open the correct Weigh-in or Bloodwork tab; dismissing them does not delete the request audit history. The portal refreshes the inbox when refocused and roughly every 30 seconds while open.
- **Fighter Portal layout:** Customize Portal Background is directly after Fighter Picture; Account Settings contains one collapsible box with separate Change Email and Reset Password controls immediately after Fighter Information; Personal & Travel Information is above Walkout Song. Missing gym is allowed when the fighter saves the profile, and public cards continue to omit a missing gym. No CTC artwork or fighter photos were generated or replaced.
- **Fight counts:** The public fight-card CTC fighter count is preserved, including the number at the top and OUR FIGHTERS count.

## Deployment

1. Keep the Supabase SQL migration you already ran; this follow-up does not introduce another SQL migration.
2. Deploy all files from this ZIP to the **existing** CTC Netlify site; do not start a new site. The new Netlify function must deploy with the static files.
3. In Admin, tap LOAD OCT 24 FIGHT CARD, review the preview and tap **OK** to confirm the save; wait for the final status. Confirm **5/5 saved and 5 public**. The card should open in Matchmaking for edits. Repeat for November 6: **6/6 saved and 6 public**. Do NOT interpret the preview count of 2 live profiles as the final saved count. Canceled dialogs do not save anything.
4. If any roster creation error appears, copy the exact import status; it may signal an existing Supabase constraint the build cannot safely guess around. Pending roster fighters need their verified email before they can activate and securely link to their existing matchup.
5. From Admin, request bloodwork and a weigh-in for a fighter whose verified account you can log into. Refresh/return to their portal, confirm both notifications show, open the corresponding tabs, then clear the notifications. Check Admin status after submission.
6. In a fighter portal, verify Customize Background appears under picture, Account Settings under Fighter Information, Travel above Walkout Song. Test email/password actions with a disposable test account, not a production fighter.

## Verification scope

Offline mocked API tests cover Oct (5 fighters), Nov (6 fighters), re-import stability, public fight-card output, per-fighter request authorization, dismiss/complete actions, and existing travel actions. JavaScript parsing and ZIP integrity are checked. **Live Netlify/Supabase sign-in and real email delivery cannot be verified from this build environment**; verify against the deployed site before announcing everything is working.
