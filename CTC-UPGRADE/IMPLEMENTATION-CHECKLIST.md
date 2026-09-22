# Implementation checklist — NOT YET COMPLETE

- [ ] One shared responsive CTC design system for buttons, forms, cards, dialogs and nav.
- [ ] Full-screen original Vegas artwork and floating, no-scroll Admin/Fighter login forms; readable slogans and official logo.
- [ ] Compact password recovery and working set-new-password flow on both account types.
- [ ] Roster cards with actual fighter headshots and clickable full profiles across Admin sections.
- [ ] Organized full fighter profile with accurate age, contact, travel, fight and document fields.
- [ ] Collapsible Admin Edit Fighter with Save/Cancel and safe unsaved-changes handling.
- [ ] Optional N/A buttons on eligible form fields only.
- [ ] Fighter headshot crop editor: fit entire image initially, pan/zoom, preview, save/cancel, expand.
- [ ] Fighter Weight Tracker summary and weigh-in history.
- [ ] Weight and bloodwork requests with actionable dashboard notifications, dismissal and status/history.
- [ ] Fighter contact edits and simple collapsible walkout song editor.
- [ ] Professional Admin inbox and Fighter chat with unread behavior and profile links.
- [ ] Matchmaking cards grouped by event/date; actual headshots and fighter profile links.
- [ ] Multiple matchup cards independently expandable/editable, individual Save/Cancel, no loss of unsaved work.
- [ ] Regression tests for Netlify, Supabase, Resend, Gallery MOV, forms, broadcasts and existing data.

## Current pass (verified locally, not live)
- [x] Inspect actual ZIP file map and relevant existing features.
- [x] Patch floating fighter login viewport background and mobile margin.
- [x] Add MOV/QuickTime to admin video file picker.
- [x] Confirm before hiding a dirty matchup editor; preserve its draft.
- [ ] Validate all above on actual iPhone and connected Supabase/Netlify.
