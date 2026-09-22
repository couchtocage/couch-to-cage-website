# Upcoming Fight Selection Hotfix

## What changed
- Matchmaking now loads current entries from the existing **Upcoming Fights** table.
- The **Add Matchup / Edit Matchup** form includes an **Upcoming fight** dropdown.
- Choosing an upcoming fight automatically fills its fight date, promotion, venue, city, state, and discipline.
- Existing manual matchup fields remain editable, so custom fights still work.
- Public matchup-generated event rows are excluded from this dropdown to prevent duplicate/self-referencing choices.

## Files changed
- `js/admin-roster-v2.js`
- `netlify/functions/ctc-admin-api.mjs`
- `admin/index.html` (cache-buster only)

## Validation
- JavaScript syntax checked with Node.
- ZIP integrity checked before release.
