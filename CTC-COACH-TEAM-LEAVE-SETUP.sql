-- CTC Coach/Team Portal — NEW tables only. Run once AFTER backing up production.
-- Requires existing public.fighters, public.fighter_matchups, auth.users and public.admin_users.
create extension if not exists pgcrypto;
create table if not exists public.ctc_personnel (
 id uuid primary key default gen_random_uuid(),
 auth_user_id uuid unique references auth.users(id) on delete set null,
 first_name text not null, last_name text not null,
 email text not null,
 role text not null check (role in ('coach','management','team')),
 phone text, photo_url text, title text, contact_public boolean not null default false,
 status text not null default 'active' check (status in ('active','disabled')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index if not exists ctc_personnel_email_unique on public.ctc_personnel(lower(trim(email)));
create table if not exists public.ctc_personnel_assignments (
 id uuid primary key default gen_random_uuid(),
 personnel_id uuid not null references public.ctc_personnel(id) on delete cascade,
 scope text not null check (scope in ('fighter','card','all')),
 fighter_id uuid references public.fighters(id) on delete cascade,
 event_id uuid references public.events(id) on delete cascade,
 event_date date,
 created_at timestamptz not null default now(),
 constraint ctc_assignment_scope check (
 (scope='fighter' and fighter_id is not null and event_id is null and event_date is null)
 or (scope='card' and fighter_id is null and event_id is not null and event_date is not null)
 or (scope='all' and fighter_id is null and event_id is null and event_date is null))
);
create unique index if not exists ctc_assign_fighter_unique on public.ctc_personnel_assignments(personnel_id,fighter_id) where scope='fighter';
create unique index if not exists ctc_assign_card_unique on public.ctc_personnel_assignments(personnel_id,event_id) where scope='card';
create unique index if not exists ctc_assign_all_unique on public.ctc_personnel_assignments(personnel_id) where scope='all';
create table if not exists public.ctc_personnel_travel (
 id uuid primary key default gen_random_uuid(),
 personnel_id uuid not null references public.ctc_personnel(id) on delete cascade,
 event_date date not null,
 mode text not null default 'flight' check(mode in ('flight','bus','train','car','other')),
 carrier text, service_number text, depart_from text, arrive_at text,
 departure_at text, arrival_at text, travel_url text, notes text,
 booking_reference text, updated_at timestamptz not null default now(),
 unique(personnel_id,event_date)
);
create table if not exists public.ctc_personnel_messages (
 id uuid primary key default gen_random_uuid(),
 personnel_id uuid not null references public.ctc_personnel(id) on delete cascade,
 sender_role text not null check(sender_role in ('admin','personnel')),
 body text not null check(length(trim(body)) between 1 and 5000),
 created_at timestamptz not null default now()
);
create index if not exists ctc_personnel_messages_lookup on public.ctc_personnel_messages(personnel_id,created_at);
create table if not exists public.ctc_personal_leave (
 id uuid primary key default gen_random_uuid(),
 auth_user_id uuid not null references auth.users(id) on delete cascade,
 role text not null check(role in ('fighter','coach','team','management')),
 start_date date not null, return_date date not null,
 reason text, created_at timestamptz not null default now(),
 constraint ctc_leave_dates check(return_date>=start_date)
);
create index if not exists ctc_leave_lookup on public.ctc_personal_leave(auth_user_id,start_date,return_date);
-- All new tables are private; only authenticated, role-checked Netlify API uses server credentials.
do $$ declare t text; begin
 foreach t in array array['ctc_personnel','ctc_personnel_assignments','ctc_personnel_travel','ctc_personnel_messages','ctc_personal_leave'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on table public.%I from anon,authenticated',t);
 end loop;
end $$;
