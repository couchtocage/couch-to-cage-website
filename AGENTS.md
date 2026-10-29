# AGENTS.md — Couch To Cage (CTC)

Sandbox/agent notes only. The repo is the source of truth for the site itself; these are
the non-obvious things about running it.

## What this project is

Plain multi-page static site (HTML/CSS/JS, no build step, no package.json) deployed on
Netlify. Netlify Functions live in `netlify/functions/`. Data and auth come from Supabase.

## Running it in the Base44 sandbox

```sh
docker compose -f docker-compose.base44.yml up -d --build
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/
```

- `web` runs `base44-dev-server.mjs` on `node:22` with the repo bind-mounted. That
  dev-only server reproduces Netlify: it serves the repo root (pretty URLs like
  `/admin` → `/admin/index.html`, matching `_redirects`) and routes
  `/.netlify/functions/<name>` to the real handlers in `netlify/functions/<name>.mjs`.
- No dependencies to install and nothing to build; edits are live on refresh.
- `/run/base44/app.env` is loaded last so dashboard secrets override the placeholders in
  `.env.base44-defaults`.

## Things that surprise people

- **Two Supabase projects.** Public pages and the admin/portals use `xlxdkftgfsbildenubkx`
  (via `js/supabase-config.js`, `js/supabase-admin.js`) with the public publishable key
  that is already committed. `admin/config.js` points at a different, older project
  (`qrrsifrbgalpkwemxwjs`) and is not what admin pages load — leave it alone.
- **The public pages are live against production Supabase.** The preview reads the real
  data; anything you save through admin/portal forms writes to it. Do not create test
  records in it (create, assert, then delete only records you created).
- **`/.netlify/functions/*` need `SUPABASE_SECRET_KEY`** (and `RESEND_API_KEY` for email).
  Without them the public pages still render, but fight-card detail calls return 503 and
  admin roster / fighter / coach portals fail on their API calls. `ctc-public-fightcards`
  is the only one the public site calls directly, and `js/events-live.js` falls back to
  published matchup notes when it fails.
- **"0 upcoming fights" is real data**, not a bug: `js/events-live.js` filters
  `event_date >= today`, and the Supabase events currently stored are dated 2026-10-24.
- **The preview browser can't open these pages with SPA navigation** (the site is a set of
  separate documents). Load routes with a real URL request — `curl` for responses, a
  direct page load for visuals.
- Login-gated screens (admin, fighter portal, coach portal) need real Supabase accounts and
  cannot be verified automatically; open them in your own preview after signing in.
- `sw.js` is an online-first service worker: navigations are always fetched fresh, so it
  does not serve stale pages during development.
- SQL notes (`RUN-THIS-ONCE-IN-SUPABASE.sql`, `*-SETUP.sql`, `CTC-UPGRADE/`) are one-time
  Supabase migrations already applied in production. Do not run them from the sandbox.

## Verification

- `curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/` → 200.
- All routes return 200: `/`, `/admin/`, `/fighter-portal/`, `/coach-portal/`,
  `/login.html`, `/events.html`, `/gallery.html`, `/join.html`, `/contact.html`,
  `/sponsors.html`.
- `curl -s http://localhost:3000/.netlify/functions/ctc-public-fightcards` returns
  `{"error":"CTC fight-card service not configured"}` with status 503 until
  `SUPABASE_SECRET_KEY` is set — that proves the function router works.
