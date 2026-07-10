# CTC ADMIN V1 — NEXT STEPS

This package adds a real private admin page at:

`couchtocage.com/admin/`

Version 1 manages:
- Upcoming events
- Fight clips
- Published/draft status
- Featured clips
- Admin login

It does not replace the current Netlify fighter registration system yet.

## STEP 1 — Create the database tables
1. Open Supabase.
2. Open SQL Editor.
3. Open `supabase-setup.sql` from this package.
4. Copy the entire script into the SQL Editor.
5. Press Run.

## STEP 2 — Create your admin login
1. In Supabase, open Authentication.
2. Open Users.
3. Choose Add user / Create user.
4. Use `Officialcouchtocage@gmail.com`.
5. Create a strong password.
6. Turn off public user signups in Authentication settings so strangers cannot create admin accounts.

## STEP 3 — Get two Supabase values
In Supabase open Project Settings → API and copy:
- Project URL
- Publishable key / anon key

Do not use or publish the service-role secret key.

## STEP 4 — Add the values
Open `admin/config.js` and replace:
- `PASTE_YOUR_PROJECT_URL_HERE`
- `PASTE_YOUR_ANON_KEY_HERE`

## STEP 5 — Upload to GitHub
Upload all files and preserve the `admin` folder. Then connect the GitHub repository to the existing Netlify project.

After deployment, visit:
`https://couchtocage.com/admin/`

The normal public site remains available at:
`https://couchtocage.com`
