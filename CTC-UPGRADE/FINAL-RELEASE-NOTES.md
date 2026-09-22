# CTC Final Follow-up Release

Included in this build:
- Portal signup list defaults to All Fighters and uses separated fighter cards.
- Admin and signup lists open the same View Profile experience.
- Admin fighter profile uses collapsed sections and includes weigh-in history.
- Admin can flag a weigh-in invalid and leave a correction comment.
- Fighter can edit a weigh-in correction; admin comments display as Needs correction.
- Dedicated Admin Notifications tab (no dashboard notification bar) with All, Weight, Bloodwork, Messages and Requests filters.
- Fighter profile edit sections start collapsed, including Fighter Information, Personal/Travel, and Walkout Song.
- Fighter bloodwork history allows pending cancellation and rejected/expired deletion.
- Admin bloodwork supports rejected/expired deletion.
- Mobile Approval/Decline email template editor layout cleanup retained.

## Required before deploy
Run `CTC-UPGRADE/DATABASE-CHANGES.sql` in Supabase SQL Editor. It is additive and includes the request table plus final weight/document policies.

Keep the prior working deployment available for rollback. Live Supabase/Auth/Resend behavior cannot be fully exercised from the offline build environment.
