# CTC September 20 follow-up

Built from CTC-FIGHTER-ACCOUNT-MANAGER-LOAD-VIEW-BJJ-FINAL.zip.

- Header: removed floating LOGIN on all public pages; dropdown login remains.
- Preview: uses the live event-page CSS and mobile-specific single-column bouts.
- November 6: Flex Fight Series 64, venue/time remain TBA; reload November card in Admin to update the saved public event. Existing fighter records and published matchups are not deleted.
- Fighter request inbox: request refresh now starts as soon as linked profile resolves, independent of walk-in artwork loading. Existing focus/visibility/30-second refresh remains. If the fighter dismissed a pending request, Admin re-request clears its dismissed flag so the notification reappears. A new request for the same still-pending undismissed item is not duplicated. If live notifications still fail, screenshot the exact fighter request error; a Netlify/API or Supabase issue cannot be verified offline.
- Join form: MMA, Muay Thai, Kickboxing, BJJ / Grappling only; keeps BJJ follow-up fields.
- Homepage hero editor under Admin > Home Page; uses Gallery's ctc-media storage and site_settings. Uploaded file is preserved without crop or re-encode; video is autoplay/muted/looped inline. Original arena is available via RESET TO ORIGINAL. Only homepage hero is affected; other page artwork remains.

No database migration for new hero setting if site_settings and ctc-media storage permissions are already configured. Test media upload, persistence, video playback on iPhone, and publication on existing Netlify site.
