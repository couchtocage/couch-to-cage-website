# CTC upgrade workspace

This package is based on CTC-Website-RELEASE-ROSTER-AUTH-REFINEMENTS.zip. The CTC-UPGRADE folder is a development handoff, NOT a claim that the requested upgrades are implemented. Do not deploy as the promised complete upgrade.

Key existing code: admin/index.html; js/admin-roster-v2.js (roster, profile, matchmaking, bloodwork); js/admin.js; fighter-portal/index.html and portal.js; fighter-portal/ctc-photo-upgrade.js; netlify/functions/ctc-admin-api.mjs; assets/ctc-vegas-login-approved.jpeg.

Implement and test the checklist, run only reviewed SQL migrations, then create a deployable ZIP from the site root. Never put service-role secrets in browser JS.
