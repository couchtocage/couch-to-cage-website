FOLLOW-UP BUILD — IMPORTANT DATABASE PREREQUISITE

Before testing requests on live, run CTC-UPGRADE/DATABASE-CHANGES.sql in the connected Supabase SQL Editor. The live error public.ctc_fighter_requests missing indicates that migration has not been run or has not been exposed in the schema cache. The SQL file is included, NOT executed by uploading a ZIP. Do not substitute the earlier fighter_requests SQL: its table/columns and RLS do not match this application.

Static checks do not prove real Supabase login, upload, or request delivery. Keep previous working ZIP for rollback.
