# CTC follow-up changes — September 19, 2026

Implemented in the actual website files:
- Fighter requests panel stays hidden if the requests table is absent or cannot be read, instead of displaying a raw Supabase error to fighters. Existing per-notification X remains; dismissing is not completion.
- Admin Bloodwork rows now have View Profile and Request Bloodwork actions, using the existing Netlify request-create endpoint.
- Admin Portal Accounts now have a direct View Profile action; roster View Profile buttons now have an explicit click handler. Existing message View Profile dispatch remains.
- More consistent mobile action alignment and fighter portal button centering.

Needs live verification:
- Supabase `ctc_fighter_requests` table and RLS migration must be installed before requests can work. Do not run Gemini's unrelated `fighter_requests` SQL.
- Actual email, notifications, bloodwork uploads, and permissions require authenticated browser tests.
- The screenshot's very cluttered roster may be from a cached older deployment or different JS; the live roster v2 already renders cards with headshots and View Profile. Test with a cache-busting reload after deploy.
- Bloodwork now has status and expiration summary cards plus dated upload history and Latest label; requires live-data verification.
- The image/text alignment in the fighter portal header is only partially addressed; inspect on actual iPhone.
