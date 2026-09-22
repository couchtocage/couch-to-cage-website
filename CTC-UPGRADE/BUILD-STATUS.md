# Build status — inspected source, not live deployed

## Verified in this archive
- Existing project has admin/index.html, fighter-portal/index.html, css/, js/, Netlify functions, and Supabase setup SQL.
- Existing code ALREADY includes roster/profile UI, weight summary/history, notification UI, independent multi-card matchmaking editing, and photo crop controls. Those are not newly created in this pass and their live Supabase behavior is unverified.
- Adjusted fighter login background to cover the viewport behind the floating login card, with larger mobile margins.
- Added explicit QuickTime/MOV MIME types to the admin video picker. This does NOT guarantee server-side MOV support or browser codec playback.
- Added confirmation before hiding a dirty matchup editor; its draft remains in memory. Individual card saving remains the existing Netlify API path.

## Not completed or not verified
- End-to-end iPhone Safari layout, headshot cropping, password recovery, Supabase auth, private messages, gallery upload, admin request lifecycle, and real matchmaking saves need live testing.
- No SQL was executed and no credentials were used. Do not run Gemini's `fighter_requests` SQL; the existing `CTC-UPGRADE/DATABASE-CHANGES.sql` uses the actual `ctc_fighter_requests` table and `fighters.auth_user_id` mapping, but requires review against the live schema.
- Full design-system consolidation and exhaustive regression across all screens are not completed. Do not represent this as a fully finished upgrade.

## Deployment
Unzip at the site root, inspect CTC-UPGRADE/DATABASE-CHANGES.sql against the live Supabase project before applying it, then deploy the site root to Netlify. Do not upload the enclosing folder as an extra directory.
