# Fighter Portal Background

- Fighters can upload their own portal header background from Profile.
- Image is cropped/repositioned in a 16:9 preview and exported client-side at 1920x1080 JPEG.
- CSS uses `cover` so the header remains filled on mobile and desktop.
- Fighter can reset to the original CTC default background.
- Image uses the dedicated `fighter-portal-backgrounds` bucket in the fighter's own auth folder.
- Run `FIGHTER-PORTAL-BACKGROUND-SETUP.sql` once before testing the save button.
