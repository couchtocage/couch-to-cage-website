# Grouped Matchups Hotfix

## Purpose
Public matchups now display underneath their existing Upcoming Fight instead of appearing as duplicate event cards.

## What changed
- `js/events-live.js`
  - Separates real Upcoming Fight records from public matchup helper records.
  - Groups every published matchup under its parent event.
  - Keeps the Upcoming Fights count based on real event cards only.
  - Includes a fallback matcher for matchup records published before this hotfix.
- `netlify/functions/ctc-admin-api.mjs`
  - Publishing a matchup now resolves the existing Upcoming Fight and records `CTC_PARENT_EVENT_ID` in the helper event notes.
  - A matchup cannot publish as a standalone duplicate when no existing event can be matched.
- `js/admin.js`
  - Matchup helper records are hidden from the Admin Upcoming Fights list/count so they do not look like duplicate events.
- `css/styles.css`
  - Added nested CTC matchup styling inside each public Upcoming Fight card.

## Deployment behavior
Deploy the full ZIP to Netlify. Existing published matchup helper rows remain compatible: the public page first uses the new parent marker and falls back to event/date/location matching for older rows.
