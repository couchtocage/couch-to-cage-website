# CTC Green Final Hotfix

Final fixes in this build:

- Admin fighter profile Request Weight Update and Request Bloodwork use a capture-level click handler for reliable mobile taps.
- Request buttons show confirmation, sending, success/already-pending, and visible error feedback.
- Admin Matchmaking can publish a saved matchup to the public Upcoming Fights page.
- Published matchup cards show a Published badge and can be unpublished without deleting the admin matchup.
- Public Upcoming Fights cards show the CTC fighter vs opponent, opponent record when supplied, and weight/discipline.
- Matchups require fighter, date, event/promotion, and opponent before publication.
- Cancelled matchups cannot be published.
- No new SQL migration is required; publication uses the existing public.events table.
