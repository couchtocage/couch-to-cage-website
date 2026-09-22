# Roster-first matchmaking and public publishing

Admin → Fighters → View Profile → Assign Matchup (or Assign Matchup directly on fighter card), or Admin → More → Matchmaking → Add Matchup.

Choose any existing fighter by roster record, regardless of portal signup, then choose an existing Upcoming Fight, enter the fight info and tap Save & Publish. This saves the fighter_matchups row by fighters.id, and publishes the same row to the public Upcoming Fights card. Opponent is optional.

In Admin, Pending Portal Activation / Connected to Fighter Portal are DERIVED from fighters.auth_user_id and displayed separately from fight status (pending/confirmed/etc). A published fighter-only matchup is public even while portal signup is pending. A fighter with portal_status disabled may be scheduled publicly, but must be re-enabled by Admin before login; publishing never bypasses access controls.

After the fighter activates with their roster email, the preexisting link-fighter function attaches auth_user_id to the SAME fighters.id. Portal load() and Fights tab then query fighter_matchups by fighter.id. No duplicate row, resend, admin relink or extra SQL column is needed. Ensure the existing CTC-PORTAL-MIGRATION.sql fighter_matchups select policy is installed. Fights query errors now display instead of showing a misleading empty state.

The October 24 and November 6 load button remains safe to rerun. It matches only unique roster names and reports missing/ambiguous people. Fight Capital is the gym only for Jonathan Smith and Jameson Webber.

Important: deployment updates application code; it does NOT execute the one-time October/November Admin import and does not write to the live database by itself.
