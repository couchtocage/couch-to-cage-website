-- CTC personal/travel profile fields. Run in Supabase SQL Editor before deploying this ZIP.
alter table public.fighters add column if not exists city text;
alter table public.fighters add column if not exists state text;
alter table public.fighters add column if not exists closest_airport text;
alter table public.fighters add column if not exists airport_miles numeric(6,1);
