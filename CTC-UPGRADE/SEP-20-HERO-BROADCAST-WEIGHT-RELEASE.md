# CTC Homepage hero / broadcast templates / roster export release

Based on `CTC-website-repaired.zip` (retains its cache-control fixes). The uploaded MOV was converted to H.264 MP4 for cross-browser playback and packaged as the **default homepage hero**. The old arena background remains the fallback if video playback fails. Existing Admin picture/video upload still overrides the default via `site_settings.ctc_home_hero_media`, and Reset now restores the uploaded video. If an older custom hero is already saved in Supabase, Reset is necessary to show this default.

Email Broadcasts has a template dropdown for existing application approval/decline, signup reminder, saved custom templates, and a generic travel reminder. Selection loads draft fields; sending still requires confirmation. Template selection is per browser and reflects the pre-existing localStorage template design. The travel template is generic; for an individual itinerary use the separate matchup Travel Details reminder.

Admin Fighters > Download by weight class filters the CSV export. All remains the default. No Supabase schema changes are required by these specific changes. Live Supabase permissions/email delivery, actual browser video playback, and iPhone share sheet require live testing.
