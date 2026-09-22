# CTC Flex monthly template + reply handling

Built from CTC-ROSTER-FIRST-AUTO-CONNECT-MATCHUPS.zip. No schema changes and no rebuild of the site.

1. Deploy the ZIP to Netlify.
2. Admin → More → Public Fight Calendar → Add Fight → select **Flex Fight Series**. Enter series number (e.g. 63), subtitle (e.g. Glow Bash 2), date, time with timezone, venue, and city/state. Set Published, save. Reuse the preset every month: every event gets its own notes, logo and colors. Combat Night and Tuff-N-Uff remain presets; Other remains freeform. Fight Capital is a gym, not a promotion.
3. Upcoming Fights cards link to fight-card.html?event=<event-id>. Detail page uses actual public matchups, portrait/name/city/record/weight/discipline and opponent only when entered. The new user-provided Flex logo is bundled at assets/partners/flex-fight-series-new-user.png. Upper-right Bleed Blue. Touch Gold. remains.
4. For Oct 24, 2026 choose Admin → More → Matchmaking → LOAD OCT 24 + NOV 6 FIGHT CARDS; review before committing. Oct 24 is Flex Fight Series 63: Glow Bash 2 at Gossip Night Club, Melville, NY, 3:00 PM – 11:30 PM EDT. Nov 6 remains New York, NY, venue/promotion TBA. Existing venue/date event rows are reused where uniquely matched; ambiguous matches are refused. No deploy changes the live Supabase database automatically.
5. Existing roster ID based matching and auto-association to Fighter Portal after activation are unchanged; public posting does not require account activation.
6. Outgoing Resend messages (Admin approvals, activation credentials, broadcasts and fighter account security notices) still send FROM fighters@couchtocage.com and now use REPLY-TO officialcouchtocage@gmail.com. Supabase-managed authentication verification/reset emails are sent by Supabase and are NOT changed by this code; configure their reply address in Supabase SMTP if desired. Email delivery and actual incoming replies require a live test after deployment.
