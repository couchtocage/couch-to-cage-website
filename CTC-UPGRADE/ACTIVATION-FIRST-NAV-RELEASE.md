# Activation-first fight cards and public login navigation

Base: CTC-CHAMPIONSHIP-LOADING-ART-FIGHT-CARD-FIX.zip. All pre-existing assets, Supabase configuration and prior features preserved.

- LOAD OCT 24 / LOAD NOV 6 do **not** call browser confirm or create roster profiles. They reconcile existing **activated** fighters only; repeat clicks are safe and open the dated Matchmaking editor.
- Jeremiah Parker Jones is the confirmed October 24 roster name; the importer accepts the specific Jeremiah Jones alias, only on a uniquely matched activated profile. Unmatched/ambiguous names are held for review, never assigned to guessed profiles.
- Re-running after another fighter activates attaches the newly active fighter. Existing published matchup edits are preserved; no invented emails or new accounts are created.
- A visible LOGIN button sits outside the mobile dropdown on every public page and leads to login.html, with Fighter Portal and CTC Management/Admin links.
- Upcoming Fights now sits directly below Gallery in the navigation on public pages.
- Counts represent **actually attached and publicly visible** fighters, not the full confirmed list while someone is waiting for activation.
- No additional Supabase SQL required. Deploy to the existing Netlify site. Live API/database behavior must be verified with the connected site, not assumed from offline checks.
