# Follow-up — Championship bouts, loading artwork, import confirmation

- November 6: Bryant Franklin and Jameson Webber are pre-marked as championship bouts. Matchmaking allows Yes / No on any fighter. No / N/A is not shown on cards. This metadata is kept in existing matchup notes, so no new SQL is necessary. If explicitly set to No, subsequent roster imports preserve that decision.
- Admin > More > Login Loading Artwork: upload, preview, save or reset image. Uses existing public ctc-media storage and site_settings permissions. Changes Admin and Fighter Portal post-login walk-in screens only, without modifying logos or original files.
- Existing published dated cards are recognized after deployment; otherwise each fight-card import confirmation is shown only until you click OK on that browser. Subsequent loads skip it, opening the existing completed fight-card editor; incomplete imports can retry idempotently.
- Deploy contents to your existing Netlify site. Do not create a new site. Existing Supabase setup already covers ctc-media and site_settings. This follow-up needs no new SQL.
- Verify live import (October 5, November 6), title-bout labels, Admin and Fighter Portal walk-in artwork after login. Automated checks are not a substitute for live Supabase/Netlify verification.
