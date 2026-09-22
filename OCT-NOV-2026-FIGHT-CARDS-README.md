# October 24 and November 6, 2026 — NYC fight cards

Deploy this ZIP to Netlify, then sign in to Admin → More → Matchmaking and tap **LOAD OCT 24 + NOV 6 FIGHT CARDS**. Review the roster-match preview and confirm. **Deployment alone does not change the live database**; the button is an authenticated, explicit action.

- 2026-10-24, New York, NY, Venue TBA: Yusif Thomas, Jeremiah Jones, Treve Gielder, Brendan Simpson, Ali Kahzaal.
- 2026-11-06, New York, NY, Venue TBA: Jonathan Smith, Bryant Franklin, Richie Irving III, Bradley Terwilliger, Jameson Webber, Brian Tracy.
- Fight Capital is the **gym** for Jonathan Smith and Jameson Webber, NOT a promoter or event name. The sync updates these two roster gym fields, shows their gym under their name on the public card, and leaves the event promoter TBA unless an existing event specifies it.
- Actual roster data supplies fighter photo, record, weight and discipline. Unknown info stays unknown; opponent is omitted until entered.
- The sync matches existing fighters by exact normalized first + last name. Names not found or ambiguous are skipped and shown in Admin. Fix the roster and press the button again.
- Fighter matchup rows attach to `fighter_id`, independent of `auth_user_id`. When a fighter activates and their email links to their existing roster row, the fight appears under the Fighter Portal Fights tab. No login account or email is fabricated.
- Repeat runs reuse events/matchups rather than intentionally duplicating them. Conflicting existing fighter event assignments are skipped, not overwritten.
- Before public launch, validate the live Supabase matchups and the site after this one-time operation; the ZIP cannot directly connect to the user's database.

- **Publication is independent of activation:** fighter_matchups.fighter_id points to the live roster row before the fighter has an auth_user_id. Once that email is verified and linked to the same row, signing in/reloading the Fighter Portal retrieves the saved fight. Opening Fights also refreshes that tab. Fighters with access explicitly disabled still need management to enable access.
- If the previous Oct/Nov ZIP was already run, deploy this ZIP and run the same button again to correct the two gym labels and remove Fight Capital from event/promotion text without deliberately duplicating fights.
