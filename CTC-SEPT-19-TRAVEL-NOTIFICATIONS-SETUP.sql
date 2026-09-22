-- CTC September 2026: run in Supabase SQL Editor BEFORE deploying updated site.
-- Pending fighters do not have an invented email; link verified email before portal signup.
ALTER TABLE public.fighters ALTER COLUMN email DROP NOT NULL;
-- Pending name profiles should not be silently recreated by concurrent Admin imports.
-- Resolve pre-existing duplicate unactivated/no-email names first if this index fails.
CREATE UNIQUE INDEX IF NOT EXISTS ctc_pending_roster_name_unique
ON public.fighters (lower(trim(first_name)),lower(trim(last_name)))
WHERE email IS NULL AND auth_user_id IS NULL;

CREATE TABLE IF NOT EXISTS public.ctc_admin_notification_dismissals (
 admin_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 request_id uuid NOT NULL REFERENCES public.ctc_fighter_requests(id) ON DELETE CASCADE,
 stage text NOT NULL CHECK(stage IN ('pending','completed')),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(admin_user_id,request_id,stage)
);
ALTER TABLE public.ctc_admin_notification_dismissals ENABLE ROW LEVEL SECURITY;
-- Only the authorized Netlify Admin API uses the service key for notifications.

CREATE TABLE IF NOT EXISTS public.ctc_fighter_travel (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 matchup_id uuid NOT NULL UNIQUE REFERENCES public.fighter_matchups(id) ON DELETE CASCADE,
 fighter_id uuid NOT NULL REFERENCES public.fighters(id) ON DELETE CASCADE,
 mode text NOT NULL DEFAULT 'flight' CHECK (mode IN ('flight','bus','train','car','other')),
 carrier text,service_number text,booking_reference text,
 depart_from text,arrive_at text,departure_at text,arrival_at text,depart_timezone text,arrive_timezone text,
 terminal text,gate text,travel_url text,notes text,itinerary_path text,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ctc_fighter_travel ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Fighter sees own travel" ON public.ctc_fighter_travel;
CREATE POLICY "Fighter sees own travel" ON public.ctc_fighter_travel
 FOR SELECT TO authenticated USING (
 EXISTS(SELECT 1 FROM public.fighters f
 WHERE f.id=ctc_fighter_travel.fighter_id AND f.auth_user_id=auth.uid()));
-- Only Netlify Admin API may INSERT, UPDATE or DELETE private travel records.
INSERT INTO storage.buckets (id,name,public) VALUES ('ctc-travel','ctc-travel',false)
 ON CONFLICT(id) DO UPDATE SET public=false;
-- Do NOT add public storage policies; documents are opened through short-lived URLs.
REVOKE ALL ON public.ctc_fighter_travel FROM anon, authenticated;
GRANT SELECT ON public.ctc_fighter_travel TO authenticated;
REVOKE ALL ON public.ctc_admin_notification_dismissals FROM anon, authenticated;
