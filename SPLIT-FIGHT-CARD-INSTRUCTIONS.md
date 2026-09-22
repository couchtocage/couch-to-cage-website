# CTC Oct/Nov independent fight cards

Admin → More → Matchmaking offers:
- LOAD OCT 24 FIGHT CARD: Flex Fight Series 63 / Glow Bash 2; Gossip Night Club, Melville NY.
- LOAD NOV 6 FIGHT CARD: New York NY / venue TBA.
- NEW CARD + MATCHUPS: opens Public Fight Calendar to create an event, then starts a matchup draft with that new event selected.

Each dated button previews matches to the live fighter roster, confirms separately, and performs independently. Fighters without portal logins can publish. Missing/ambiguous names are skipped. No fighter or event is stored in the ZIP itself: **live cards do not appear until the authenticated Admin import successfully saves to Supabase**. If Admin reports session_not_found/403, the write did not complete; use a fresh Admin login.

The site still uses the original matchups by fighter roster ID, so activating a portal account does not require reassigning a fight.
